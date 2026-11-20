/**
 * The dev and preview servers' GeoLite2 lookup, which the page asks when it is served by them:
 * `GET geolite/status` says whether the file is there, and `POST geolite/locate` with a JSON list of
 * addresses answers where each is. A built page opened from anywhere else gets no answer and uses
 * its built-in lookup.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { openGeolite } from './geolite.ts'

/** The most a locate request's body may hold, in bytes. */
const MOST_BODY = 256 * 1024

function reply(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify(body))
}

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let size = 0
        const chunks: Buffer[] = []
        request.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > MOST_BODY) {
                reject(new Error('too large'))
                request.destroy()
                return
            }
            chunks.push(chunk)
        })
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        request.on('error', reject)
    })
}

/** Serves the lookup over the GeoLite2 City file at `path`, in `vite dev` and `vite preview`. */
export function geoliteVite(path: string): Plugin {
    const geolite = openGeolite(path)
    const handle = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const url = (request.url ?? '').split('?')[0]
        if (url === '/geolite/status' && request.method === 'GET') {
            reply(response, 200, geolite.status())
            return
        }
        if (url === '/geolite/locate' && request.method === 'POST') {
            readBody(request).then(
                (text) => {
                    let addresses: unknown
                    try {
                        addresses = JSON.parse(text)
                    } catch {
                        reply(response, 400, { error: 'The body is not JSON.' })
                        return
                    }
                    if (!Array.isArray(addresses)) reply(response, 400, { error: 'The body is not a list of addresses.' })
                    else reply(response, 200, geolite.locate(addresses))
                },
                () => reply(response, 413, { error: 'The body is too large.' }),
            )
            return
        }
        next()
    }
    return {
        name: 'tidevann-geolite',
        configureServer: (server) => {
            server.middlewares.use(handle)
        },
        configurePreviewServer: (server) => {
            server.middlewares.use(handle)
        },
    }
}
