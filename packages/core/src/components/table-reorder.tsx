/**
 * What `DataTable` draws its rows' drag with, loaded the first time a table with `onReorder` is
 * drawn: the rows dragged on the engine by their grips, and where a row lands among the others.
 */
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { createContext, useContext, useId, useRef, type ReactElement, type ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, useDragItem, useDropTarget, type DragHandleProps } from './DragDrop'

/** Where a dragged row would land: before or after the row with `key`. */
export interface RowDropAt {
    key: string
    part: 'before' | 'after'
}

/**
 * The place among `keys` a row lands at once it is taken out of its own, dropped before or after
 * the row `over`; undefined where it lands where it was.
 */
export function rowLanding(keys: readonly string[], moved: string, at: RowDropAt): { from: number; to: number } | undefined {
    const from = keys.indexOf(moved)
    const others = keys.filter((key) => key !== moved)
    const over = others.indexOf(at.key)
    if (from === -1 || over === -1) return undefined
    const to = over + (at.part === 'after' ? 1 : 0)
    return to === from ? undefined : { from, to }
}

interface Layer {
    kind: string
    ownKind: string
}

const LayerContext = createContext<Layer | null>(null)

export interface TableReorderAreaProps {
    /** The rows' keys, in the order given to the table. */
    keys: readonly string[]
    /** What a target outside the table takes its rows as; only the table takes them without it. */
    kind?: string
    onReorder: (from: number, to: number) => void
    /** Draws where a row would land, or nothing. */
    show: (at: RowDropAt | undefined) => void
    children: ReactNode
}

/** The table's rows' drags, around its rows. */
export function TableReorderArea({ keys, kind, onReorder, show, children }: TableReorderAreaProps) {
    const ownKind = useId()
    const aimed = useRef<RowDropAt | undefined>(undefined)
    const aim = (event: DragMoveEvent | DragEndEvent): RowDropAt | undefined => {
        const drag = dragData(event.active)
        const over = dragData(event.over)
        if (drag === undefined || over === undefined || event.over === null) return undefined
        if ((drag.value as { table?: string } | undefined)?.table !== ownKind) return undefined
        const target = over.value as { table?: string; key?: string } | undefined
        if (target?.table !== ownKind || target.key === undefined) return undefined
        const box = event.over.rect
        const point = dragPoint(event)
        const at: RowDropAt = { key: target.key, part: point !== null && point.y > box.top + box.height / 2 ? 'after' : 'before' }
        const moved = (drag.value as { key: string }).key
        return rowLanding(keys, moved, at) === undefined ? undefined : at
    }
    const follow = (event: DragMoveEvent) => {
        aimed.current = aim(event)
        show(aimed.current)
    }
    return (
        <LayerContext.Provider value={{ kind: kind ?? ownKind, ownKind }}>
            <DragDrop
                onDragMove={follow}
                onDragOver={follow}
                onDragEnd={(event) => {
                    const at = aimed.current
                    aimed.current = undefined
                    show(undefined)
                    const drag = dragData(event.active)
                    if (at === undefined || drag === undefined) return
                    const landed = rowLanding(keys, (drag.value as { key: string }).key, at)
                    if (landed !== undefined) onReorder(landed.from, landed.to)
                }}
                onDragCancel={() => {
                    aimed.current = undefined
                    show(undefined)
                }}
            >
                {children}
            </DragDrop>
        </LayerContext.Provider>
    )
}

/** What a row takes from its drag: its element, whether it is dragged now, and what its grip spreads. */
export interface TableRowDrag {
    ref?: (element: HTMLElement | null) => void
    'data-dragging'?: true
    grip?: DragHandleProps
}

export interface TableReorderRowProps {
    rowKey: string
    label: string
    row: unknown
    children: (drag: TableRowDrag & Record<string, unknown>) => ReactElement
    ref?: (element: HTMLElement | null) => void
}

/**
 * One row on the drag layer: dragged by its grip, and a place rows land. What a wrapper such as a
 * context menu's trigger hands it besides is passed on to the row.
 */
export function TableReorderRow({ rowKey, label, row, children, ref, ...passed }: TableReorderRowProps) {
    const layer = useContext(LayerContext)
    const kind = layer?.kind ?? ''
    const own = layer?.ownKind ?? ''
    const value = { table: own, key: rowKey, row }
    const item = useDragItem({
        id: `${own}:row:${rowKey}`,
        disabled: layer === null,
        data: {
            kind,
            label,
            value,
            preview: () => <div className="flex h-(--density-row) items-center px-3 text-sm">{label}</div>,
        },
    })
    const target = useDropTarget({
        id: `${own}:at:${rowKey}`,
        disabled: layer === null,
        data: { kind, label, value, accepts: (drag) => (drag.value as { table?: string } | undefined)?.table === own },
    })
    return children({
        ...passed,
        ref: (element) => {
            item.ref(element)
            target.ref(element)
            ref?.(element)
        },
        'data-dragging': item.dragging || undefined,
        grip: item.handle,
    })
}
