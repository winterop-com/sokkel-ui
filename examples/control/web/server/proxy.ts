/**
 * The control site's proxy to the public sources it reads, shared by the dev and preview servers
 * and the Electron shell's main process. It is never an open proxy: it serves a fixed table of
 * named routes, each with a fixed upstream address (or one built from checked numbers, or one on an
 * allow-listed host), a cache of its own and a limit of its own, so no page can ask a source more
 * often than the source allows. It needs nothing but Node.
 */

import { connect as connectTcp } from 'node:net'

/** How the proxy names itself to every source. */
export const USER_AGENT = 'tidevann-control-example/0.1 (sokkel-ui example; contact: admin@example.org)'

/** The only hosts the `server` route asks, over https alone. */
export const SERVER_HOSTS: readonly string[] = ['play.dhis2.org', 'play.im.dhis2.org']

/** The request headers the `server` route passes on from the caller; every other header is dropped. */
export const FORWARDED_HEADERS: readonly string[] = ['accept', 'x-requested-with', 'authorization']

/** Where the Norwegian Coastal Administration's open AIS stream is read: raw NMEA lines over TCP. */
export const AIS_HOST = '153.44.253.27'
export const AIS_PORT = 5631

export interface ProxyAnswer {
    status: number
    headers: Record<string, string>
    body: string
}

/** What the AIS stream tells a listener: a batch of lines as received, or that the connection opened or closed. */
export type VesselMessage = { lines: string[] } | { connected: boolean; error?: string }

/** What a line stream's connection tells its opener. */
export interface LineStreamHandlers {
    open(): void
    data(chunk: string): void
    /** Called once, when the connection ends, with why when it failed. */
    close(error?: string): void
}

/** Opens the AIS stream's connection; the default is a TCP connection to the fixed address. */
export type LineStreamConnect = (handlers: LineStreamHandlers) => { destroy(): void }

export interface ControlProxyOptions {
    /** The clock the caches and limits read, in milliseconds. */
    now?: () => number
    fetch?: typeof fetch
    connect?: LineStreamConnect
}

