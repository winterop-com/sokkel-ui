import { describe, expect, it } from 'vitest'

import {
    CHECK_PART,
    CHECK_STATUSES,
    CHECK_WORDS,
    checkUrl,
    combineResults,
    createStatusMonitor,
    DEFAULT_LATENCY,
    evaluateCheck,
    HTTP_KIND,
    httpCheck,
    readPath,
    statusPasses,
    worstStatus,
    type Check,
    type CheckResponse,
    type Observation,
} from './checks'

/** 20 November 2026, 18:40:00 UTC. */
const AT = 1_795_200_000_000

// What a health endpoint of Tidevann's api answers with.
const HEALTH = {
    status: 'ok',
    version: '4.12.0',
    uptime: 86_412,
    services: [
        { name: 'worker', state: 'running', queue: { depth: 3 } },
        { name: 'scheduler', state: 'running', queue: { depth: 0 } },
    ],
    database: { connected: true, replica: null },
}

const CHECK: Check = {
    id: 'health',
    label: 'Health',
    path: '/health',
    expect: {
        status: 200,
        body: '"status":"ok"',
        json: [{ path: 'database.connected', equals: true }, { path: 'services[0].state', matches: '^run' }, { path: 'version' }],
    },
    latency: { degraded: 500, down: 5000 },
    capture: { version: 'version', depth: 'services[0].queue.depth', replica: 'database.replica', services: 'services', build: 'build' },
}

const answer = (response: Partial<CheckResponse> = {}): CheckResponse => ({
    at: AT,
    status: 200,
    body: JSON.stringify(HEALTH),
    latency: 120,
    ...response,
})

describe('the words', () => {
    it('name every status and every reason', () => {
        expect(Object.keys(CHECK_WORDS.statuses).sort()).toEqual([...CHECK_STATUSES].sort())
        expect(Object.keys(CHECK_WORDS.reasons).sort()).toEqual(['body', 'json', 'latency', 'status', 'unreachable'])
        expect(CHECK_PART).toEqual({ id: 'check', words: CHECK_WORDS })
    })
})

describe('reading an answer', () => {
    it('reads a value by its path', () => {
        expect(readPath(HEALTH, 'version')).toBe('4.12.0')
        expect(readPath(HEALTH, 'services[1].name')).toBe('scheduler')
        expect(readPath(HEALTH, 'services.1.queue.depth')).toBe(0)
        expect(readPath(HEALTH, '$.database.replica')).toBeNull()
        expect(readPath(HEALTH, '')).toBe(HEALTH)
        expect(readPath(HEALTH, 'services[2].name')).toBeUndefined()
        expect(readPath(HEALTH, 'services.first')).toBeUndefined()
        expect(readPath(HEALTH, 'version.major')).toBeUndefined()
        expect(readPath(HEALTH, 'toString')).toBeUndefined()
        expect(readPath(undefined, 'version')).toBeUndefined()
    })

    it('passes a status that is the one named, in a range, or among several', () => {
        expect([200, 204, 299, 301].map((status) => statusPasses(status))).toEqual([true, true, true, false])
        expect(statusPasses(204, 200)).toBe(false)
        expect(statusPasses(302, { from: 200, to: 399 })).toBe(true)
        expect([200, 204, 401, 404].map((status) => statusPasses(status, [200, { from: 400, to: 403 }]))).toEqual([
            true,
            false,
            true,
            false,
        ])
    })

    it('joins a path to a base URL, whatever slashes either carries', () => {
        expect(checkUrl('https://api.example.org', CHECK)).toBe('https://api.example.org/health')
        expect(checkUrl('https://api.example.org/', '/health')).toBe('https://api.example.org/health')
        expect(checkUrl('https://example.org/harbor/', 'api/me?fields=id')).toBe('https://example.org/harbor/api/me?fields=id')
        expect(checkUrl('https://example.org/harbor/', '')).toBe('https://example.org/harbor')
        expect(checkUrl('https://example.org/harbor', '?ping=1')).toBe('https://example.org/harbor?ping=1')
        expect(checkUrl('https://example.org', 'https://status.example.org/health')).toBe('https://status.example.org/health')
    })
})

