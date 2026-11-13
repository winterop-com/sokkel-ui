import { createContext, useContext } from 'react'

/** What a cell can know of the table it is drawn in. */
export interface TableCell {
    /** The width of the table's own box, in pixels; 0 until it is measured. */
    width: number
    /** Whether the rows are stacked as cards. */
    stacked: boolean
    /**
     * The room the cell's own content has, in pixels: its column's track inside the cell's padding
     * in a table row, the value's part of its line on a stacked card. 0 until it is measured, and
     * outside a column's cell.
     */
    columnWidth: number
}

export const NO_CELL: TableCell = { width: 0, stacked: false, columnWidth: 0 }
export const TableCellContext = createContext<TableCell>(NO_CELL)

/**
 * The table a cell is drawn in: its box's width, whether its rows are stacked and the room its own
 * column gives it, so a cell can fit its content to that room, such as how many chips it shows
 * before a count of the rest. The room is measured once a column, never once a cell.
 */
export function useTableCell(): TableCell {
    return useContext(TableCellContext)
}
