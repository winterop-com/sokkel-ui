import { createContext, type ComponentType, type ReactNode } from 'react'

import type { RailDrop, RailGroup } from './Rail'

/**
 * What the parts an engine-free page draws, the rail and a form's repeated group, drag with, handed
 * them by the scope the app draws around them (`RailDrops`, `RepeatedDrag`), so the parts never
 * import the drag engine themselves. A part finds none of its own outside such a scope.
 */
export interface DragParts {
    /** A rail entry's row as a place things land. */
    railRow?: ComponentType<{ label: string; drop: RailDrop; children: ReactNode }>
    /**
     * A rail group's entries, drawn as its `children` in the order of its `entries` and keyed by their
     * ids: put in order by drag and from the keyboard when the group has `onReorder`, else as they are.
     */
    railGroup: ComponentType<{ group: RailGroup; children: ReactNode }>
    /**
     * A repeated group's rows, drawn as its `children` keyed by their ids: each with a grip before it
     * that drags it and moves it from the keyboard inside a `RepeatedDrag`, else as they are.
     */
    repeatedRows: ComponentType<{
        rows: readonly { key: string }[]
        /** What a row is called, by its place. */
        item: (index: number) => string
        onMove: (from: number, to: number) => void
        children: ReactNode
    }>
}

/** A part's things as they are, outside a scope that drags them. */
const asTheyAre = ({ children }: { children: ReactNode }) => children

export const DragPartsContext = createContext<DragParts>({ railGroup: asTheyAre, repeatedRows: asTheyAre })
