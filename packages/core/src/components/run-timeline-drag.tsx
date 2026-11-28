'use client'

/**
 * What `RunTimeline` shifts a lane's upcoming runs with, loaded the first time one is drawn with
 * `onShift`: the runs as one thing on the drag engine, carried sideways along the lane.
 */
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, fromKeyboard, useDragItem, type DragHandleProps } from './DragDrop'

const KIND = 'run-timeline-shift'

const SILENT_DROP = { putBack: () => '' }

export interface ShiftDragAreaProps {
    /** Hears how far the pointer has moved sideways from where it was pressed, in pixels. */
    onMove: (pixels: number) => void
    onEnd: (pixels: number) => void
    onCancel: () => void
    children: ReactNode
}

/** How far sideways a pointer drag has carried the runs, or undefined for another drag. */
function carried(event: DragMoveEvent | DragEndEvent): number | undefined {
    if (dragData(event.active)?.kind !== KIND || fromKeyboard(event)) return undefined
    const point = dragPoint(event)
    const start = event.activatorEvent === null ? null : getEventCoordinates(event.activatorEvent)
    return point === null || start === null ? 0 : point.x - start.x
}

/** The timeline's drags, around its lanes. */
export function ShiftDragArea({ onMove, onEnd, onCancel, children }: ShiftDragAreaProps) {
    return (
        <DragDrop
            // A drop lands on no target, yet the runs moved: the timeline says how far itself.
            words={SILENT_DROP}
            onDragMove={(event) => {
                const pixels = carried(event)
                if (pixels !== undefined) onMove(pixels)
            }}
            onDragEnd={(event) => {
                const pixels = carried(event)
                if (pixels !== undefined) onEnd(pixels)
                else onCancel()
            }}
            onDragCancel={onCancel}
        >
            {children}
        </DragDrop>
    )
}

export interface ShiftDragProps {
    id: string
    label: string
    /** What follows the pointer: how far the runs move. */
    preview: () => ReactNode
    children: (drag: {
        ref: (element: HTMLElement | null) => void
        press: Pick<DragHandleProps, 'onPointerDown' | 'onTouchStart'>
    }) => ReactNode
}

/** A lane's upcoming runs, dragged as one. */
export function ShiftDrag({ id, label, preview, children }: ShiftDragProps) {
    const { ref, handle } = useDragItem({ id: `${KIND}:${id}`, data: { kind: KIND, label, preview, compact: true } })
    return children({ ref, press: { onPointerDown: handle.onPointerDown, onTouchStart: handle.onTouchStart } })
}
