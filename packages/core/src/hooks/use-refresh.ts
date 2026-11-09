import { useEffect, useRef, useState } from 'react'

/** How an app refreshes by itself: how often, and whether it is held a while. */
export interface RefreshOptions {
    /** Seconds between refreshes; 0 is never. `RefreshControl`'s `interval`. */
    interval: number
    /** Holds refreshing by itself, keeping the interval for when it resumes. `RefreshControl`'s `paused`. */
    paused?: boolean
}

/** Where a refresh stands: whether one runs now, and when the last one ended, in milliseconds since the epoch. */
export interface RefreshState {
    refreshing: boolean
    updated?: number
}

/** What `useRefresh` gives back: a refresh now, for `RefreshControl`'s `onRefresh`, and where it stands. */
export interface Refresh extends RefreshState {
    refresh: () => void
}

/** The timer behind `useRefresh`, outside React: a refresh now, a clock that refreshes, and its stop. */
export interface Refresher {
    refresh: () => void
    /** Refreshes every `interval` seconds unless paused, in place of the clock before. */
    every: (interval: number, paused: boolean) => void
    stop: () => void
}

/**
 * Runs `run` on asking and on a clock, one at a time: a refresh asked while one runs is dropped,
 * and a tick of the clock while the page is hidden is skipped. `changed` hears when a refresh starts
 * and ends; a refresh that fails ends without a new `updated`, its problem the app's to show.
 */
export function refresher(run: () => unknown, changed: (state: Partial<RefreshState>) => void): Refresher {
    let running = false
    let timer: ReturnType<typeof setInterval> | undefined
    const refresh = () => {
        if (running) return
        running = true
        changed({ refreshing: true })
        const end = (updated?: number) => {
            running = false
            changed(updated === undefined ? { refreshing: false } : { refreshing: false, updated })
        }
        void Promise.resolve()
            .then(run)
            .then(
                () => end(Date.now()),
                () => end(),
            )
    }
    const stop = () => clearInterval(timer)
    const every = (interval: number, paused: boolean) => {
        stop()
        if (interval <= 0 || paused) return
        timer = setInterval(() => {
            if (typeof document === 'undefined' || !document.hidden) refresh()
        }, interval * 1000)
    }
    return { refresh, every, stop }
}

/**
 * Refreshes what an app shows on `RefreshControl`'s interval and pause, so no app writes the effect
 * itself: `run` (which may answer a promise) every `interval` seconds unless `paused`, and at once
 * on `refresh`, one at a time and never while the page is hidden. `refreshing` holds while it runs,
 * for the control's spin, and `updated` says when the last refresh ended.
 *
 *     const live = useRefresh(load, { interval, paused })
 *     <RefreshControl onRefresh={live.refresh} refreshing={live.refreshing} interval={interval} ... />
 */
export function useRefresh(run: () => unknown, { interval, paused = false }: RefreshOptions): Refresh {
    const latest = useRef(run)
    useEffect(() => {
        latest.current = run
    })
    const [state, setState] = useState<RefreshState>({ refreshing: false })
    const [driver] = useState(() =>
        refresher(
            () => latest.current(),
            (change) => setState((now) => ({ ...now, ...change })),
        ),
    )
    useEffect(() => {
        driver.every(interval, paused)
        return driver.stop
    }, [driver, interval, paused])
    return { ...state, refresh: driver.refresh }
}
