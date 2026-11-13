import { useId, useMemo, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { DragDrop, dragData, takes, useDropTarget, type DragData, type DragDropProps } from './DragDrop'
import type { RailDrop } from './Rail'
import { RailDropRows } from './shell-context'

export type RailDropsProps = DragDropProps

/**
 * One drag scope over a shell whose rail takes drops: a `DragDrop` the page's parts and the rail
 * share, inside which a rail entry with a `drop` becomes a place things dragged from the page land
 * on, such as a song onto a playlist. The entry's row is ringed while a thing it `accepts` is over
 * it, and `onDrop` hears the thing let go there; from the keyboard the arrows carry a thing to the
 * row and Space or Enter drops it. Its handlers hear every drag in the scope, as a `DragDrop`'s do.
 * A rail outside one draws its entries without taking drops, and never loads the drag engine.
 */
export function RailDrops({ children, ...props }: RailDropsProps) {
    return (
        <DragDrop {...props}>
            <RailDropRows.Provider value={RailDropRow}>{children}</RailDropRows.Provider>
        </DragDrop>
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