export interface ControlProxy {
    /** The route names it serves. */
    routes: readonly string[]
    get(route: string, params?: Record<string, string>, headers?: Record<string, string>): Promise<ProxyAnswer>
    /** Subscribes to the AIS line stream; the TCP connection is opened with the first listener and closed after the last leaves. */
    vessels(listener: (message: VesselMessage) => void): () => void
    /** Drops every AIS listener and closes the connection at once. The caches are kept. */
    close(): void
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/** How long any source may take to answer. */
const TIMEOUT = 15 * SECOND
/** How many redirects a feed's or the flights' request follows before it gives up. */
const MOST_HOPS = 3
/** The largest body an answer may have, in bytes. */
const MOST_BYTES = 8 * 1024 * 1024

/** The flights route: one upstream request a minute, 480 in any 24 hours, and a kept answer served no older than ten minutes. */
const FLIGHTS_EVERY = MINUTE
const FLIGHTS_A_DAY = 480
const FLIGHTS_KEEP = 10 * MINUTE
const FLIGHTS_MOST_KEPT = 32

/** The server route: an answer kept 20 seconds, two upstream requests a second. */
const SERVER_TTL = 20 * SECOND
const SERVER_A_SECOND = 2
const SERVER_KEEP = MINUTE
const SERVER_MOST_KEPT = 200

/** The AIS stream: batches once a second of at most 2000 lines, a retry after 5 seconds doubling to 60, and 10 seconds open after the last listener. */
const AIS_BATCH_EVERY = SECOND
const AIS_MOST_LINES = 2000
const AIS_RETRY_FIRST = 5 * SECOND
const AIS_RETRY_MOST = MINUTE
const AIS_LINGER = 10 * SECOND
/** A connection that says nothing this long is taken as dead. */
const AIS_SILENCE = MINUTE
/** The longest unfinished line kept while waiting for its end. */
const AIS_MOST_PARTIAL = 64 * 1024

/** A feed at a fixed address, asked no more often than its `ttl`. */
interface Feed {
    /** The source's name, for messages. */
    source: string
    url: string
    /** How long an answer is served before the source is asked again. */
    ttl: number
    /** How long the source is left alone after a failed request or any answer but 200. */
    retry: number
    /** Whether the answer's `Expires` extends `ttl`, and `Last-Modified` is sent back as `If-Modified-Since`. */
    conditional?: boolean
}

const FEEDS: Record<string, Feed> = {
    quakes: {
        source: 'The USGS',
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
        ttl: MINUTE,
        retry: MINUTE,
    },
    disasters: {
        source: 'GDACS',
        url: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP',
        ttl: 5 * MINUTE,
        retry: 5 * MINUTE,
    },
    warnings: {
        source: 'MET Norway',
        url: 'https://api.met.no/weatherapi/metalerts/2.0/current.json?lang=en',
        ttl: 2 * MINUTE,
        retry: 2 * MINUTE,
        conditional: true,
    },
    satellites: {
        source: 'CelesTrak',
        url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=csv',
        ttl: 2 * HOUR,
        retry: 15 * MINUTE,
    },
    station: {
        source: 'wheretheiss.at',
        url: 'https://api.wheretheiss.at/v1/satellites/25544',
        ttl: 5 * SECOND,
        retry: 5 * SECOND,
    },
}

/** The longest an `Expires` may put off the next request to a conditional feed. */
const MOST_EXPIRES = HOUR

const FLIGHTS_URL = 'https://api.adsb.lol/v2/point'

const ROUTES: readonly string[] = [...Object.keys(FEEDS), 'flights', 'server']

/** An answer kept from a source. */
interface Kept {
    status: number
    type: string
    body: string
    /** When the source answered, on the proxy's clock. */
    at: number
    /** How long the request took, in milliseconds. */
    latency: number
    location?: string
}

/** What a feed holds between requests. */
interface FeedState {
    good?: Kept
    /** Until when `good` is served without asking. */
    freshUntil: number
    /** Until when the source is not asked, whatever is kept. */
    holdUntil: number
    lastModified?: string
}

/** What one upstream request gave. */
interface Got {
    status: number
    statusText: string
    headers: Headers
    body: string
    latency: number
}

/** A request the source did not answer, with what to tell the page. */
class Unreached extends Error {}

/** Every host the proxy may ask, a redirect's target included: the feeds', the flight service's and the health-checked server's. */
export const UPSTREAM_HOSTS: ReadonlySet<string> = new Set([
    ...Object.values(FEEDS).map((feed) => new URL(feed.url).hostname),
    new URL(FLIGHTS_URL).hostname,
    ...SERVER_HOSTS,
])

/** Whether an address is one the proxy may ask: https, on its default port, with no sign-in, on a host of the fixed list. */
export function mayAsk(url: URL): boolean {
    return url.protocol === 'https:' && url.port === '' && url.username === '' && url.password === '' && UPSTREAM_HOSTS.has(url.hostname)
}

function seconds(milliseconds: number): string {
    const whole = Math.max(1, Math.ceil(milliseconds / SECOND))
    return whole === 1 ? '1 second' : `${String(whole)} seconds`
}

function plain(status: number, error: string, extra?: Record<string, string>): ProxyAnswer {
    return {
        status,
        headers: { 'content-type': 'application/json', 'x-proxy-cache': 'miss', 'x-proxy-age': '0', 'x-proxy-latency': '0', ...extra },
        body: JSON.stringify({ error }),
    }
}

/** A decimal number written plainly, or undefined: no exponents, no spaces, nothing else. */
function decimal(text: string | undefined): number | undefined {
    if (text === undefined || !/^-?\d{1,3}(\.\d{1,10})?$/.test(text)) return undefined
    return Number(text)
}

/** The AIS stream over TCP, at the one fixed address. */
const tcpLines: LineStreamConnect = (handlers) => {
    const socket = connectTcp({ host: AIS_HOST, port: AIS_PORT })
    let failure: string | undefined
    socket.setEncoding('latin1')
    socket.setTimeout(AIS_SILENCE)
    socket.on('connect', () => handlers.open())
    socket.on('data', (chunk) => handlers.data(String(chunk)))
    socket.on('timeout', () => {
        failure = 'The AIS stream went silent.'
        socket.destroy()
    })
    socket.on('error', (error) => {
        failure = `The AIS stream could not be read: ${error.message}`
    })
    socket.on('close', () => handlers.close(failure))
    return { destroy: () => socket.destroy() }
}

export function createControlProxy(options: ControlProxyOptions = {}): ControlProxy {
    const now = options.now ?? (() => Date.now())
    const ask = options.fetch ?? fetch
    const connect = options.connect ?? tcpLines

    /**
     * Reads `url`, with a time limit and a size limit. No redirect is followed by the engine: with
     * `follow`, each one is followed here, at most `MOST_HOPS` of them inside the one time limit, and
     * only to an address the proxy may ask; with `manual`, a redirect is the answer.
     */
    async function read(source: string, url: string, headers: Record<string, string>, redirect: 'follow' | 'manual'): Promise<Got> {
        const started = now()
        try {
            const signal = AbortSignal.timeout(TIMEOUT)
            let at = url
            let response: Response
            for (let hop = 0; ; hop += 1) {
                response = await ask(at, { method: 'GET', redirect: 'manual', headers: { 'user-agent': USER_AGENT, ...headers }, signal })
                const location = response.headers.get('location')
                const moved = response.status >= 300 && response.status < 400 && response.status !== 304 && location !== null
                if (redirect === 'manual' || !moved) break
                void response.body?.cancel().catch(() => undefined)
                if (hop >= MOST_HOPS) throw new Unreached(`${source} redirected more than ${String(MOST_HOPS)} times.`)
                let next: URL | undefined
                try {
                    next = new URL(location, at)
                } catch {
                    next = undefined
                }
                if (next === undefined || !mayAsk(next)) throw new Unreached(`${source} redirected to an address the proxy does not ask.`)
                at = next.href
            }
            if (Number(response.headers.get('content-length')) > MOST_BYTES) {
                void response.body?.cancel().catch(() => undefined)
                throw new Unreached(`${source} answered with more than 8 MB.`)
            }
            const chunks: Uint8Array[] = []
            let size = 0
            const reader = response.body?.getReader()
            while (reader !== undefined) {
                const { done, value } = await reader.read()
                if (done) break
                size += value.byteLength
                if (size > MOST_BYTES) {
                    void reader.cancel().catch(() => undefined)
                    throw new Unreached(`${source} answered with more than 8 MB.`)
                }
                chunks.push(value)
            }
            const bytes = new Uint8Array(size)
            let offset = 0
            for (const chunk of chunks) {
                bytes.set(chunk, offset)
                offset += chunk.byteLength
            }
            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: new TextDecoder().decode(bytes),
                latency: now() - started,
            }
        } catch (error) {
            if (error instanceof Unreached) throw error
            const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
            throw new Unreached(timedOut ? `${source} did not answer within 15 seconds.` : `${source} could not be reached.`)
        }
    }

