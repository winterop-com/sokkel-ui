import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

import { keyChange, type CalendarEventChange } from './event-change'
import type { CalendarEvent, CalendarWords } from './events'

type CalendarDragLayer = typeof import('./calendar-drag')
let calendarDrag: CalendarDragLayer | undefined
let calendarDragLoad: Promise<CalendarDragLayer> | undefined

/** The views' drag layer, fetched the first time a view that moves its events is drawn. */
export function useCalendarDrag(wanted: boolean): CalendarDragLayer | undefined {
    const [loaded, setLoaded] = useState(calendarDrag)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        calendarDragLoad ??= import('./calendar-drag').then(
            (module) => (calendarDrag = module),
            (error: unknown) => {
                calendarDragLoad = undefined
                throw error
            },
        )
        calendarDragLoad.then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return wanted ? (loaded ?? calendarDrag) : undefined
}

export interface EventKeysOptions<E extends CalendarEvent> {
    view: 'week' | 'month'
    step: number
    words: CalendarWords
    canChange?: (event: E) => boolean
    onEventMove?: (change: CalendarEventChange<E>) => void
    onEventResize?: (change: CalendarEventChange<E>) => void
    /** The view, where the moved event takes the focus once it is drawn in its new place. */
    root: RefObject<HTMLElement | null>
}

/**
 * The keys that change an event from its control: Alt with the arrows moves it, and with Shift too
 * changes its end, the focus following it and a screen reader told where it now is.
 */
export function useEventKeys<E extends CalendarEvent>({
    view,
    step,
    words,
    canChange,
    onEventMove,
    onEventResize,
    root,
}: EventKeysOptions<E>) {
    const [said, setSaid] = useState('')
    const refocus = useRef<string | null>(null)
    useLayoutEffect(() => {
        const id = refocus.current
        if (id === null) return
        refocus.current = null
        root.current?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(id)}"]`)?.focus()
    })
    const changes = (event: E) => (onEventMove !== undefined || onEventResize !== undefined) && (canChange?.(event) ?? true)
    const keyDown = (event: E) => (key: KeyboardEvent<HTMLElement>) => {
        if (!key.altKey || key.metaKey || key.ctrlKey || !changes(event)) return
        const made = keyChange(event, key.key, key.shiftKey, view, step)
        const hear = made?.resize === true ? onEventResize : onEventMove
        if (made === undefined || hear === undefined) return
        key.preventDefault()
        key.stopPropagation()
        refocus.current = event.id
        hear(made.change)
        setSaid(words.changed(event.title, made.change.start, made.change.end, event.allDay === true))
    }
    const live: ReactNode = (
        <span aria-live="polite" className="sr-only">
            {said}
        </span>
    )
    return { changes, keyDown, live }
}
