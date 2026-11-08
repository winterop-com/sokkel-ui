import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

import { FOLLOW_PAUSE, followTop } from './follow'

/** The keys that scroll what has the focus. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

/** What a reader scrolls by, listened for to hold following back. */
const READING = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const

/** The nearest box around `element` that scrolls what it holds, or the page. */
function scrollerOf(element: HTMLElement): HTMLElement {
    for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
        const { overflowY } = getComputedStyle(parent)
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && parent.scrollHeight > parent.clientHeight)
            return parent
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/**
 * Keeps `target`, such as the playing row of a list or the line being sung, in view in the box
 * that scrolls it (`scroller`, or the nearest one around it, or the page) whenever `key` changes:
 * under `reveal` centering it only when it is out of view, under `center` centering it every time.
 * It moves at once on the first draw and smoothly after, unless the reader asks for less motion.
 * While the reader scrolls that box, and for `FOLLOW_PAUSE` after, it stays where they put it;
 * `resume` follows again at once, as a press on a row asks.
 */
export function useFollow(
    target: RefObject<HTMLElement | null>,
    key: unknown,
    {
        mode = 'reveal',
        enabled = true,
        scroller,
    }: { mode?: 'reveal' | 'center'; enabled?: boolean; scroller?: RefObject<HTMLElement | null> } = {},
): { resume: () => void } {
    // When the reader last scrolled the box; never, to begin with.
    const read = useRef(Number.NEGATIVE_INFINITY)
    const box = useRef<HTMLElement | null>(null)
    const drawn = useRef(false)

    useEffect(() => {
        if (!enabled) return
        const mark = (event: Event) => {
            const within = box.current
            if (within === null) return
            const page = within === document.scrollingElement
            const node = event.target instanceof Node ? event.target : null
            const inside = page || (node !== null && within.contains(node))
            if (!inside) return
            // A press scrolls only on the scrollbar, which is the box itself; a key only when it is one that scrolls.
            if (event.type === 'pointerdown' && node !== within && !(page && node === document.documentElement)) return
            if (event.type === 'keydown' && !SCROLL_KEYS.has((event as KeyboardEvent).key)) return
            read.current = performance.now()
        }
        for (const type of READING) window.addEventListener(type, mark, { capture: true, passive: true })
        return () => {
            for (const type of READING) window.removeEventListener(type, mark, { capture: true })
        }
    }, [enabled])

    useLayoutEffect(() => {
        const element = target.current
        if (!enabled || element === null) return
        const within = scroller?.current ?? scrollerOf(element)
        box.current = within
        const first = !drawn.current
        drawn.current = true
        if (!first && performance.now() - read.current < FOLLOW_PAUSE) return
        const page = within === document.scrollingElement
        const view = page ? { top: window.scrollY, height: window.innerHeight } : { top: within.scrollTop, height: within.clientHeight }
        // Where the box's content starts, in the window's coordinates.
        const origin = page ? -window.scrollY : within.getBoundingClientRect().top + within.clientTop - within.scrollTop
        const rect = element.getBoundingClientRect()
        const top = followTop({ top: rect.top - origin, height: rect.height }, view, within.scrollHeight - view.height, mode)
        if (top === undefined) return
        const still = first || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        within.scrollTo({ top, behavior: still ? 'instant' : 'smooth' })
    }, [target, scroller, key, enabled, mode])

    return {
        resume: () => {
            read.current = Number.NEGATIVE_INFINITY
        },
    }
}