    function answer(kept: Kept, cache: 'hit' | 'miss', extra?: Record<string, string>): ProxyAnswer {
        const headers: Record<string, string> = {
            'content-type': kept.type,
            'x-proxy-cache': cache,
            'x-proxy-age': String(Math.max(0, Math.floor((now() - kept.at) / SECOND))),
            'x-proxy-latency': String(Math.round(kept.latency)),
            ...extra,
        }
        if (kept.location !== undefined) headers.location = kept.location
        return { status: kept.status, headers, body: kept.body }
    }

    const keep = (got: Got): Kept => ({
        status: got.status,
        type: got.headers.get('content-type') ?? 'application/octet-stream',
        body: got.body,
        at: now(),
        latency: got.latency,
    })

    /** What a source's answer other than 200 is told as. */
    const refused = (source: string, got: Got) => `${source} answered ${`${String(got.status)} ${got.statusText}`.trim()}.`

    /** The requests on their way, so two callers asking at once share one. */
    const flying = new Map<string, Promise<ProxyAnswer>>()
    function once(key: string, make: () => Promise<ProxyAnswer>): Promise<ProxyAnswer> {
        const running = flying.get(key)
        if (running !== undefined) return running
        const started = make().finally(() => flying.delete(key))
        flying.set(key, started)
        return started
    }

    const feeds = new Map<string, FeedState>()

