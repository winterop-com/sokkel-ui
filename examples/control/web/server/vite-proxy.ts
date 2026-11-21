/**
 * The dev and preview servers' proxy, which the page asks when it is served by them:
 * `GET proxy/status` says it is there and names its routes, `GET proxy/<route>` answers one route
 * of `proxy.ts`, and `GET proxy/vessels` streams the AIS lines as server-sent events. It answers
 * only the page it serves: a request from another origin is refused, and no answer carries CORS
 * headers. A built page opened from anywhere else gets no answer and falls back to its simulation.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { createControlProxy, FORWARDED_HEADERS, type ControlProxy } from './proxy.ts'
import { relayVessels } from './relay.ts'

/** Where the process keeps its one proxy, so a restarted dev server keeps the caches and asks no source again early. */
const SHARED = Symbol.for('tidevann.control.proxy')

function sharedProxy(): ControlProxy {
    const holder = globalThis as { [SHARED]?: ControlProxy }
    holder[SHARED] ??= createControlProxy()
    return holder[SHARED]
}

function reply(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify(body))
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Whether the request comes from a page of another origin, by what the browser says of it. */
function fromElsewhere(request: IncomingMessage): boolean {
    const origin = first(request.headers.origin)
    if (origin !== undefined) {
        try {
            if (new URL(origin).host !== request.headers.host) return true
        } catch {
            return true
        }
    }
    const site = first(request.headers['sec-fetch-site'])
    return site !== undefined && site !== 'same-origin' && site !== 'none'
}

/** Streams the AIS messages to one response until it closes, dropping what a slow page cannot take. */
function streamVessels(proxy: ControlProxy, response: ServerResponse): void {
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    })
    const relay = relayVessels(proxy, {
        write: (text) => response.write(text),
        onDrain: (drained) => response.on('drain', drained),
        close: () => response.destroy(),
    })
    response.on('close', relay.stop)
}

/** Serves the control site's proxy under `/proxy/`, in `vite dev` and `vite preview`. */
export function controlProxyVite(): Plugin {
    const serve = (proxy: ControlProxy) => (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const [path = '', query = ''] = (request.url ?? '').split('?')
        if (!path.startsWith('/proxy/')) {
            next()
            return
        }
        if (request.method !== 'GET') {
            response.setHeader('Allow', 'GET')
            reply(response, 405, { error: 'The proxy answers GET alone.' })
            return
        }
        if (fromElsewhere(request)) {
            reply(response, 403, { error: 'The proxy answers its own page alone.' })
            return
        }
        const route = path.slice('/proxy/'.length)
        if (route === 'status') {
            reply(response, 200, { ok: true, routes: proxy.routes })
            return
        }
        if (route === 'vessels') {
            streamVessels(proxy, response)
            return
        }
        const params: Record<string, string> = {}
        for (const [name, value] of new URLSearchParams(query)) params[name] = value
        const headers: Record<string, string> = {}
        for (const name of FORWARDED_HEADERS) {
            const value = first(request.headers[name])
            if (value !== undefined) headers[name] = value
        }
        void proxy.get(route, params, headers).then((answer) => {
            // A redirect is told in headers under a 200, so the browser hands it to the page and does not follow it.
            const redirect = answer.status >= 300 && answer.status < 400
            response.statusCode = redirect ? 200 : answer.status
            for (const [name, value] of Object.entries(answer.headers))
                response.setHeader(redirect && name === 'location' ? 'x-proxy-location' : name, value)
            if (redirect) response.setHeader('x-proxy-status', String(answer.status))
            response.setHeader('Cache-Control', 'no-store')
            response.end(answer.body)
        })
    }
    const install = (server: {
        middlewares: { use(handle: ReturnType<typeof serve>): unknown }
        httpServer: { once(event: 'close', listener: () => void): unknown } | null
    }) => {
        const proxy = sharedProxy()
        server.middlewares.use(serve(proxy))
        // Closing drops the AIS connection and its listeners; the caches stay for a server started again.
        server.httpServer?.once('close', () => proxy.close())
    }
    return {
        name: 'tidevann-control-proxy',
        configureServer: (server) => {
            install(server)
        },
        configurePreviewServer: (server) => {
            install(server)
        },
    }
}
