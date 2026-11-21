import { describe, expect, it } from 'vitest'

import type { Check, CheckResponse } from './checks'
import { createSourceEngine, type Source, type SourceReading } from './sources'

const CHECK: Check = { id: 'feed', label: 'Feed answers', path: '', expect: { status: 200 }, latency: { degraded: 500, down: 5000 } }

const answer = (at: number, status: number | undefined, latency = 100): Record<string, CheckResponse> => ({
    feed: status === undefined ? { at, error: 'refused' } : { at, status, latency },
})

/** A source whose live read answers what the test queued, and whose simulation always answers. */
function scripted(queue: (number | undefined)[], extra: Partial<Source<string>> = {}): Source<string> {
    return {
        id: 'quakes',
        label: 'Earthquakes',
        kind: 'incidents',
        interval: 60_000,
        checks: [CHECK],
        read: ({ at }) => {
            const status = queue.shift()
            return { responses: answer(at, status), data: status === 200 ? `live ${String(at)}` : undefined }
        },
        simulate: ({ at }) => ({ responses: answer(at, 200, 40), data: `simulated ${String(at)}` }),
        ...extra,
    }
}

describe('createSourceEngine', () => {
    it('reads a source when it is due and not before', () => {
        const engine = createSourceEngine({ sources: [scripted([200, 200])] })
        engine.poll(0)
        engine.poll(30_000)
        expect(engine.data('quakes')).toBe('live 0')
        engine.poll(60_000)
        expect(engine.data('quakes')).toBe('live 60000')
        const [source] = engine.state().sources
        expect(source).toMatchObject({ status: 'up', mode: 'live', fallback: false, readAt: 60_000, nextAt: 120_000 })
        expect(source.latency).toEqual([100, 100])
    })

    it('shows the simulation while a live read is down, and says so', () => {
        const engine = createSourceEngine({ sources: [scripted([200, undefined, 200])] })
        engine.poll(0)
        engine.poll(60_000)
        expect(engine.data('quakes')).toBe('simulated 60000')
        expect(engine.state().sources[0]).toMatchObject({ mode: 'simulated', fallback: true, status: 'up' })
        expect(engine.state().sources[0].results[0].failure).toMatchObject({ reason: 'unreachable', actual: 'refused' })
        engine.poll(120_000)
        expect(engine.data('quakes')).toBe('live 120000')
        expect(engine.state().sources[0]).toMatchObject({ mode: 'live', fallback: false })
    })

    it('raises an alert when the status changes, and none for a first status that is up', () => {
        const engine = createSourceEngine({ sources: [scripted([200, 500, 500, 500, 200])], failures: 3 })
        for (let round = 0; round < 4; round += 1) engine.poll(round * 60_000)
        expect(engine.state().sources[0].status).toBe('down')
        expect(engine.state().alerts).toHaveLength(1)
        expect(engine.state().alerts[0]).toMatchObject({ source: 'quakes', label: 'Earthquakes', from: 'up', to: 'down', at: 180_000 })
        expect(engine.state().alerts[0].reason).toBe('status: 500')
        engine.poll(240_000)
        expect(engine.state().alerts.map((alert) => alert.to)).toEqual(['up', 'down'])
        expect(engine.state().sources[0].transitions.map((change) => change.to)).toEqual(['up', 'down', 'up'])
    })

    it('reads the simulation alone for a source with no live read, or with live switched off', () => {
        const queue = [200, 200]
        const engine = createSourceEngine({ sources: [scripted(queue), { ...scripted([]), id: 'machine', read: undefined }] })
        engine.poll(0)
        expect(engine.state().sources[1]).toMatchObject({ mode: 'simulated', fallback: false, live: false, status: 'up' })
        engine.setLive('quakes', false)
        expect(engine.data('quakes')).toBeUndefined()
        engine.poll(1000)
        expect(engine.data('quakes')).toBe('simulated 1000')
        expect(queue).toHaveLength(1)
    })

    it('forgets a source that is switched off and reads it again once it is on', () => {
        const engine = createSourceEngine({ sources: [scripted([200, 200])] })
        engine.poll(0)
        engine.setEnabled('quakes', false)
        expect(engine.state().sources[0]).toMatchObject({ enabled: false, mode: 'off', status: 'unknown', latency: [] })
        engine.poll(60_000)
        expect(engine.data('quakes')).toBeUndefined()
        engine.setEnabled('quakes', true)
        engine.poll(61_000)
        expect(engine.data('quakes')).toBe('live 61000')
    })

    it('leaves a source that asks for it unread while the page is hidden', () => {
        const engine = createSourceEngine({ sources: [scripted([200], { pauseHidden: true })] })
        engine.poll(0, { hidden: true })
        expect(engine.state().sources[0].readAt).toBeUndefined()
        engine.poll(1000)
        expect(engine.state().sources[0].readAt).toBe(1000)
    })

    it('leaves it unread while hidden after a live read failed, and reads its simulation alone hidden or not', () => {
        const queue: (number | undefined)[] = [undefined, 200]
        const engine = createSourceEngine({ sources: [scripted(queue, { pauseHidden: true })] })
        engine.poll(0)
        expect(engine.state().sources[0]).toMatchObject({ mode: 'simulated', fallback: true })
        engine.poll(60_000, { hidden: true })
        expect(queue).toHaveLength(1)
        expect(engine.state().sources[0].readAt).toBe(0)
        engine.poll(60_000)
        expect(queue).toHaveLength(0)

        engine.setLive('quakes', false)
        engine.poll(120_000, { hidden: true })
        expect(engine.data('quakes')).toBe('simulated 120000')
    })

    it('takes a read that answers later, marks it under way, and drops one a switch overtook', async () => {
        let settle: (reading: SourceReading<string>) => void = () => undefined
        const slow = scripted([], { read: () => new Promise<SourceReading<string>>((resolve) => (settle = resolve)) })
        const engine = createSourceEngine({ sources: [slow] })
        let calls = 0
        engine.subscribe(() => (calls += 1))
        engine.poll(0)
        expect(engine.state().sources[0].reading).toBe(true)
        engine.poll(100_000)
        settle({ responses: answer(0, 200), data: 'late' })
        await Promise.resolve()
        expect(engine.data('quakes')).toBe('late')
        expect(engine.state().sources[0].reading).toBe(false)
        expect(calls).toBe(2)

        engine.poll(100_000)
        engine.setLive('quakes', false)
        settle({ responses: answer(100_000, 200), data: 'overtaken' })
        await Promise.resolve()
        expect(engine.data('quakes')).toBeUndefined()
    })

    it('counts a read that throws as down, with why', () => {
        const engine = createSourceEngine({
            sources: [
                scripted([], {
                    read: () => {
                        throw new Error('offline')
                    },
                }),
            ],
            failures: 1,
        })
        engine.poll(0)
        expect(engine.state().sources[0]).toMatchObject({ status: 'down', error: 'offline', fallback: true })
        expect(engine.state().alerts[0]).toMatchObject({ from: 'unknown', to: 'down', reason: 'unreachable: offline' })
    })

    it('hands its snapshot to another engine, which runs on from it', () => {
        const first = createSourceEngine({ sources: [scripted([200, 500, 500])], failures: 3 })
        for (let round = 0; round < 3; round += 1) first.poll(round * 60_000)
        const second = createSourceEngine({ sources: [scripted([500])], failures: 3 })
        second.adopt(JSON.parse(JSON.stringify(first.snapshot())) as ReturnType<typeof first.snapshot>)
        expect(second.state().sources[0]).toMatchObject({ status: 'up', readAt: 120_000 })
        expect(second.data('quakes')).toBe('simulated 120000')
        second.poll(170_000)
        expect(second.state().sources[0].status).toBe('up')
        second.poll(180_000)
        expect(second.state().sources[0].status).toBe('down')
        expect(second.state().alerts[0]).toMatchObject({ from: 'up', to: 'down' })
    })

    it('sends only the data a reader does not hold, which keeps the rest', () => {
        const first = createSourceEngine({ sources: [scripted([200, 200]), { ...scripted([200, 200]), id: 'flights', interval: 500_000 }] })
        const second = createSourceEngine({ sources: [scripted([]), { ...scripted([]), id: 'flights' }] })
        first.poll(0)
        second.adopt(first.snapshot())
        const known = Object.fromEntries(second.state().sources.map((source) => [source.id, source.version]))
        first.poll(60_000)
        const next = first.snapshot(known)
        expect(Object.keys(next.data)).toEqual(['quakes'])
        second.adopt(next)
        expect(second.data('quakes')).toBe('live 60000')
        expect(second.data('flights')).toBe('live 0')
    })

    it('gives the same state until something changes', () => {
        const engine = createSourceEngine({ sources: [scripted([200])] })
        const before = engine.state()
        expect(engine.state()).toBe(before)
        engine.poll(0)
        expect(engine.state()).not.toBe(before)
    })
})