    async function feed(name: string, spec: Feed): Promise<ProxyAnswer> {
        let state = feeds.get(name)
        if (state === undefined) {
            state = { freshUntil: 0, holdUntil: 0 }
            feeds.set(name, state)
        }
        const held = state
        const at = now()
        if (held.good !== undefined && at < held.freshUntil) return answer(held.good, 'hit')
        if (at < held.holdUntil) {
            const wait = seconds(held.holdUntil - at)
            if (held.good !== undefined)
                return answer(held.good, 'hit', { 'x-proxy-stale': `${spec.source} is not asked again for ${wait}.` })
            return plain(429, `${spec.source} is not asked again for ${wait}. Try again then.`, {
                'retry-after': String(Math.ceil((held.holdUntil - at) / SECOND)),
            })
        }
        // The source is left alone for the feed's time from here, whatever comes of the request.
        held.holdUntil = at + spec.ttl
        const fail = (status: number, error: string, latency: number): ProxyAnswer => {
            held.holdUntil = at + spec.retry
            if (held.good !== undefined) return answer(held.good, 'hit', { 'x-proxy-stale': error })
            return plain(status, error, { 'x-proxy-latency': String(Math.round(latency)) })
        }
        const headers: Record<string, string> = {}
        if (spec.conditional === true && held.good !== undefined && held.lastModified !== undefined) {
            headers['if-modified-since'] = held.lastModified
        }
        let got: Got
        try {
            got = await read(spec.source, spec.url, headers, 'follow')
        } catch (error) {
            return fail(502, error instanceof Unreached ? error.message : `${spec.source} could not be reached.`, now() - at)
        }
        const answered = now()
        let freshUntil = answered + spec.ttl
        if (spec.conditional === true) {
            const expires = Date.parse(got.headers.get('expires') ?? '')
            if (Number.isFinite(expires)) freshUntil = Math.min(Math.max(freshUntil, expires), answered + MOST_EXPIRES)
        }
        if (got.status === 304 && held.good !== undefined) {
            held.good = { ...held.good, at: answered, latency: got.latency }
        } else if (got.status === 200) {
            held.good = keep(got)
            held.lastModified = got.headers.get('last-modified') ?? undefined
        } else {
            return fail(got.status, refused(spec.source, got), got.latency)
        }
        held.freshUntil = freshUntil
        held.holdUntil = Math.max(held.holdUntil, freshUntil)
        return answer(held.good, 'miss')
    }

    /** The flights route's kept answers by rounded point and radius, and when the source was asked. */
    const flightsKept = new Map<string, Kept>()
    let flightsAsked: number[] = []

    async function flights(params: Record<string, string>): Promise<ProxyAnswer> {
        const lat = decimal(params.lat)
        const lon = decimal(params.lon)
        const radius = decimal(params.radius)
        if (lat === undefined || lat < -90 || lat > 90) return plain(400, 'lat is a number from -90 to 90.')
        if (lon === undefined || lon < -180 || lon > 180) return plain(400, 'lon is a number from -180 to 180.')
        if (radius === undefined || Math.round(radius) < 1 || Math.round(radius) > 250) {
            return plain(400, 'radius is a number of nautical miles from 1 to 250.')
        }
        const point = `${String(Math.round(lat * 100) / 100)}/${String(Math.round(lon * 100) / 100)}/${String(Math.round(radius))}`
        return once(`flights ${point}`, async () => {
            const at = now()
            flightsAsked = flightsAsked.filter((asked) => at - asked < 24 * HOUR)
            const remaining = () => ({ 'x-proxy-remaining': String(Math.max(0, FLIGHTS_A_DAY - flightsAsked.length)) })
            const kept = flightsKept.get(point)
            if (kept !== undefined && at - kept.at < FLIGHTS_EVERY) return answer(kept, 'hit', remaining())
            const usable = kept !== undefined && at - kept.at < FLIGHTS_KEEP ? kept : undefined
            const last = flightsAsked.at(-1)
            let wait = last === undefined ? 0 : last + FLIGHTS_EVERY - at
            let why = 'adsb.lol is asked once a minute.'
            if (flightsAsked.length >= FLIGHTS_A_DAY) {
                wait = Math.max(wait, (flightsAsked[0] ?? at) + 24 * HOUR - at)
                why = `adsb.lol has been asked ${String(FLIGHTS_A_DAY)} times in the last 24 hours, the most this proxy asks.`
            }
            if (wait > 0) {
                if (usable !== undefined) return answer(usable, 'hit', { ...remaining(), 'x-proxy-stale': why })
                return plain(429, `${why} Try again in ${seconds(wait)}.`, {
                    ...remaining(),
                    'retry-after': String(Math.ceil(wait / SECOND)),
                })
            }
            flightsAsked.push(at)
            const fail = (status: number, error: string, latency: number): ProxyAnswer => {
                if (usable !== undefined) return answer(usable, 'hit', { ...remaining(), 'x-proxy-stale': error })
                return plain(status, error, { ...remaining(), 'x-proxy-latency': String(Math.round(latency)) })
            }
            let got: Got
            try {
                got = await read('adsb.lol', `${FLIGHTS_URL}/${point}`, { accept: 'application/json' }, 'follow')
            } catch (error) {
                return fail(502, error instanceof Unreached ? error.message : 'adsb.lol could not be reached.', now() - at)
            }
            if (got.status !== 200) return fail(got.status, refused('adsb.lol', got), got.latency)
            const fresh = keep(got)
            for (const [key, old] of flightsKept) if (fresh.at - old.at >= FLIGHTS_KEEP) flightsKept.delete(key)
            flightsKept.delete(point)
            flightsKept.set(point, fresh)
            for (const key of flightsKept.keys()) {
                if (flightsKept.size <= FLIGHTS_MOST_KEPT) break
                flightsKept.delete(key)
            }
            return answer(fresh, 'miss', remaining())
        })
    }

