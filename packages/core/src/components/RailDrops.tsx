import {
    Children,
    isValidElement,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react'

import { cn } from '../lib/cn'
import { stepTo } from '../lib/reorder'
import { DragDrop, dragData, takes, useDragWords, useDropTarget, type DragData, type DragDropProps } from './DragDrop'
import type { RailDrop, RailGroup } from './Rail'
import { DragPartsContext } from './drag-parts'
import { SortableGroup, SortableItem, useSortableHandle } from './Sortable'

export type RailDropsProps = DragDropProps

/**
 * One drag scope over a shell whose rail takes drops: a `DragDrop` the page's parts and the rail
 * share, inside which a rail entry with a `drop` becomes a place things dragged from the page land
 * on, such as a song onto a playlist. The entry's row is ringed while a thing it `accepts` is over
 * it, and `onDrop` hears the thing let go there; from the keyboard the arrows carry a thing to the
 * row and Space or Enter drops it. Inside one, the entries of a rail group with `onReorder` drag
 * into another order by their rows, and move a place with Alt and the up and down arrows. Its handlers hear every drag in the scope, as a `DragDrop`'s do.
 * A rail outside one draws its entries without taking drops or dragging, and never loads the drag
 * engine.
 */
export function RailDrops({ children, ...props }: RailDropsProps) {
    const outer = useContext(DragPartsContext)
    const parts = useMemo(() => ({ ...outer, railRow: RailDropRow, railGroup: SortGroup }), [outer])
    return (
        <DragDrop {...props}>
            <DragPartsContext.Provider value={parts}>{children}</DragPartsContext.Provider>
        </DragDrop>
    )
}

/** A rail entry dragged by a press on its row. */
function SortEntry({ id, children }: { id: string; children: ReactNode }) {
    return (
        <SortableItem id={id} data-rail-entry={id} className="flex flex-col">
            <EntryPress>{children}</EntryPress>
        </SortableItem>
    )
}

/**
 * A rail group's entries in their order: dragged by their rows, and moved a place by Alt and the
 * up and down arrows on the focused one, the focus staying on it.
 */
function SortGroup({ group, children }: { group: RailGroup; children: ReactNode }) {
    return group.onReorder === undefined ? children : <Sorted group={group}>{children}</Sorted>
}

function Sorted({ group, children }: { group: RailGroup; children: ReactNode }) {
    const words = useDragWords()
    const ids = group.entries.map((entry) => entry.id)
    const label = (id: string) => group.entries.find((entry) => entry.id === id)?.label ?? id
    const onMove = (from: number, to: number) => group.onReorder?.(from, to)
    const box = useRef<HTMLDivElement>(null)
    const refocus = useRef<string | null>(null)
    const [said, setSaid] = useState('')
    useEffect(() => {
        const id = refocus.current
        if (id === null) return
        refocus.current = null
        box.current?.querySelector<HTMLElement>(`[data-rail-entry="${CSS.escape(id)}"] :is(a, button)`)?.focus()
    })
    const step = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
        const target = event.target as HTMLElement
        if (target.closest('[data-rail-children]') !== null) return
        const id = target.closest<HTMLElement>('[data-rail-entry]')?.dataset.railEntry
        const from = id === undefined ? -1 : ids.indexOf(id)
        const to = stepTo(from, event.key === 'ArrowUp' ? -1 : 1, ids.length)
        event.preventDefault()
        if (id === undefined || to === undefined) return
        refocus.current = id
        onMove(from, to)
        setSaid(words.placed(label(id), to + 1, ids.length))
    }
    return (
        <SortableGroup ids={ids} label={label} onMove={onMove}>
            <div ref={box} className="flex flex-col gap-1" onKeyDown={step}>
                {Children.map(children, (row) =>
                    isValidElement(row) && typeof row.key === 'string' ? <SortEntry id={row.key}>{row}</SortEntry> : row,
                )}
            </div>
            <span aria-live="polite" className="sr-only">
                {said}
            </span>
        </SortableGroup>
    )
}

/**
 * An entry's row as what a press drags, by the mouse or a held finger. Its keys stay the link's, so
 * Enter still follows it; the rail moves an entry from the keyboard with Alt and the arrows.
 */
function EntryPress({ children }: { children: ReactNode }) {
    const handle = useSortableHandle()?.handle
    return (
        <div ref={handle?.ref} onPointerDown={handle?.onPointerDown} onTouchStart={handle?.onTouchStart} className="flex flex-col">
            {children}
        </div>
    )
}

/** An entry's row as a drop target, handing a thing it takes to `onDrop` once let go there. */
function RailDropRow({ label, drop, children }: { label: string; drop: RailDrop; children: ReactNode }) {
    const id = `rail-drop:${useId()}`
    const data = useMemo<DragData>(() => ({ kind: id, label, accepts: drop.accepts }), [id, label, drop.accepts])
    return (
        <DragDrop
            onDragEnd={(event) => {
                if (event.over?.id !== id) return
                const drag = dragData(event.active)
                if (drag !== undefined && takes(data, drag)) drop.onDrop(drag)
            }}
        >
            <Target id={id} data={data}>
                {children}
            </Target>
        </DragDrop>
    )
}

function Target({ id, data, children }: { id: string; data: DragData; children: ReactNode }) {
    const { ref, over } = useDropTarget({ id, data })
    return (
        <div
            ref={ref}
            data-drop-over={over ? '' : undefined}
            className={cn('rounded-r-md', over && 'bg-hover outline-2 -outline-offset-2 outline-ring outline-solid')}
        >
            {children}
        </div>
    )
}
