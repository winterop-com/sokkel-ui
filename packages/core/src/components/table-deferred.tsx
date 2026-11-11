/**
 * What `DataTable` needs only after its first paint: Base UI's checkbox for its selection boxes, the
 * watch on its content cells that measures them again, and the lists its column and sort menus open
 * on. A table fetches it once it draws one of them, so a plain table never does.
 */
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

import type { DataSort, DataTableWords } from './DataTable'
import { IconButton } from './IconButton'
import { Checkbox, type CheckboxProps } from './ui/checkbox'
import {
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from './ui/dropdown-menu'

/**
 * Calls `check` when one of `cells` changes size or what it holds, and once as it starts, so a
 * change made before it started counts too. Returns the function that stops watching.
 */
export function watchCells(cells: readonly Element[], check: () => void): () => void {
    const sizes = new ResizeObserver(check)
    // A cell that fills its track keeps its size when what it holds grows, such as a count loaded later.
    const changes = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(check)
    for (const cell of cells) {
        sizes.observe(cell)
        changes?.observe(cell, { childList: true, subtree: true, characterData: true })
    }
    return () => {
        sizes.disconnect()
        changes?.disconnect()
    }
}

/**
 * The way down to the row with `key`: its top-level row and the keys of the rows above it, top
 * first, through the children `childRows` knows. Undefined when no row known has the key.
 */
export function rowPath<T>(
    rows: readonly T[],
    rowKey: (row: T) => string,
    childRows: ((row: T) => readonly T[] | undefined) | undefined,
    key: string,
): { top: T; above: string[] } | undefined {
    const find = (level: readonly T[], above: string[]): string[] | undefined => {
        for (const row of level) {
            const own = rowKey(row)
            if (own === key) return above
            const found = find(childRows?.(row) ?? [], [...above, own])
            if (found !== undefined) return found
        }
        return undefined
    }
    for (const top of rows) {
        const above = find([top], [])
        if (above !== undefined) return { top, above }
    }
    return undefined
}

export interface ColumnChoicesProps {
    /** The columns the menu lists, every one but the first. */
    columns: readonly { id: string; header: string; hideable?: boolean }[]
    hidden: ReadonlySet<string>
    onHiddenChange: (hidden: Set<string>) => void
    /** Moves a column a place up or down; no buttons to move without it. */
    onMove?: (id: string, by: -1 | 1) => void
    words: Pick<DataTableWords, 'moveUp' | 'moveDown'>
}

/** The column menu's list: a box to show or hide each column, and buttons to move it. */
export function ColumnChoices({ columns, hidden, onHiddenChange, onMove, words }: ColumnChoicesProps) {
    return (
        <ul className="flex flex-col">
            {columns.map((column, index) => (
                <li key={column.id} className="flex min-h-8 items-center gap-0.5 rounded-md pl-1.5 hover:bg-hover">
                    <label className="flex min-w-0 flex-1 cursor-default items-center gap-2 py-1">
                        <Checkbox
                            checked={!hidden.has(column.id)}
                            disabled={column.hideable === false}
                            onCheckedChange={(on) => {
                                const next = new Set(hidden)
                                if (on) next.delete(column.id)
                                else next.add(column.id)
                                onHiddenChange(next)
                            }}
                        />
                        <span className="min-w-0 truncate">{column.header}</span>
                    </label>
                    {onMove !== undefined && (
                        <>
                            <IconButton
                                label={words.moveUp(column.header)}
                                size="icon-xs"
                                side="left"
                                disabled={index === 0}
                                onClick={() => onMove(column.id, -1)}
                            >
                                <ChevronUpIcon />
                            </IconButton>
                            <IconButton
                                label={words.moveDown(column.header)}
                                size="icon-xs"
                                side="left"
                                disabled={index === columns.length - 1}
                                onClick={() => onMove(column.id, 1)}
                            >
                                <ChevronDownIcon />
                            </IconButton>
                        </>
                    )}
                </li>
            ))}
        </ul>
    )
}

export interface SortChoicesProps {
    /** The columns the rows sort by. */
    columns: readonly { id: string; header: string }[]
    sort: DataSort | null
    /** Sorts by a column, or not at all for `''`, keeping the direction. */
    onColumn: (column: string) => void
    onSortChange: (sort: DataSort) => void
    words: Pick<DataTableWords, 'sort' | 'unsorted' | 'ascending' | 'descending'>
}

/** The sort menu's items, for cards that have no column heads to sort by: the column, then the direction. */
export function SortChoices({ columns, sort, onColumn, onSortChange, words }: SortChoicesProps) {
    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel>{words.sort}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort?.column ?? ''} onValueChange={(value: string) => onColumn(value)}>
                    <DropdownMenuRadioItem value="">{words.unsorted}</DropdownMenuRadioItem>
                    {columns.map((column) => (
                        <DropdownMenuRadioItem key={column.id} value={column.id}>
                            {column.header}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            {sort !== null && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                        value={sort.direction}
                        onValueChange={(value: string) =>
                            onSortChange({ column: sort.column, direction: value === 'desc' ? 'desc' : 'asc' })
                        }
                    >
                        <DropdownMenuRadioItem value="asc">{words.ascending}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">{words.descending}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </>
            )}
        </>
    )
}

export { Checkbox, type CheckboxProps }