    /** The server route's kept answers by address and forwarded headers, and when it asked upstream. */
    const serverKept = new Map<string, Kept>()
    let serverAsked: number[] = []

    async function server(params: Record<string, string>, headers: Record<string, string>): Promise<ProxyAnswer> {
        let url: URL
        try {
            url = new URL(params.url ?? '')
        } catch {
            return plain(400, 'url is an absolute https address on an allowed host.')
        }
        if (
            url.protocol !== 'https:' ||
            !SERVER_HOSTS.includes(url.hostname) ||
            url.port !== '' ||
            url.username !== '' ||
            url.password !== ''
        ) {
            return plain(400, `url is an https address on one of: ${SERVER_HOSTS.join(', ')}.`)
        }
        url.hash = ''
        const forwarded: Record<string, string> = {}
        for (const [name, value] of Object.entries(headers)) {
            const lower = name.toLowerCase()
            if (FORWARDED_HEADERS.includes(lower) && typeof value === 'string' && value !== '') forwarded[lower] = value
        }
        // An answer to a request with credentials is never kept, nor answered from what is kept.
        const shared = forwarded.authorization === undefined
        const key = `${url.href}\n${forwarded.accept ?? ''}\n${forwarded['x-requested-with'] ?? ''}`
        const ask = async (): Promise<ProxyAnswer> => {
            const at = now()
            const kept = shared ? serverKept.get(key) : undefined
            if (kept !== undefined && at - kept.at < SERVER_TTL) return answer(kept, 'hit')
            serverAsked = serverAsked.filter((asked) => at - asked < SECOND)
            if (serverAsked.length >= SERVER_A_SECOND) {
                const why = `The server is asked at most ${String(SERVER_A_SECOND)} times a second.`
                if (kept !== undefined && at - kept.at < SERVER_KEEP) return answer(kept, 'hit', { 'x-proxy-stale': why })
                return plain(429, `${why} Try again in 1 second.`, { 'retry-after': '1' })
            }
            serverAsked.push(at)
            let got: Got
            try {
                got = await read(`The server at ${url.hostname}`, url.href, forwarded, 'manual')
            } catch (error) {
                const message = error instanceof Unreached ? error.message : `The server at ${url.hostname} could not be reached.`
                return plain(502, message, { 'x-proxy-latency': String(Math.round(now() - at)) })
            }
            const fresh = keep(got)
            const location = got.headers.get('location')
            if (got.status >= 300 && got.status < 400 && location !== null) {
                try {
                    fresh.location = new URL(location, url).href
                } catch {
                    // A location that is no address is left out.
                }
            }
            if (shared) {
                for (const [other, old] of serverKept) if (fresh.at - old.at >= SERVER_KEEP) serverKept.delete(other)
                serverKept.delete(key)
                serverKept.set(key, fresh)
                for (const other of serverKept.keys()) {
                    if (serverKept.size <= SERVER_MOST_KEPT) break
                    serverKept.delete(other)
                }
            }
            return answer(fresh, 'miss')
        }
        return shared ? once(`server ${key}`, ask) : ask()
    }

