/**
 * The tree's drag layer, which `Tree` loads the first time it is drawn with `onMove` or `onDrop`:
 * its rows dragged on the engine, and the places they and other parts' things land.
 */
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { createContext, useContext, useId, useRef, type ReactElement, type ReactNode } from 'react'

import { DragDrop, dragData, dragPoint, useDragItem, useDropTarget, type DragData } from './DragDrop'
import {
    canMoveTo,
    isBranch,
    treePlace,
    treeTarget,
    treeTopTarget,
    dropPart,
    type TreeDropPart,
    type TreeLoads,
    type TreeNode,
    type TreeOrder,
    type TreeRow,
    type TreeRowDragProps,
    type TreeTarget,
} from './Tree'

/** Where a drag would land, for the tree to draw: a row and its part, or the top level's end (`id` null). */
export interface TreeDropAt {
    id: string | null
    part: TreeDropPart
}

/** What the top level's target carries in place of a row. */
const TOP = 'top'

interface Layer {
    kind: string
    accepts: (drag: DragData) => boolean
}

const LayerContext = createContext<Layer | null>(null)

export interface TreeDragAreaProps {
    nodes: readonly TreeNode[]
    loads: TreeLoads
    label: string
    /** While a query narrows the tree, a branch is only a place beside, never opened by a hold. */
    searching: boolean
    onMove?: (id: string, into: string | null, index: number) => void
    canMove?: (id: string, into: string | null) => boolean
    onDrop?: (drag: DragData, into: string | null, index: number) => void
    accepts?: (drag: DragData) => boolean
    nodeOf?: (drag: DragData) => string | undefined
    order?: TreeOrder
    /** Draws where a drag would land, or nothing. */
    show: (at: TreeDropAt | undefined) => void
    /** Opens the closed branch a row is held inside after a moment; null lets go. */
    hold: (id: string | null) => void
    children: (root: (element: HTMLElement | null) => void) => ReactNode
}

/** The tree's own drags and the drops it takes, around its list, which is the top level's target. */
export function TreeDragArea({
    nodes,
    loads,
    label,
    searching,
    onMove,
    canMove,
    onDrop,
    accepts,
    nodeOf,
    order,
    show,
    hold,
    children,
}: TreeDragAreaProps) {
    const kind = useId()
    const takes = (drag: DragData) => drag.kind === kind || ((onDrop !== undefined || nodeOf !== undefined) && (accepts?.(drag) ?? true))
    /** The tree's node a drag moves: a row of its own, or the node a thing from outside stands for. */
    const moving = (drag: DragData): string | null => {
        if (drag.kind === kind) return (drag.value as TreeNode).id
        const id = nodeOf?.(drag)
        return id !== undefined && treePlace(nodes, id, loads) !== null ? id : null
    }
    const aimed = useRef<{ at: TreeDropAt; target: TreeTarget } | undefined>(undefined)

    const aim = (event: DragMoveEvent | DragEndEvent): { at: TreeDropAt; target: TreeTarget } | undefined => {
        const drag = dragData(event.active)
        const over = dragData(event.over)
        if (drag === undefined || over?.kind !== kind || event.over === null || !takes(drag)) return undefined
        const id = moving(drag)
        if (id === null && onDrop === undefined) return undefined
        let at: TreeDropAt
        let target: TreeTarget | undefined
        if (over.value === TOP) {
            at = { id: null, part: 'inside' }
            target = treeTopTarget(nodes, id, loads, order)
        } else {
            const row = over.value as TreeRow
            const point = dragPoint(event)
            const box = event.over.rect
            const part = dropPart(point?.y ?? box.top + box.height / 2, box.top, box.height, !searching && isBranch(row.node, loads))
            at = { id: row.node.id, part }
            target = treeTarget(nodes, id, row, part, loads, order)
        }
        if (target === undefined) return undefined
        if (id !== null && (!canMoveTo(nodes, id, target, loads, order) || canMove?.(id, target.into) === false)) return undefined
        return { at, target }
    }
    const follow = (event: DragMoveEvent) => {
        const next = aim(event)
        aimed.current = next
        show(next?.at)
        hold(next?.at.part === 'inside' && next.at.id !== null ? next.at.id : null)
    }
    const done = () => {
        aimed.current = undefined
        show(undefined)
        hold(null)
    }
    const top = useDropTarget({ id: `${kind}:top`, data: { kind, label, value: TOP, accepts: takes } })

    return (
        <LayerContext.Provider value={{ kind, accepts: takes }}>
            <DragDrop
                onDragMove={follow}
                onDragOver={follow}
                onDragEnd={(event) => {
                    const landed = aimed.current ?? aim(event)
                    done()
                    const drag = dragData(event.active)
                    if (landed === undefined || drag === undefined) return
                    const id = moving(drag)
                    if (id !== null) onMove?.(id, landed.target.into, landed.target.index)
                    else onDrop?.(drag, landed.target.into, landed.target.index)
                }}
                onDragCancel={done}
            >
                {children(top.ref)}
            </DragDrop>
        </LayerContext.Provider>
    )
}

export interface TreeDragRowProps extends Omit<TreeRowDragProps, 'data-dragging'> {
    row: TreeRow
    /** Whether the row itself drags; every row is a place to drop on. */
    movable: boolean
    children: (props: TreeRowDragProps) => ReactElement
}

/**
 * One row on the drag layer: dragged by a press anywhere on it, and a place things land. What a
 * wrapper such as a context menu's trigger hands it besides is passed on to the row.
 */
export function TreeDragRow({ row, movable, children, ref, onPointerDown, onTouchStart, ...passed }: TreeDragRowProps) {
    const layer = useContext(LayerContext)
    const kind = layer?.kind ?? ''
    const Icon = row.node.icon
    const item = useDragItem({
        id: `${kind}:row:${row.node.id}`,
        disabled: !movable || layer === null,
        data: {
            kind,
            label: row.node.label,
            value: row.node,
            preview: () => (
                <span className="flex h-8 items-center gap-1.5 px-2.5 text-sm">
                    {Icon !== undefined && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    {row.node.label}
                </span>
            ),
        },
    })
    const target = useDropTarget({
        id: `${kind}:on:${row.node.id}`,
        disabled: layer === null,
        data: { kind, label: row.node.label, value: row, accepts: layer?.accepts },
    })
    return children({
        ...passed,
        ref: (element) => {
            item.ref(element)
            target.ref(element)
            ref?.(element)
        },
        onPointerDown: (event) => {
            onPointerDown?.(event)
            if (movable) item.handle.onPointerDown?.(event)
        },
        onTouchStart: (event) => {
            onTouchStart?.(event)
            if (movable) item.handle.onTouchStart?.(event)
        },
        'data-dragging': item.dragging || undefined,
    })
}
