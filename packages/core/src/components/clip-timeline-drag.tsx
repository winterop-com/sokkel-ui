/**
 * What `ClipTimeline` moves and trims its clips with, loaded the first time one is drawn with
 * `onClipsChange` or `onDrop`: each clip and each of its edges as a thing on the drag engine, and
 * each track as a place things from elsewhere in the same `DragDrop` land on.
 */
import type { DragEndEvent, DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, fromKeyboard, useDragItem, useDropTarget, type DragData, type DragHandleProps } from './DragDrop'

const KIND = 'clip-timeline'

/** The kind a track is as a place to drop on. */
const LANE = 'clip-timeline-lane'

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

/** Where a thing dragged from elsewhere is: what it carries, the pointer, and the track it is over. */
export interface ClipArrival {
    data: DragData
    /** The pointer, or null for a drag from the keyboard. */
    point: { x: number; y: number } | null
    /** The id of the track that takes it under the drag, by the engine's own reckoning. */
    over: string | null
}

export interface ClipDragAreaProps {
    onMove: (carry: ClipCarry) => void
    onEnd: (carry: ClipCarry) => void
    onCancel: () => void
    /** Hears a thing from elsewhere carried over the page, or null once it is let go or put back. */
    onArrive?: (arrival: ClipArrival | null) => void
    /** Hears a thing from elsewhere let go. */
    onLand?: (arrival: ClipArrival) => void
    children: ReactNode
}

function arrival(event: DragMoveEvent | DragOverEvent | DragEndEvent): ClipArrival | undefined {
    const drag = dragData(event.active)
    if (drag === undefined || drag.kind === KIND) return undefined
    const over = dragData(event.over)
    return {
        data: drag,
        point: fromKeyboard(event) ? null : dragPoint(event),
        over: over?.kind === LANE ? (over.value as { track: string }).track : null,
    }
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
export function ClipDragArea({ onMove, onEnd, onCancel, onArrive, onLand, children }: ClipDragAreaProps) {
    const hear = (event: DragMoveEvent | DragOverEvent) => {
        const carry = read(event)
        if (carry !== undefined) onMove(carry)
        const from = arrival(event)
        if (from !== undefined) onArrive?.(from)
    }
    return (
        <DragDrop
            // A drop lands on no target, yet the clip moved: the timeline says where itself.
            words={SILENT_DROP}
            onDragMove={hear}
            onDragOver={hear}
            onDragEnd={(event) => {
                const carry = read(event)
                if (carry !== undefined) onEnd(carry)
                else onCancel()
                const from = arrival(event)
                onArrive?.(null)
                if (from !== undefined) onLand?.(from)
            }}
            onDragCancel={() => {
                onCancel()
                onArrive?.(null)
            }}
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

export interface ClipLaneProps {
    /** Tells one timeline's tracks from another's. */
    scope: string
    track: string
    label: string
    /** Whether the track takes a thing dragged from elsewhere. */
    accepts: (drag: DragData) => boolean
    children: (ref: (element: HTMLElement | null) => void) => ReactNode
}

/** A track as the place a thing from elsewhere lands on. */
export function ClipLane({ scope, track, label, accepts, children }: ClipLaneProps) {
    const { ref } = useDropTarget({
        id: `${LANE}:${scope}:${track}`,
        data: { kind: LANE, label, value: { track }, accepts: (drag) => drag.kind !== KIND && accepts(drag) },
    })
    return children(ref)
}
