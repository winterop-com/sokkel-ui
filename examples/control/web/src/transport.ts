/**
 * How the page reaches the live sources. Three ways, the first that is there:
 *
 * - the Electron shell's bridge, which asks the proxy in its main process;
 * - the proxy the dev and preview servers serve under `proxy/`, beside the page;
 * - the source itself, for the few a page may read directly, when the page is served from anywhere
 *   else (a static host, the Tauri shell).
 *
 * A route that none of them reaches fails, and its source shows its simulation.
 */
import type { CheckResponse } from '@winterop-com/sokkel-ui-tracking/checks'
import { storageKey } from 'tidevann-shared/backend'

/** What the proxy answers with: the upstream's status and body, and what it says of its cache in headers. */
interface ProxyAnswer {
    status: number
    headers: Record<string, string>
    body: string
}

/** One message of the vessel stream: sentences heard, or the stream connecting and dropping. */
export type VesselMessage = { lines: string[] } | { connected: boolean; error?: string }

/** What the Electron shell's preload hands the page. */
interface Bridge {
    get: (route: string, params?: Record<string, string>, headers?: Record<string, string>) => Promise<ProxyAnswer>
    vessels: (listener: (message: VesselMessage) => void) => () => void
    openWall: () => void
}

const bridge = () => (window as unknown as { tidevannControl?: Bridge }).tidevannControl

/** The sources a page may read itself, by route: each allows any origin and asks for no server of the app's own. */
const DIRECT: Readonly<Record<string, string>> = {
    quakes: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    disasters: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP',
    satellites: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=csv',
    station: 'https://api.wheretheiss.at/v1/satellites/25544',
}

/** How long a copy of a directly read route is kept in this browser before the source is asked again, in milliseconds. */
const KEPT: Readonly<Record<string, number>> = { satellites: 2 * 3_600_000 }

/** How long any request may take. */
const TIMEOUT = 15_000

export type Reach = 'shell' | 'server' | 'direct'

let probed: Promise<Reach> | undefined

/** Which way this page reaches the sources, found once: the shell's bridge, the server's proxy, or the sources themselves. */
export function reach(): Promise<Reach> {
    probed ??= (async (): Promise<Reach> => {
        if (bridge() !== undefined) return 'shell'
        if (window.location.protocol.startsWith('http')) {
            try {
                const answer = await fetch('proxy/status', { signal: AbortSignal.timeout(3000) })
                const body: unknown = answer.ok ? await answer.json() : undefined
                if (typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true) return 'server'
            } catch {
                // No proxy beside the page: a static host.
            }
        }
        return 'direct'
    })()
    return probed
}

/** Whether a route can be read from this page at all. */
export async function reaches(route: string): Promise<boolean> {
    return (await reach()) !== 'direct' || Object.hasOwn(DIRECT, route)
}

/** A route's answer as a health check takes it, and the proxy's headers beside it. */
export interface Answer {
    response: CheckResponse
    headers: Record<string, string>
}

const failed = (at: number, error: unknown): Answer => ({
    response: { at, error: error instanceof Error ? error.message : String(error) },
    headers: {},
})

/** A copy of a directly read route kept in this browser, when it is young enough. */
function kept(route: string, now: number): string | undefined {
    if (!Object.hasOwn(KEPT, route)) return undefined
    try {
        const copy = JSON.parse(localStorage.getItem(storageKey(`kept:${route}`)) ?? 'null') as { at: number; body: string } | null
        return copy !== null && now - copy.at < KEPT[route] ? copy.body : undefined
    } catch {
        return undefined
    }
}

/**
 * Asks a route, by whichever way reaches it, and gives what came back in the shape a check judges:
 * the status, the body and how long the source took. It never throws: a route that cannot be
 * reached answers with why.
 */
export async function request(route: string, params: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<Answer> {
    const at = Date.now()
    const started = performance.now()
    try {
        const way = await reach()
        if (way === 'direct') {
            const url = Object.hasOwn(DIRECT, route) ? DIRECT[route] : undefined
            if (url === undefined) return failed(at, 'This source needs the app’s own server, which this page has none of.')
            const copy = kept(route, at)
            if (copy !== undefined) return { response: { at, status: 200, body: copy, latency: 0 }, headers: { 'x-proxy-cache': 'hit' } }
            const answer = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })
            const body = await answer.text()
            if (answer.ok && Object.hasOwn(KEPT, route)) {
                try {
                    localStorage.setItem(storageKey(`kept:${route}`), JSON.stringify({ at, body }))
                } catch {
                    // A full store keeps no copy; the source is asked again next time.
                }
            }
            return { response: { at, status: answer.status, body, latency: Math.round(performance.now() - started) }, headers: {} }
        }
        let answer: ProxyAnswer
        const shell = bridge()
        if (shell !== undefined) answer = await shell.get(route, params, headers)
        else {
            const query = new URLSearchParams(params).toString()
            const got = await fetch(`proxy/${route}${query === '' ? '' : `?${query}`}`, {
                headers,
                signal: AbortSignal.timeout(TIMEOUT + 2000),
            })
            const told = Object.fromEntries(got.headers)
            // The server tells a redirect in headers under a 200, since a browser would follow a real one itself.
            const redirect = Number(told['x-proxy-status'])
            if (Number.isFinite(redirect) && told['x-proxy-location'] !== undefined) told.location = told['x-proxy-location']
            answer = { status: Number.isFinite(redirect) && redirect > 0 ? redirect : got.status, headers: told, body: await got.text() }
        }
        // The proxy says how long the source itself took, which is what the source is judged by.
        const upstream = Number(answer.headers['x-proxy-latency'])
        const latency =
            Number.isFinite(upstream) && answer.headers['x-proxy-latency'] !== undefined
                ? upstream
                : Math.round(performance.now() - started)
        return { response: { at, status: answer.status, body: answer.body, latency }, headers: answer.headers }
    } catch (error) {
        return failed(at, error)
    }
}

/**
 * Listens to the vessel stream, through the shell or the server, and returns the call that stops
 * it. A page that reaches neither is told at once that the stream is not connected.
 */
export function listenVessels(listener: (message: VesselMessage) => void): () => void {
    let stop: (() => void) | undefined
    let stopped = false
    void reach().then((way) => {
        if (stopped) return
        const shell = bridge()
        if (way === 'shell' && shell !== undefined) stop = shell.vessels(listener)
        else if (way === 'server') {
            const events = new EventSource('proxy/vessels')
            events.onmessage = (event) => {
                try {
                    listener(JSON.parse(String(event.data)) as VesselMessage)
                } catch {
                    // A line that is not a message is skipped.
                }
            }
            events.onerror = () => listener({ connected: false, error: 'The stream from the server dropped.' })
            stop = () => events.close()
        } else listener({ connected: false, error: 'The vessel stream needs the app’s own server.' })
    })
    return () => {
        stopped = true
        stop?.()
    }
}

/** Opens the wall in a window of its own: a second window in the Electron shell, a tab in a browser. */
export function openWall(): void {
    const shell = bridge()
    if (shell !== undefined) shell.openWall()
    else window.open(`${window.location.pathname}${window.location.search}#/wall`, '_blank', 'noopener')
}
