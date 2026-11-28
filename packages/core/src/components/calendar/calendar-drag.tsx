/**
 * What the week and month views move their events with, loaded the first time one is drawn with
 * `onEventMove`: the events on the drag engine, and the days as the places they land on.
 */
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, fromKeyboard, useDragItem, useDropTarget, type DragHandleProps } from '../DragDrop'

/** Where a carried event is: the pointer now and where it was pressed, and the day under it. */
export interface CalendarCarry {
    /** What the event carries: its id, and the day it was taken from. */
    value: { id: string; day: number }
    point: { x: number; y: number } | null
    start: { x: number; y: number } | null
    /** The index of the day under the pointer, or null. */
    over: number | null
}

export interface CalendarDragAreaProps {
    kind: string
    onMove: (carry: CalendarCarry) => void
    onEnd: (carry: CalendarCarry) => void
    onCancel: () => void
    children: ReactNode
}

/** The view's drags, around its days. */
export function CalendarDragArea({ kind, onMove, onEnd, onCancel, children }: CalendarDragAreaProps) {
    const read = (event: DragMoveEvent | DragEndEvent): CalendarCarry | undefined => {
        const drag = dragData(event.active)
        if (drag?.kind !== kind || fromKeyboard(event)) return undefined
        const over = dragData(event.over)
        return {
            value: drag.value as CalendarCarry['value'],
            point: dragPoint(event),
            start: event.activatorEvent === null ? null : getEventCoordinates(event.activatorEvent),
            over: over?.kind === kind ? (over.value as number) : null,
        }
    }
    return (
        <DragDrop
            onDragMove={(event) => {
                const carry = read(event)
                if (carry !== undefined) onMove(carry)
            }}
            onDragOver={(event) => {
                const carry = read(event)
                if (carry !== undefined) onMove(carry)
            }}
            onDragEnd={(event) => {
                const carry = read(event)
                if (carry !== undefined) onEnd(carry)
                else onCancel()
            }}
            onDragCancel={onCancel}
        >
            {children}
        </DragDrop>
    )
}

export interface CalendarDayProps {
    kind: string
    index: number
    label: string
    children: (ref: (element: HTMLElement | null) => void) => ReactNode
}

/** A day as the place an event lands on. */
export function CalendarDay({ kind, index, label, children }: CalendarDayProps) {
    const { ref } = useDropTarget({ id: `${kind}:day:${String(index)}`, data: { kind, label, value: index } })
    return children(ref)
}

/** What an event's control spreads to be dragged. */
export interface CalendarEventDrag {
    ref: (element: HTMLElement | null) => void
    press: Pick<DragHandleProps, 'onPointerDown' | 'onTouchStart'>
    dragging: boolean
}

export interface CalendarDragEventProps {
    kind: string
    id: string
    day: number
    label: string
    preview: () => ReactNode
    disabled?: boolean
    children: (drag: CalendarEventDrag) => ReactNode
}

/** An event dragged as a whole to another day or time. */
export function CalendarDragEvent({ kind, id, day, label, preview, disabled = false, children }: CalendarDragEventProps) {
    const { ref, handle, dragging } = useDragItem({
        id: `${kind}:event:${id}:${String(day)}`,
        data: { kind, label, value: { id, day }, preview },
        disabled,
    })
    return children({ ref, press: { onPointerDown: handle.onPointerDown, onTouchStart: handle.onTouchStart }, dragging })
}