describe('evaluating a check', () => {
    it('finds a server up, with the values it was told to read', () => {
        expect(evaluateCheck(CHECK, answer())).toEqual({
            check: 'health',
            status: 'up',
            at: AT,
            latency: 120,
            httpStatus: 200,
            values: { version: '4.12.0', depth: 3, replica: null },
        })
    })

    it('takes the JSON the app has read already', () => {
        const read = evaluateCheck({ ...CHECK, expect: { json: CHECK.expect?.json } }, { at: AT, status: 200, latency: 120, json: HEALTH })
        expect(read).toMatchObject({ status: 'up', values: { version: '4.12.0' } })
    })

    it('finds it down when no answer came', () => {
        expect(evaluateCheck(CHECK, { at: AT, error: 'connection refused', latency: 4 })).toEqual({
            check: 'health',
            status: 'down',
            at: AT,
            latency: 4,
            failure: { reason: 'unreachable', actual: 'connection refused' },
        })
        expect(evaluateCheck(CHECK, { at: AT }).failure).toEqual({ reason: 'unreachable' })
    })

    it('finds it down on a status it does not pass on', () => {
        expect(evaluateCheck(CHECK, answer({ status: 503, body: 'Service Unavailable' }))).toMatchObject({
            status: 'down',
            httpStatus: 503,
            failure: { reason: 'status', expected: '200', actual: '503' },
        })
        const ranged = evaluateCheck({ ...CHECK, expect: { status: [{ from: 200, to: 299 }, 304] } }, answer({ status: 404 }))
        expect(ranged.failure).toEqual({ reason: 'status', expected: '200-299, 304', actual: '404' })
        expect(evaluateCheck({ id: 'a', label: 'A', path: '' }, answer({ status: 302 })).failure?.expected).toBe('200-299')
    })

    it('finds it down on a body without its text', () => {
        const down = evaluateCheck(CHECK, answer({ body: JSON.stringify({ ...HEALTH, status: 'starting' }) }))
        expect(down).toMatchObject({ status: 'down', failure: { reason: 'body', expected: '"status":"ok"' } })
        expect(evaluateCheck({ ...CHECK, method: 'HEAD' }, { at: AT, status: 200 }).failure?.reason).toBe('body')
    })

    it('finds it down on a JSON value that is wrong, missing or not JSON at all', () => {
        const only = (json: Check['expect']): Check => ({ ...CHECK, expect: json })
        const wrong = evaluateCheck(
            only({ json: [{ path: 'database.connected', equals: true }] }),
            answer({ json: { database: { connected: false } } }),
        )
        expect(wrong.failure).toEqual({ reason: 'json', path: 'database.connected', expected: 'true', actual: 'false' })
        const unmatched = evaluateCheck(only({ json: [{ path: 'version', matches: '^5\\.' }] }), answer())
        expect(unmatched.failure).toEqual({ reason: 'json', path: 'version', expected: '/^5\\./', actual: '4.12.0' })
        const missing = evaluateCheck(only({ json: [{ path: 'build' }] }), answer())
        expect(missing.failure).toEqual({ reason: 'json', path: 'build', actual: 'nothing' })
        const page = evaluateCheck(only({ json: [{ path: 'version' }] }), answer({ body: '<html><title>Sign in</title></html>' }))
        expect(page).toMatchObject({ status: 'down', failure: { reason: 'json', path: 'version' } })
        // A pattern that is no regular expression matches nothing, and a list is not a value to match.
        expect(evaluateCheck(only({ json: [{ path: 'version', matches: '(' }] }), answer()).status).toBe('down')
        expect(evaluateCheck(only({ json: [{ path: 'services', matches: 'worker' }] }), answer()).status).toBe('down')
        expect(evaluateCheck(only({ json: [{ path: 'database.replica', equals: null }] }), answer()).status).toBe('up')
    })

    it('judges a slow answer: degraded past one bound, down past the other', () => {
        expect(evaluateCheck(CHECK, answer({ latency: 500 })).status).toBe('up')
        expect(evaluateCheck(CHECK, answer({ latency: 812.4 }))).toMatchObject({
            status: 'degraded',
            latency: 812.4,
            values: { version: '4.12.0' },
            failure: { reason: 'latency', expected: '500 ms', actual: '812 ms' },
        })
        expect(evaluateCheck(CHECK, answer({ latency: 5001 }))).toMatchObject({
            status: 'down',
            failure: { reason: 'latency', expected: '5000 ms', actual: '5001 ms' },
        })
        expect(evaluateCheck({ ...CHECK, latency: undefined }, answer({ latency: 60_000 })).status).toBe('up')
        expect(evaluateCheck(CHECK, { at: AT, status: 200, body: JSON.stringify(HEALTH) })).toMatchObject({ status: 'up' })
    })
})

