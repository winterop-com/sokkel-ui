import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ApiPlayground, curlOf, requestAddress, requestTarget, type ApiRequest } from './ApiPlayground'

const request = (patch: Partial<ApiRequest>): ApiRequest => ({ method: 'POST', path: '/jobs', params: [], ...patch })

describe('the request an ApiPlayground builds', () => {
    it('copies the body as curl sends it, so a body starting with @ names no file', () => {
        const curl = curlOf('https://api.example.org', request({ body: '@/etc/hosts' }))
        expect(curl).toBe("curl -X POST 'https://api.example.org/jobs' --data-raw '@/etc/hosts'")
    })

    it('keeps a path under the base, whatever it starts with', () => {
        expect(requestTarget(request({ path: '@evil.example.org/x' }))).toBe('/@evil.example.org/x')
        expect(requestAddress('https://api.example.org/', request({ path: '@evil.example.org/x' }))).toBe(
            'https://api.example.org/@evil.example.org/x',
        )
        expect(new URL(requestAddress('https://api.example.org', request({ path: '@evil.example.org/x' }))).host).toBe('api.example.org')
        expect(requestTarget(request({ path: 'jobs', params: [{ name: 'state', value: 'failed' }] }))).toBe('/jobs?state=failed')
    })

    it('gives each playground on a page fields of its own', () => {
        const send = () => Promise.resolve({ status: 200, statusText: 'OK', ms: 1, body: '' })
        const html = renderToStaticMarkup(
            <>
                <ApiPlayground send={send} base="https://api.example.org" />
                <ApiPlayground send={send} base="https://api.example.org" />
            </>,
        )
        const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
        expect(ids.length).toBeGreaterThan(2)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
