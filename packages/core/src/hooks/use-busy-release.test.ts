import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from '../lib/commands'
import { BUSY_RELEASE } from '../lib/durations'
import { closing, letsGo, releaser } from './use-busy-release'

/** A releaser over the token's wait, with every answer it gave. */
function timed(wait = BUSY_RELEASE) {
    const said: boolean[] = []
    const timing = releaser(wait, (released) => said.push(released))
    return { timing, said, released: () => said.at(-1) === true }
}

describe('the busy wait', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('is the busy-release token, 5 seconds', () => {
        const tokens = JSON.parse(readFileSync(join(__dirname, '..', '..', 'tokens', 'tokens.json'), 'utf8')) as {
            themes: { tidevann: { light: Record<string, string> } }
        }
        expect(tokens.themes.tidevann.light['busy-release']).toBe('5000ms')
        expect(BUSY_RELEASE).toBe(5000)
    })

    it('holds a busy part until the wait has run, then releases it', () => {
        const { timing, released } = timed()
        timing.busy(true)
        vi.advanceTimersByTime(4999)
        expect(released()).toBe(false)
        vi.advanceTimersByTime(1)
        expect(released()).toBe(true)
    })

    it('holds again from the start of each spell of work, and never while nothing runs', () => {
        const { timing, released } = timed()
        timing.busy(true)
        vi.advanceTimersByTime(5000)
        expect(released()).toBe(true)
        timing.busy(false)
        expect(released()).toBe(false)
        vi.advanceTimersByTime(10_000)
        expect(released()).toBe(false)
        timing.busy(true)
        vi.advanceTimersByTime(3000)
        expect(released()).toBe(false)
        vi.advanceTimersByTime(2000)
        expect(released()).toBe(true)
    })

    it('takes a wait of its own, as a part with `busyRelease` gives one', () => {
        const { timing, released } = timed(1500)
        timing.busy(true)
        vi.advanceTimersByTime(1499)
        expect(released()).toBe(false)
        vi.advanceTimersByTime(1)
        expect(released()).toBe(true)
    })

    it("lets a palette go after the wait, and says nothing of the command's answer after it closed", async () => {
        // The palette's own flow: a command runs, Escape is held, the wait runs, Escape is heeded, the refusal goes unsaid.
        const said: string[] = []
        const state = { open: true, busy: false, released: false }
        const timing = releaser(BUSY_RELEASE, (released) => (state.released = released))
        let refuse: (reason: unknown) => void = () => undefined
        runCommand(() => new Promise((_, reject) => (refuse = reject)), {
            done: () => said.push('closed'),
            busy: (pending) => {
                state.busy = pending
                timing.busy(pending)
            },
            refused: (reason) => said.push(`refused: ${reason ?? '-'}`),
            current: () => state.open,
        })
        expect(letsGo(state.busy, state.released, 'escape-key')).toBe(false)
        vi.advanceTimersByTime(BUSY_RELEASE)
        expect(letsGo(state.busy, state.released, 'escape-key')).toBe(true)
        state.open = false
        refuse(new Error('Only an owner can rerun nightly-export.'))
        await vi.runAllTimersAsync()
        expect(said).toEqual([])
    })

    it('stops waiting once stopped, as an unmounted part does', () => {
        const { timing, said } = timed()
        timing.busy(true)
        timing.stop()
        vi.advanceTimersByTime(10_000)
        expect(said).toEqual([false])
    })
})

describe('letting a busy part go', () => {
    it('lets anything close it while nothing runs', () => {
        for (const reason of ['escape-key', 'outside-press', 'close-press', undefined]) expect(letsGo(false, false, reason)).toBe(true)
    })

    it('holds it against every way while the work runs, before the wait', () => {
        for (const reason of ['escape-key', 'close-watcher', 'outside-press', 'close-press', undefined])
            expect(letsGo(true, false, reason)).toBe(false)
    })

    it('lets Escape, the back gesture and its own close close it after the wait, never a press outside or Mod+K', () => {
        expect(letsGo(true, true, 'escape-key')).toBe(true)
        expect(letsGo(true, true, 'close-watcher')).toBe(true)
        expect(letsGo(true, true, 'close-press')).toBe(true)
        expect(letsGo(true, true, 'outside-press')).toBe(false)
        // Mod+K asks with no reason of Base UI's.
        expect(letsGo(true, true, undefined)).toBe(false)
    })

    it('tells a closing with nothing running from one that lets the work go, which a dialog reports to onStopWaiting', () => {
        expect(closing(false, false, 'escape-key')).toBe('closed')
        expect(closing(true, false, 'escape-key')).toBe('held')
        expect(closing(true, true, 'outside-press')).toBe('held')
        expect(closing(true, true, 'escape-key')).toBe('let go')
        expect(closing(true, true, 'close-press')).toBe('let go')
    })
})
