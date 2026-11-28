import { useEffect, useState, type RefObject } from 'react'

import { useScrollMemory } from '../hooks/use-scroll-memory'
import { recallScroll, SCROLL_WAIT } from '../lib/scroll-memory'

export interface TableMemoryProps {
    /** The key the rows' place is kept under. */
    scrollKey: string
    /** The element the rows scroll in. */
    scroller: RefObject<HTMLElement | null>
    /** Whether the table holds its first rows yet; the place is put back once it does. */
    ready: boolean
    /** Hears how far down the place lies while the table is on its way there, and undefined once it stops. */
    onSeeking: (top: number | undefined) => void
}

/**
 * A table's scroll memory, which `DataTable` loads the first time a table with `scrollKey` is
 * drawn: it keeps and puts back the rows' place as `useScrollMemory` does, and says where the place
 * lies while the table is still on its way there, until the reader scrolls or the wait for the rows
 * runs out, so the table can ask for the rows that reach it.
 */
export function TableMemory({ scrollKey, scroller, ready, onSeeking }: TableMemoryProps) {
    // Read before the place is put back and noted again.
    const [place] = useState(() => recallScroll(scrollKey)?.top)
    useScrollMemory(scrollKey, scroller, { ready })
    useEffect(() => {
        if (place === undefined || place <= 0) return undefined
        onSeeking(place)
        const area = scroller.current
        const stop = () => onSeeking(undefined)
        const intents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
        for (const intent of intents) area?.addEventListener(intent, stop, { passive: true })
        const timer = setTimeout(stop, SCROLL_WAIT)
        return () => {
            for (const intent of intents) area?.removeEventListener(intent, stop)
            clearTimeout(timer)
            stop()
        }
    }, [place, scroller, onSeeking])
    return null
}
