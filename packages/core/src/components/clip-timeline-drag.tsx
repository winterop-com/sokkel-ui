/**
 * What `ClipTimeline` moves and trims its clips with, loaded the first time one is drawn with
 * `onClipsChange`: each clip and each of its edges as a thing on the drag engine.
 */
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, fromKeyboard, useDragItem, type DragHandleProps } from './DragDrop'

const KIND = 'clip-timeline'

const SILENT_DROP = { putBack: () => '' }

/** What a drag holds: the whole clip, or one of its edges. */
export type ClipGrip = 'move' | 'start' | 'end'

/** Where a carried clip is: the pointer now and where it was pressed. */
export interface ClipCarry {
    id: string
    grip: ClipGrip
    point: { x: number; y: number } | null
    start: { x: number; y: number } | null
}

export interface ClipDragAreaProps {
    onMove: (carry: ClipCarry) => void
    onEnd: (carry: ClipCarry) => void
    onCancel: () => void
    children: ReactNode
}

function read(event: DragMoveEvent | DragEndEvent): ClipCarry | undefined {
    const drag = dragData(event.active)
    if (drag?.kind !== KIND || fromKeyboard(event)) return undefined
    const value = drag.value as { id: string; grip: ClipGrip }
    return {
        id: value.id,
        grip: value.grip,
        point: dragPoint(event),
        start: event.activatorEvent === null ? null : getEventCoordinates(event.activatorEvent),
    }
}

/** The timeline's drags, around its tracks. */
export function ClipDragArea({ onMove, onEnd, onCancel, children }: ClipDragAreaProps) {
    return (
        <DragDrop
            // A drop lands on no target, yet the clip moved: the timeline says where itself.
            words={SILENT_DROP}
            onDragMove={(event) => {
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

export interface ClipDragProps {
    id: string
    grip: ClipGrip
    label: string
    /** What follows the pointer: the new start or length. */
    preview: () => ReactNode
    disabled?: boolean
    children: (drag: {
        ref: (element: HTMLElement | null) => void
        press: Pick<DragHandleProps, 'onPointerDown' | 'onTouchStart'>
    }) => ReactNode
}

/** A clip, or one of its edges, dragged. */
export function ClipDrag({ id, grip, label, preview, disabled = false, children }: ClipDragProps) {
    const { ref, handle } = useDragItem({
        id: `${KIND}:${grip}:${id}`,
        data: { kind: KIND, label, value: { id, grip }, preview, compact: true },
        disabled,
    })
    return children({ ref, press: { onPointerDown: handle.onPointerDown, onTouchStart: handle.onTouchStart } })
}
