import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { curlOf, requestTarget, type ApiRequest } from './ApiPlayground'

const get = (path: string, params: ApiRequest['params'] = []): ApiRequest => ({ method: 'GET', path, params })

/** The words a POSIX shell reads a command as, one per line, without running the command. */
function words(command: string): string[] {
    const script = `set -- ${command.replace(/^curl /, '')}; for word in "$@"; do printf '%s\\0' "$word"; done`
    return execFileSync('sh', ['-c', script], { encoding: 'utf8' }).split('\0').slice(0, -1)
}

describe('requestTarget', () => {
    it('is the path alone without parameters, or with only nameless ones', () => {
        expect(requestTarget(get('/runs'))).toBe('/runs')
        expect(requestTarget(get('/runs', [{ name: '  ', value: 'lost' }]))).toBe('/runs')
    })

    it('encodes each name and value, and trims only the name', () => {
        const target = requestTarget(
            get('/runs', [
                { name: ' job ', value: 'nightly export' },
                { name: 'state', value: 'failed&x=1' },
                { name: 'owner', value: ' ada ' },
            ]),
        )
        expect(target).toBe('/runs?job=nightly%20export&state=failed%26x%3D1&owner=%20ada%20')
    })

    it('adds to a query the path already has', () => {
        expect(requestTarget(get('/runs?limit=5', [{ name: 'state', value: 'queued' }]))).toBe('/runs?limit=5&state=queued')
    })
})

describe('curlOf', () => {
    it('joins the base and the target without a doubled slash', () => {
        expect(curlOf('https://api.example.org/', get('/runs'))).toBe("curl -X GET 'https://api.example.org/runs'")
    })

    it('sends a body with a method other than GET, and none with GET or a blank body', () => {
        const post: ApiRequest = { method: 'POST', path: '/runs', params: [], body: '{"job": "sync-inventory"}' }
        expect(curlOf('https://api.example.org', post)).toBe(
            `curl -X POST 'https://api.example.org/runs' --data '{"job": "sync-inventory"}'`,
        )
        expect(curlOf('https://api.example.org', { ...post, method: 'GET' })).not.toContain('--data')
        expect(curlOf('https://api.example.org', { ...post, body: '  \n' })).not.toContain('--data')
    })

    it('quotes every header, the body and an odd method, so a shell reads each as one word and runs nothing', () => {
        const command = curlOf(
            'https://api.example.org',
            { method: 'GET; exit 3', path: "/runs/it's", params: [{ name: 'q', value: '$(whoami)' }], body: "it's `id`" },
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
            '--data',
            "it's `id`",
        ])
    })
})
