import { Children, isValidElement, useContext, useMemo } from 'react'

import { DragDrop, type DragDropProps } from './DragDrop'
import { DragPartsContext, type DragParts } from './drag-parts'
import { SortableGrip, SortableGroup, SortableItem } from './Sortable'

export type RepeatedDragProps = DragDropProps

/**
 * One drag scope over a form whose repeated groups put their rows in order by drag: inside it, each
 * row of a `RepeatedGroup` with `onMove`, `SchemaForm`'s lists among them, has a grip that drags it
 * and moves it with the arrow keys. Its handlers hear every drag in the scope, as a `DragDrop`'s do.
 * A group outside one moves its rows by its Move buttons alone, and never loads the drag engine.
 */
export function RepeatedDrag({ children, ...props }: RepeatedDragProps) {
    const outer = useContext(DragPartsContext)
    const parts = useMemo(() => ({ ...outer, ...PARTS }), [outer])
    return (
        <DragDrop {...props}>
            <DragPartsContext.Provider value={parts}>{children}</DragPartsContext.Provider>
        </DragDrop>
    )
}

const PARTS: Partial<DragParts> = {
    repeatedRows: ({ rows, item, onMove, children }) => {
        const ids = rows.map((row) => row.key)
        return (
            <SortableGroup ids={ids} label={(id) => item(ids.indexOf(id))} onMove={onMove}>
                {Children.map(children, (row) =>
                    isValidElement(row) && typeof row.key === 'string' ? (
                        <SortableItem id={row.key} className="flex min-w-0 items-start gap-1">
                            <SortableGrip type="button" className="mt-3" />
                            <div className="flex min-w-0 flex-1 flex-col">{row}</div>
                        </SortableItem>
                    ) : (
                        row
                    ),
                )}
            </SortableGroup>
        )
    },
}
