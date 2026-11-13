/**
 * What `ChannelList` puts a section's entries in order with, loaded the first time a list with a
 * section that has `onMove` is drawn: the entries as sortable items, dragged as a whole.
 */
import type { ReactNode } from 'react'

import type { DragHandleProps } from './DragDrop'
import { SortableGroup, SortableItem, useSortableHandle } from './Sortable'

export interface ChannelOrderProps {
    ids: readonly string[]
    label: (id: string) => string
    onMove: (from: number, to: number) => void
    children: ReactNode
}

/** A section's entries in the order they are dragged to. */
export function ChannelOrder({ ids, label, onMove, children }: ChannelOrderProps) {
    return (
        <SortableGroup ids={ids} label={label} onMove={onMove}>
            {children}
        </SortableGroup>
    )
}

/** What an entry's row spreads to drag: the press and touch that start it, and whether it is dragged now. */
export interface ChannelOrderPress {
    press: Pick<DragHandleProps, 'onPointerDown' | 'onTouchStart'>
    dragging: boolean
}

export interface ChannelOrderItemProps {
    id: string
    className?: string
    children: (drag: ChannelOrderPress) => ReactNode
}

/** One entry, its row dragged as a whole; the row keeps its own keys. */
export function ChannelOrderItem({ id, className, children }: ChannelOrderItemProps) {
    return (
        <SortableItem id={id} as="li" className={className}>
            <Press>{children}</Press>
        </SortableItem>
    )
}

function Press({ children }: { children: (drag: ChannelOrderPress) => ReactNode }) {
    const item = useSortableHandle()
    return children({
        press: { onPointerDown: item?.handle.onPointerDown, onTouchStart: item?.handle.onTouchStart },
        dragging: item?.dragging ?? false,
    })
}
