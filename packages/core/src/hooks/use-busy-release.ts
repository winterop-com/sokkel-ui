import { useEffect, useState } from 'react'

import { BUSY_RELEASE } from '../lib/durations'

/**
 * The wait a busy part holds for before it offers a way out: told when the work starts and when it
 * settles, it says `released` once the work has run `wait` ms, and starts over with each spell of
 * work. Nothing it does cancels the work.
 */
export function releaser(wait: number, onChange: (released: boolean) => void) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const clear = () => {
        if (timer !== undefined) clearTimeout(timer)
        timer = undefined
    }
    return {
        busy: (now: boolean) => {
            clear()
            onChange(false)
            if (now) timer = setTimeout(() => onChange(true), wait)
        },
        stop: clear,
    }
}

/** Why a busy part was asked to close, in Base UI's words: by Escape (or the system's back), its own close, or another way. */
export type CloseReason = string | undefined

/** The reasons that let a released part go: Escape, the system's back gesture, and the part's own close. */
const WAYS_OUT = new Set(['escape-key', 'close-watcher', 'close-press'])

/**
 * Whether a request to close is heeded: always while nothing runs; while work runs, only once it
 * has been released, and then only by Escape or the part's own close, never by a press outside.
 */
export function letsGo(busy: boolean, released: boolean, reason: CloseReason): boolean {
    if (!busy) return true
    return released && reason !== undefined && WAYS_OUT.has(reason)
}

/**
 * Whether a part busy with work has held for `wait` ms and may offer a way out: false while it is
 * not busy, and from each start of work until the wait has run.
 */
export function useBusyRelease(busy: boolean, wait: number = BUSY_RELEASE): boolean {
    const [released, setReleased] = useState(false)
    useEffect(() => {
        const timing = releaser(wait, setReleased)
        timing.busy(busy)
        return timing.stop
    }, [busy, wait])
    return busy && released
}