describe('the generic HTTP kind', () => {
    it('checks that a base URL answers, a redirect included', () => {
        const [check] = HTTP_KIND.checks()
        expect(HTTP_KIND).toMatchObject({ id: 'http', label: 'HTTP' })
        expect(check).toEqual({
            id: 'http',
            label: 'Answers',
            path: '',
            latency: DEFAULT_LATENCY,
            expect: { status: { from: 200, to: 399 } },
        })
        expect(evaluateCheck(check, { at: AT, status: 301, latency: 80 }).status).toBe('up')
        expect(evaluateCheck(check, { at: AT, status: 500, latency: 80 }).status).toBe('down')
        expect(evaluateCheck(check, { at: AT, status: 200, latency: 1500 }).status).toBe('degraded')
    })

    it('builds a check of a path with what its answer must hold', () => {
        const check = httpCheck({
            id: 'ready',
            label: 'Ready',
            path: '/ready',
            method: 'HEAD',
            status: 204,
            credentials: true,
            headers: { Accept: 'application/json' },
            latency: { degraded: 200 },
        })
        expect(check).toEqual({
            id: 'ready',
            label: 'Ready',
            path: '/ready',
            method: 'HEAD',
            credentials: true,
            headers: { Accept: 'application/json' },
            latency: { degraded: 200 },
            expect: { status: 204 },
        })
        expect(httpCheck({ body: 'pong', json: [{ path: 'ok', equals: true }] }).expect).toEqual({
            status: { from: 200, to: 399 },
            body: 'pong',
            json: [{ path: 'ok', equals: true }],
        })
    })
})

describe('several statuses as one', () => {
    it('takes the worst, with what is not known yet between up and degraded', () => {
        expect(worstStatus([])).toBe('unknown')
        expect(worstStatus(['up', 'up'])).toBe('up')
        expect(worstStatus(['up', 'unknown'])).toBe('unknown')
        expect(worstStatus(['unknown', 'degraded', 'up'])).toBe('degraded')
        expect(worstStatus(['degraded', 'down', 'up'])).toBe('down')
    })

    it('combines one round of checks into one observation', () => {
        expect(combineResults([])).toBeUndefined()
        expect(
            combineResults([
                { status: 'up', at: AT, latency: 80 },
                { status: 'degraded', at: AT + 40, latency: 1200 },
                { status: 'up', at: AT + 20 },
            ]),
        ).toEqual({ status: 'degraded', at: AT + 40, latency: 1200 })
        expect(combineResults([{ status: 'down', at: AT }])).toEqual({ status: 'down', at: AT })
    })
})

