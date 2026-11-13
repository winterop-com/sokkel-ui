import { useContext, useLayoutEffect, type RefObject } from 'react'

import { ShellScroller } from '../components/shell-context'
import { holdScroll, keepScroll, recallScroll, rememberScroll } from '../lib/scroll-memory'

/** What `useScrollMemory` waits for. */
export interface ScrollMemoryOptions {
    /** Whether the scroller holds what it scrolls yet; the place is put back once it does. On unless given. */
    ready?: boolean
    /** How long, in milliseconds, the place waits for what the scroller holds to load; ten seconds unless given. */
    wait?: number
}

/**
 * Keeps where a scroller is left under `key` for the session, and puts it back there when a screen
 * with the same key returns: back to a list is back where it was left, and a key never left starts
 * at the top. The place is noted as the scroller moves, so it is right even once the scroller holds
 * the next screen, and kept in session storage, so a reload finds it, or in memory where storage is
 * refused.
 *
 * `ref` is the scroller; without one it is the content of the `Shell` around, the one thing that
 * scrolls there. While what it scrolls is still loading, the place is put back as it grows, until
 * it is reached, the person scrolls, or `wait` runs out. It counts as grown when anything below it
 * changes, so a page of fixed height whose rows load after it is drawn finds its place too;
 * `ready: false` holds it back until the rows are there.
 */
export function useScrollMemory(key: string, ref?: RefObject<HTMLElement | null>, { ready = true, wait }: ScrollMemoryOptions = {}): void {
    const shell = useContext(ShellScroller)
    useLayoutEffect(() => {
        const area = ref === undefined ? shell : ref.current
        if (!ready || area === null) return undefined
        let held = true
        const stop = holdScroll(area, recallScroll(key) ?? { top: 0, left: 0 }, {
            wait,
            onSettled: () => {
                held = false
            },
        })
        const note = () => {
            if (!held) rememberScroll(key, { top: area.scrollTop, left: area.scrollLeft })
        }
        const keep = () => keepScroll(key)
        area.addEventListener('scroll', note, { passive: true })
        window.addEventListener('pagehide', keep)
        return () => {
            stop()
            area.removeEventListener('scroll', note)
            window.removeEventListener('pagehide', keep)
            keep()
        }
    }, [key, ref, shell, ready, wait])
}
