import { useContext, useLayoutEffect, type RefObject } from 'react'

import { ShellScroller } from '../components/shell-context'
import { keepScroll, recallScroll, rememberScroll } from '../lib/scroll-memory'

/** What `useScrollMemory` waits for. */
export interface ScrollMemoryOptions {
    /** Whether the scroller holds what it scrolls yet; the place is put back once it does. On unless given. */
    ready?: boolean
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
 * it is reached or the person scrolls; `ready: false` holds it back until the rows are there.
 */
export function useScrollMemory(key: string, ref?: RefObject<HTMLElement | null>, { ready = true }: ScrollMemoryOptions = {}): void {
    const shell = useContext(ShellScroller)
    useLayoutEffect(() => {
        const area = ref === undefined ? shell : ref.current
        if (!ready || area === null) return undefined
        const wanted = recallScroll(key) ?? { top: 0, left: 0 }
        let pending = true
        const place = () => {
            if (!pending) return
            area.scrollTop = wanted.top
            area.scrollLeft = wanted.left
            if (Math.abs(area.scrollTop - wanted.top) <= 1 && Math.abs(area.scrollLeft - wanted.left) <= 1) pending = false
        }
        place()
        // The person moving it ends the wait for the place to be reached.
        const moved = () => {
            pending = false
        }
        const note = () => {
            if (!pending) rememberScroll(key, { top: area.scrollTop, left: area.scrollLeft })
        }
        const keep = () => keepScroll(key)
        const intents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
        for (const intent of intents) area.addEventListener(intent, moved, { passive: true })
        area.addEventListener('scroll', note, { passive: true })
        window.addEventListener('pagehide', keep)
        const growing = typeof ResizeObserver === 'undefined' || !pending ? undefined : new ResizeObserver(place)
        if (growing !== undefined) for (const element of [area, ...Array.from(area.children)]) growing.observe(element)
        return () => {
            for (const intent of intents) area.removeEventListener(intent, moved)
            area.removeEventListener('scroll', note)
            window.removeEventListener('pagehide', keep)
            growing?.disconnect()
            keep()
        }
    }, [key, ref, shell, ready])
}