describe('the status monitor', () => {
    const MINUTE = 60_000
    /** Observations a minute apart, from a line of letters: `u` up, `s` slow, `d` down. */
    const observe = (line: string, start = AT): Observation[] =>
        [...line].map((letter, index) => ({
            status: letter === 'u' ? 'up' : letter === 's' ? 'degraded' : 'down',
            at: start + index * MINUTE,
            ...(letter === 'd' ? {} : { latency: letter === 's' ? 1500 : 100 }),
        }))
    /** The status after each observation of a line, as letters, `?` for unknown. */
    const follow = (line: string, options?: Parameters<typeof createStatusMonitor>[0]): string => {
        const monitor = createStatusMonitor(options)
        return observe(line)
            .map((observation) => {
                monitor.push(observation)
                return { up: 'u', degraded: 's', down: 'd', unknown: '?' }[monitor.status()]
            })
            .join('')
    }

    it('starts unknown, and is up at the first good answer', () => {
        const monitor = createStatusMonitor()
        expect(monitor.status()).toBe('unknown')
        expect(monitor.summary()).toEqual({ status: 'unknown', count: 0 })
        expect(monitor.push({ status: 'up', at: AT, latency: 90 })).toEqual({ from: 'unknown', to: 'up', at: AT })
        expect(monitor.push({ status: 'up', at: AT + MINUTE, latency: 110 })).toBeUndefined()
        expect(monitor.status()).toBe('up')
    })

    it('turns down only after three failures in a row, and up again at one good answer', () => {
        expect(follow('uudduudddduu')).toBe('uuuuuuuudduu')
        const monitor = createStatusMonitor()
        const changes = observe('uudduudddduu').map((observation) => monitor.push(observation))
        expect(changes.filter((change) => change !== undefined)).toEqual([
            { from: 'unknown', to: 'up', at: AT },
            { from: 'up', to: 'down', at: AT + 8 * MINUTE },
            { from: 'down', to: 'up', at: AT + 10 * MINUTE },
        ])
    })

    it('turns degraded after three answers in a row that were not up, slow or lost', () => {
        expect(follow('usssu')).toBe('uuusu')
        expect(follow('usdsdddu')).toBe('uuusssdu')
        // Down improves to degraded at an answer that came, though slowly.
        expect(follow('udddssu')).toBe('uuudssu')
    })

    it('waits for as many failures and recoveries as it is told', () => {
        expect(follow('udu', { failures: 1 })).toBe('udu')
        expect(follow('uudddududuu', { recoveries: 2 })).toBe('?uuuddddddu')
        expect(follow('ddd')).toBe('??d')
        expect(follow('uu', { recoveries: 2 })).toBe('?u')
    })

    it('gives the uptime and the latency over its window', () => {
        const monitor = createStatusMonitor({ window: 10 * MINUTE })
        for (const observation of observe('uuuusdduuu')) monitor.push(observation)
        // Slow, lost, lost made it degraded, and the answer after them up again.
        expect(monitor.summary()).toEqual({
            status: 'up',
            since: AT + 7 * MINUTE,
            last: { status: 'up', at: AT + 9 * MINUTE, latency: 100 },
            count: 10,
            uptime: 0.8,
            latency: { mean: 275, median: 100, p95: 1500, min: 100, max: 1500 },
        })
        // Five minutes on, the window has left the first five observations behind.
        const later = monitor.summary(AT + 14 * MINUTE)
        expect(later.count).toBe(5)
        expect(later.uptime).toBe(0.6)
        expect(later.latency).toEqual({ mean: 100, median: 100, p95: 100, min: 100, max: 100 })
        expect(monitor.summary(AT + 60 * MINUTE)).toEqual({
            status: 'up',
            since: AT + 7 * MINUTE,
            last: { status: 'up', at: AT + 9 * MINUTE, latency: 100 },
            count: 0,
        })
    })

    it('forgets what its window has passed, but never the run it counts', () => {
        const monitor = createStatusMonitor({ window: 2 * MINUTE, failures: 3 })
        for (const observation of observe('uuuuuu')) monitor.push(observation)
        expect(monitor.state().observations.map((observation) => observation.at)).toEqual([
            AT + 3 * MINUTE,
            AT + 4 * MINUTE,
            AT + 5 * MINUTE,
        ])
        // Answers an hour apart still add up to three failures in a row.
        const slow = createStatusMonitor({ window: MINUTE })
        expect(['d', 'd', 'd'].map((_, index) => slow.push({ status: 'down', at: AT + index * 60 * MINUTE })?.to)).toEqual([
            undefined,
            undefined,
            'down',
        ])
    })

    it('keeps only what an observation is, and goes on from a state kept before', () => {
        const monitor = createStatusMonitor()
        const result = evaluateCheck(CHECK, answer())
        monitor.push(result)
        monitor.push({ status: 'down', at: AT + MINUTE })
        const state = monitor.state()
        expect(state).toEqual({
            status: 'up',
            since: AT,
            observations: [
                { status: 'up', at: AT, latency: 120 },
                { status: 'down', at: AT + MINUTE },
            ],
        })
        const resumed = createStatusMonitor({ initial: JSON.parse(JSON.stringify(state)) as typeof state })
        expect(resumed.status()).toBe('up')
        expect(resumed.push({ status: 'down', at: AT + 2 * MINUTE })).toBeUndefined()
        expect(resumed.push({ status: 'down', at: AT + 3 * MINUTE })).toEqual({ from: 'up', to: 'down', at: AT + 3 * MINUTE })
        expect(monitor.status()).toBe('up')
        resumed.clear()
        expect(resumed.state()).toEqual({ status: 'unknown', observations: [] })
    })
})
