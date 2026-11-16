import { execFileSync } from 'node:child_process'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ApiPlayground, curlOf, requestAddress, requestTarget, type ApiRequest } from './ApiPlayground'

const request = (patch: Partial<ApiRequest>): ApiRequest => ({ method: 'POST', path: '/jobs', params: [], ...patch })

/** The words a POSIX shell reads a curl command as, without running it. */
function words(command: string): string[] {
    const script = `set -- ${command.replace(/^curl /, '')}; for word in "$@"; do printf '%s\\0' "$word"; done`
    return execFileSync('sh', ['-c', script], { encoding: 'utf8' }).split('\0').slice(0, -1)
}

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

    it('encodes each parameter, trims only its name, leaves out a nameless one and adds to a query the path has', () => {
        const params = [
            { name: ' job ', value: 'nightly export' },
            { name: 'state', value: 'failed&x=1' },
            { name: 'owner', value: ' ada ' },
            { name: '  ', value: 'lost' },
        ]
        expect(requestTarget(request({ path: '/runs', params }))).toBe('/runs?job=nightly%20export&state=failed%26x%3D1&owner=%20ada%20')
        expect(requestTarget(request({ path: '/runs?limit=5', params: [{ name: 'state', value: 'queued' }] }))).toBe(
            '/runs?limit=5&state=queued',
        )
    })

    it('sends a body only with a method other than GET, and none that is blank', () => {
        expect(curlOf('https://api.example.org', request({ method: 'GET', body: '{}' }))).not.toContain('--data')
        expect(curlOf('https://api.example.org', request({ body: '  \n' }))).not.toContain('--data')
    })

    it('quotes every header, the body and an odd method, so a shell reads each as one word and runs nothing', () => {
        const command = curlOf(
            'https://api.example.org',
            request({ method: 'GET; exit 3', path: "/runs/it's", params: [{ name: 'q', value: '$(whoami)' }], body: "it's `id`" }),
            { Authorization: "Bearer a'b", 'X-Project': 'harbor $HOME' },
        )
        expect(words(command)).toEqual([
            '-X',
            'GET; exit 3',
            "https://api.example.org/runs/it's?q=%24(whoami)",
            '-H',
            "Authorization: Bearer a'b",
            '-H',
            'X-Project: harbor $HOME',
            '--data-raw',
            "it's `id`",
        ])
    })
})
