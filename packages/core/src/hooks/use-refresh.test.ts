import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refresher, type RefreshState } from './use-refresh'

/** A refresher over a counted run, with every state it reported. */
function counted(run: () => unknown = () => undefined) {
    let runs = 0
    const states: Partial<RefreshState>[] = []
    const driver = refresher(
        () => {
            runs += 1
            return run()
        },
        (state) => states.push(state),
    )
    return { driver, states, runs: () => runs }
}

describe('refresher', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-09T09:00:00Z'))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('refreshes at once on asking, and says when it ended', async () => {
        const { driver, states, runs } = counted()
        driver.refresh()
        await vi.runAllTimersAsync()
        expect(runs()).toBe(1)
        expect(states).toEqual([{ refreshing: true }, { refreshing: false, updated: Date.parse('2026-11-09T09:00:00Z') }])
    })

    it('refreshes on its interval until paused or stopped', async () => {
        const { driver, runs } = counted()
        driver.every(30, false)
        await vi.advanceTimersByTimeAsync(90_000)
        expect(runs()).toBe(3)
        driver.every(30, true)
        await vi.advanceTimersByTimeAsync(90_000)
        expect(runs()).toBe(3)
        driver.every(10, false)
        await vi.advanceTimersByTimeAsync(20_000)
        expect(runs()).toBe(5)
        driver.stop()
        await vi.advanceTimersByTimeAsync(60_000)
        expect(runs()).toBe(5)
    })

    it('never refreshes by itself with no interval', async () => {
        const { driver, runs } = counted()
        driver.every(0, false)
        await vi.advanceTimersByTimeAsync(600_000)
        expect(runs()).toBe(0)
    })

    it('runs one refresh at a time, dropping a refresh asked while one runs', async () => {
        const { driver, runs } = counted(() => new Promise((done) => setTimeout(done, 5_000)))
        driver.every(1, false)
        driver.refresh()
        await vi.advanceTimersByTimeAsync(4_000)
        expect(runs()).toBe(1)
        await vi.advanceTimersByTimeAsync(2_000)
        expect(runs()).toBe(2)
        driver.stop()
    })

    it('ends a refresh that fails without a new time', async () => {
        const { driver, states } = counted(() => Promise.reject(new Error('503')))
        driver.refresh()
        await vi.runAllTimersAsync()
        expect(states).toEqual([{ refreshing: true }, { refreshing: false }])
    })
})