    async function get(route: string, params: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<ProxyAnswer> {
        try {
            const spec = Object.hasOwn(FEEDS, route) ? FEEDS[route] : undefined
            if (spec !== undefined) return await once(route, () => feed(route, spec))
            if (route === 'flights') return await flights(params)
            if (route === 'server') return await server(params, headers)
            return plain(404, `There is no route named ${JSON.stringify(String(route))}.`)
        } catch {
            return plain(502, 'The proxy could not answer.')
        }
    }

    /** The AIS stream: its listeners, its connection, and the lines waiting for the next batch. */
    const listeners = new Set<(message: VesselMessage) => void>()
    let socket: { destroy(): void } | undefined
    let connected = false
    let partial = ''
    let waiting: string[] = []
    let retryIn = AIS_RETRY_FIRST
    let batchTimer: ReturnType<typeof setInterval> | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let lingerTimer: ReturnType<typeof setTimeout> | undefined

    function tell(message: VesselMessage): void {
        for (const listener of listeners) {
            try {
                listener(message)
            } catch {
                // One listener's failure never reaches the others.
            }
        }
    }

    function flush(): void {
        if (waiting.length === 0) return
        const lines = waiting
        waiting = []
        tell({ lines })
    }

    function open(): void {
        if (socket !== undefined) return
        partial = ''
        let mine: { destroy(): void } | undefined
        let ended = false
        const current = () => !ended && (mine === undefined || socket === mine)
        mine = connect({
            open: () => {
                if (!current()) return
                connected = true
                tell({ connected: true })
            },
            data: (chunk) => {
                if (!current()) return
                // Lines arriving show the connection holds, so the next retry starts short again.
                retryIn = AIS_RETRY_FIRST
                const pieces = (partial + chunk).split('\n')
                partial = (pieces.pop() ?? '').slice(-AIS_MOST_PARTIAL)
                for (const piece of pieces) {
                    const line = piece.trim()
                    // What a batch cannot hold is dropped.
                    if (line !== '' && waiting.length < AIS_MOST_LINES) waiting.push(line)
                }
            },
            close: (error) => {
                if (!current()) return
                ended = true
                socket = undefined
                connected = false
                flush()
                if (listeners.size === 0) return
                tell({ connected: false, error: error ?? 'The AIS stream closed.' })
                const wait = retryIn
                retryIn = Math.min(AIS_RETRY_MOST, retryIn * 2)
                retryTimer = setTimeout(() => {
                    retryTimer = undefined
                    if (listeners.size > 0) open()
                }, wait)
                retryTimer.unref?.()
            },
        })
        if (ended) return
        socket = mine
        if (batchTimer === undefined) {
            batchTimer = setInterval(flush, AIS_BATCH_EVERY)
            batchTimer.unref?.()
        }
    }

    function shut(): void {
        clearTimeout(lingerTimer)
        clearTimeout(retryTimer)
        clearInterval(batchTimer)
        lingerTimer = undefined
        retryTimer = undefined
        batchTimer = undefined
        const open = socket
        socket = undefined
        connected = false
        waiting = []
        partial = ''
        retryIn = AIS_RETRY_FIRST
        open?.destroy()
    }

    function vessels(listener: (message: VesselMessage) => void): () => void {
        // Each subscription is its own entry, so one function may listen twice.
        const entry = (message: VesselMessage) => listener(message)
        listeners.add(entry)
        clearTimeout(lingerTimer)
        lingerTimer = undefined
        if (connected) {
            try {
                listener({ connected: true })
            } catch {
                // A listener that fails at once is still subscribed.
            }
        } else if (socket === undefined && retryTimer === undefined) open()
        return () => {
            if (!listeners.delete(entry) || listeners.size > 0) return
            lingerTimer = setTimeout(() => {
                lingerTimer = undefined
                if (listeners.size === 0) shut()
            }, AIS_LINGER)
            lingerTimer.unref?.()
        }
    }

    function close(): void {
        listeners.clear()
        shut()
    }

    return { routes: ROUTES, get, vessels, close }
}
