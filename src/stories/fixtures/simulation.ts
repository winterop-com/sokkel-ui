import { createSimClock } from '@winterop-com/sokkel-ui-tracking/simulate'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

/** A simulated clock as a story reads it. */
export interface StoryClock {
    /** The simulated moment, in milliseconds since the epoch. */
    now: number
    /** Whether the clock plays; false while paused. */
    running: boolean
    /** Pauses the clock, or plays it on from where it stands. */
    toggle: () => void
}

/**
 * The simulated clock a live story reads its feed at: it stands at `start` when the story is first
 * drawn, the same moment every time, and plays on from there once the story is on the page, `speed`
 * simulated seconds each second, a tick a second. With `playing: false` it stands still at `start`
 * until the reader plays it.
 */
export function useSimClock(start: number, speed: number, { playing = true }: { playing?: boolean } = {}): StoryClock {
    const clock = useMemo(() => createSimClock({ start, speed, playing: false }), [start, speed])
    const now = useSyncExternalStore(clock.subscribe, clock.get, clock.get)
    const [running, setRunning] = useState(playing)
    useEffect(() => {
        if (running) clock.play()
        else clock.pause()
        return () => clock.pause()
    }, [clock, running])
    const toggle = useCallback(() => setRunning((was) => !was), [])
    return { now, running, toggle }
}

const CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

/** A simulated moment as a console's clock says it, in UTC: `14:30:00 UTC`. */
export const clockTime = (at: number): string => `${CLOCK.format(at)} UTC`
