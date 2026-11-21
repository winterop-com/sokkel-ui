import { describe, expect, it } from 'vitest'

import { createControlProxy, mayAsk, UPSTREAM_HOSTS, type VesselMessage } from './proxy.ts'
import { createValve, KEEP_OPEN_EVERY, relayVessels, STALLED_AFTER } from './relay.ts'

/** A fetch that answers each address from a table and notes what it was asked. */
function scripted(answers: Record<string, () => Response>) {
    const asked: { url: string; redirect: string | undefined }[] = []
    const fetch = ((input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        asked.push({ url, redirect: init?.redirect })
        const answer = answers[url]
        return Promise.resolve(answer === undefined ? new Response('nothing here', { status: 404 }) : answer())
    }) as typeof globalThis.fetch
    return { fetch, asked }
}

const moved = (location: string, status = 302) => new Response(null, { status, headers: { location } })
const QUAKES = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
const FLIGHTS = 'https://api.adsb.lol/v2/point/60.2/5.2/150'

describe('the addresses the proxy may ask', () => {
    it('are https addresses on the fixed hosts alone', () => {
        expect(UPSTREAM_HOSTS.has('earthquake.usgs.gov')).toBe(true)
        expect(mayAsk(new URL('https://www.gdacs.org/anything'))).toBe(true)
        expect(mayAsk(new URL('http://www.gdacs.org/anything'))).toBe(false)
        expect(mayAsk(new URL('https://www.gdacs.org:8443/anything'))).toBe(false)
        expect(mayAsk(new URL('https://ada@www.gdacs.org/anything'))).toBe(false)
        expect(mayAsk(new URL('https://169.254.169.254/latest/meta-data'))).toBe(false)
        expect(mayAsk(new URL('https://localhost/'))).toBe(false)
        expect(mayAsk(new URL('https://example.org/'))).toBe(false)
    })
})

describe('a redirect from a source', () => {
    it('is never left to the engine to follow', async () => {
        const { fetch, asked } = scripted({ [QUAKES]: () => new Response('{"features":[]}') })
        await createControlProxy({ fetch }).get('quakes')
        expect(asked).toEqual([{ url: QUAKES, redirect: 'manual' }])
    })

    it('is followed to an address on the fixed hosts', async () => {
        const next = 'https://earthquake.usgs.gov/moved.geojson'
        const { fetch, asked } = scripted({ [QUAKES]: () => moved('/moved.geojson'), [next]: () => new Response('{"features":[1]}') })
        const answer = await createControlProxy({ fetch }).get('quakes')
        expect(answer.status).toBe(200)
        expect(answer.body).toBe('{"features":[1]}')
        expect(asked.map((each) => each.url)).toEqual([QUAKES, next])
    })

    it.each([
        ['a private address', 'http://169.254.169.254/latest/meta-data/'],
        ['this machine', 'https://localhost:8080/admin'],
        ['another host', 'https://example.org/feed.json'],
        ['plain http on its own host', 'http://earthquake.usgs.gov/feed.geojson'],
    ])('is refused when it leads to %s, which is never asked', async (_name, location) => {
        const { fetch, asked } = scripted({ [QUAKES]: () => moved(location), [location]: () => new Response('secret') })
        const answer = await createControlProxy({ fetch }).get('quakes')
        expect(answer.status).toBe(502)
        expect(answer.body).toContain('redirected to an address the proxy does not ask')
        expect(answer.body).not.toContain('secret')
        expect(asked.map((each) => each.url)).toEqual([QUAKES])
    })

    it('is refused for the flights too', async () => {
        const { fetch, asked } = scripted({ [FLIGHTS]: () => moved('https://10.0.0.5/v2/point') })
        const answer = await createControlProxy({ fetch }).get('flights', { lat: '60.2', lon: '5.2', radius: '150' })
        expect(answer.status).toBe(502)
        expect(asked).toHaveLength(1)
    })

    it('is followed three times and no more', async () => {
        const hop = (count: number) => `https://earthquake.usgs.gov/hop/${String(count)}`
        const answers: Record<string, () => Response> = { [QUAKES]: () => moved(hop(1)) }
        for (let count = 1; count <= 6; count += 1) answers[hop(count)] = () => moved(hop(count + 1))
        const { fetch, asked } = scripted(answers)
        const answer = await createControlProxy({ fetch }).get('quakes')
        expect(answer.status).toBe(502)
        expect(answer.body).toContain('redirected more than 3 times')
        expect(asked).toHaveLength(4)
    })

    it('is the answer itself for the health-checked server, whose page follows it', async () => {
        const url = 'https://play.dhis2.org/demo'
        const { fetch, asked } = scripted({ [url]: () => moved('https://play.im.dhis2.org/stable') })
        const answer = await createControlProxy({ fetch }).get('server', { url })
        expect(answer.status).toBe(302)
        expect(answer.headers.location).toBe('https://play.im.dhis2.org/stable')
        expect(asked).toHaveLength(1)
    })
})

