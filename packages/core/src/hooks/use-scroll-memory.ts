import { useContext, useLayoutEffect, useRef, type RefObject } from 'react'

import { ShellScroller } from '../components/shell-context'
import { followScroll } from '../lib/scroll-memory'

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
 * `ready: false` holds it back until the rows are there. What it held being dropped later, `ready`
 * turning false again as a search reloads them, notes where it stands then, so the rows that come
 * start at the top rather than at the place left before.
 */
export function useScrollMemory(key: string, ref?: RefObject<HTMLElement | null>, { ready = true, wait }: ScrollMemoryOptions = {}): void {
    const shell = useContext(ShellScroller)
    const shown = useRef<string | undefined>(undefined)
    useLayoutEffect(() => {
        const area = ref === undefined ? shell : ref.current
        if (area === null) return undefined
        const stop = followScroll(area, key, { ready, shown: shown.current === key, wait })
        if (ready) shown.current = key
        return stop
    }, [key, ref, shell, ready, wait])
}
