/**
 * What `DragSource` drags with, loaded the first time one is drawn with a drag: the thing on the
 * engine, inside the `DragDrop` the app draws around it and its targets.
 */
import type { ReactNode } from 'react'

import { useDragItem, useInDragDrop, type DragData } from './DragDrop'
import type { DragSourceState } from './DragSource'

export interface DragSourceItemProps {
    id: string
    drag: DragData
    children: (source: DragSourceState) => ReactNode
}

/** A thing on the drag engine; outside a `DragDrop` it does not drag. */
export function DragSourceItem({ id, drag, children }: DragSourceItemProps) {
    const scoped = useInDragDrop()
    const { ref, handle, dragging } = useDragItem({ id, data: drag, disabled: !scoped })
    if (!scoped) return children({ press: {}, dragging: false, enabled: false })
    return children({
        ref,
        press: { onPointerDown: handle.onPointerDown, onTouchStart: handle.onTouchStart },
        grip: handle,
        dragging,
        enabled: true,
    })
}