/** A sink that fills when told, and timers run by hand. */
function fakeSink() {
    const written: string[] = []
    let full = false
    let drained = () => undefined as void
    let closed = false
    let tick = () => undefined as void
    return {
        written,
        sink: {
            write: (text: string) => {
                written.push(text)
                return !full
            },
            onDrain: (call: () => void) => {
                drained = call
            },
            close: () => {
                closed = true
            },
        },
        fill: () => {
            full = true
        },
        drain: () => {
            full = false
            drained()
        },
        every: (run: () => void) => {
            tick = run
            return () => {
                tick = () => undefined
            }
        },
        tick: () => tick(),
        closed: () => closed,
    }
}

function fakeStream() {
    const listeners = new Set<(message: VesselMessage) => void>()
    return {
        proxy: {
            vessels: (listener: (message: VesselMessage) => void) => {
                listeners.add(listener)
                return () => {
                    listeners.delete(listener)
                }
            },
        },
        say: (message: VesselMessage) => {
            for (const listener of listeners) listener(message)
        },
        listening: () => listeners.size,
    }
}

describe('the relay of the vessel stream', () => {
    it('drops batches while the page takes nothing, and queues none', () => {
        const stream = fakeStream()
        const page = fakeSink()
        relayVessels(stream.proxy, page.sink, { every: page.every })
        stream.say({ lines: ['a'] })
        page.fill()
        stream.say({ lines: ['b'] })
        const held = page.written.length
        for (let batch = 0; batch < 1000; batch += 1) stream.say({ lines: ['dropped'] })
        page.tick()
        expect(page.written).toHaveLength(held)
        stream.say({ connected: false, error: 'dropped' })
        page.drain()
        expect(page.written.slice(held)).toEqual(['data: {"connected":false,"error":"dropped"}\n\n'])
        stream.say({ lines: ['c'] })
        expect(page.written.at(-1)).toBe('data: {"lines":["c"]}\n\n')
        expect(page.written.join('')).not.toContain('dropped"]')
    })

    it('closes a page that has taken nothing for a minute, and stops listening', () => {
        const stream = fakeStream()
        const page = fakeSink()
        let now = 0
        relayVessels(stream.proxy, page.sink, { every: page.every, now: () => now })
        page.fill()
        stream.say({ lines: ['a'] })
        now = KEEP_OPEN_EVERY
        page.tick()
        expect(page.closed()).toBe(false)
        now = STALLED_AFTER
        page.tick()
        expect(page.closed()).toBe(true)
        expect(stream.listening()).toBe(0)
    })

    it('stops listening when the page leaves', () => {
        const stream = fakeStream()
        const page = fakeSink()
        const relay = relayVessels(stream.proxy, page.sink, { every: page.every })
        expect(stream.listening()).toBe(1)
        relay.stop()
        expect(stream.listening()).toBe(0)
        const held = page.written.length
        page.tick()
        expect(page.written).toHaveLength(held)
    })
})

describe('the valve to a page that says when it took a message', () => {
    it('holds batches back while two are untaken, and lets word of the stream through', () => {
        const valve = createValve()
        expect(valve.pass({ lines: ['a'] })).toBe(true)
        expect(valve.pass({ lines: ['b'] })).toBe(true)
        expect(valve.pass({ lines: ['c'] })).toBe(false)
        expect(valve.pass({ connected: false })).toBe(true)
        valve.taken()
        expect(valve.pass({ lines: ['d'] })).toBe(false)
        valve.taken()
        expect(valve.pass({ lines: ['e'] })).toBe(true)
    })
})
