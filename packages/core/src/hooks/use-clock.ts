import { useCallback, useSyncExternalStore } from 'react'

/** A clock every part that reads the time as often shares: one timer however many are drawn. */
interface Clock {
    now: Date
    listeners: Set<() => void>
    timer?: ReturnType<typeof setInterval>
}

const clocks = new Map<number, Clock>()

function clockFor(period: number): Clock {
    let clock = clocks.get(period)
    if (clock === undefined) {
        clock = { now: new Date(), listeners: new Set() }
        clocks.set(period, clock)
    }
    return clock
}

function subscribe(period: number, listener: () => void): () => void {
    const clock = clockFor(period)
    clock.listeners.add(listener)
    if (clock.timer === undefined) {
        clock.now = new Date()
        clock.timer = setInterval(() => {
            clock.now = new Date()
            for (const each of clock.listeners) each()
        }, period)
    }
    return () => {
        clock.listeners.delete(listener)
        if (clock.listeners.size > 0) return
        clearInterval(clock.timer)
        clock.timer = undefined
    }
}

/** How many timers run now, one per period something reads; for a test. */
export function runningClocks(): number {
    let count = 0
    for (const clock of clocks.values()) if (clock.timer !== undefined) count += 1
    return count
}

/**
 * The time on a clock that ticks every `period` milliseconds while anything reads it, shared by every
 * reader of that period: a thousand marks that read the time each second run one timer between them,
 * and it stops once the last one is gone. `null` reads no clock and answers null, for a part given
 * its time from outside.
 */
export function useClock(period: number | null): Date | null {
    const subscribeTo = useCallback((listener: () => void) => (period === null ? () => undefined : subscribe(period, listener)), [period])
    const read = () => {
        if (period === null) return null
        const clock = clockFor(period)
        // A clock nothing has read for a while starts from now.
        if (clock.timer === undefined && Date.now() - clock.now.getTime() >= period) clock.now = new Date()
        return clock.now
    }
    return useSyncExternalStore(subscribeTo, read, read)
}
