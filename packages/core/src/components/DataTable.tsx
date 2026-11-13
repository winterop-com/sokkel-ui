import { IconButton } from './IconButton'
import {
    ArrowDownIcon,
    ArrowUpDownIcon,
    ArrowUpIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    Columns3Icon,
    EllipsisIcon,
    GripVerticalIcon,
    LayoutGridIcon,
    TableIcon,
} from 'lucide-react'
import {
    Fragment,
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { cn } from '../lib/cn'
import { stepTo } from '../lib/reorder'
import type { DragHandleProps } from './DragDrop'
import { ResizeHandle } from './ResizeHandle'
import { NO_CELL, TableCellContext } from './table-cell'
import { ListingBar } from './ListingBar'
import { SelectionBar } from './SelectionBar'
import { Button } from './ui/button'
import { CHECKBOX, CHECKBOX_INDICATOR, CheckboxMarks } from './ui/checkbox-look'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Skeleton } from './ui/skeleton'
import { Spinner } from './ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { TABLE_HEAD_ROW, TABLE_HEAD_TEXT, columnBands, columnName, columnOrder } from '../lib/table'
import type { CellAt, EditedValue, EditOption, EditorKind, EditValue } from '../lib/edit'
import type { CellEdit, CellFocus, OpenCell, TableEditing, TableEditingContext } from './table-editing'
import type { RowDropAt, TableRowDrag } from './table-reorder'

export { useTableCell, type TableCell } from './table-cell'

export type { CellAt, CellFocus, EditedValue, EditOption, EditorKind, EditValue, TableEditing }

/** How one kind of editor reads and saves a column's cells. */
type CellEditing<T, K extends EditorKind, V = EditedValue<K>> = {
    /** Which control edits a cell: a line of text, several lines, a number, a date (`YYYY-MM-DD`), a time of day (`HH:mm`), or one of `options`. */
    editor: K
    /** The value a cell's editor starts from. */
    value: (row: T) => V
    /**
     * Saves one cell's new value. A promise holds the cell pending, the new value shown with a
     * spinner, until it settles; a rejection marks the cell with its message and keeps what was
     * typed, so opening the cell again goes on from it.
     */
    save: (row: T, value: V) => void | Promise<void>
    /** Checks a value before it is saved: a message refuses it and keeps the editor open. */
    validate?: (value: V, row: T) => string | null | undefined
    /** Whether a row's cell may be edited; every row's by default. */
    enabled?: (row: T) => boolean
    /** How a value being saved, or refused, is drawn in its cell; its text, figures or option's label by default. */
    display?: (value: V, row: T) => ReactNode
}

/** How a column's cells are edited: the editor, the value it starts from, how a value is checked, and the save. */
export type DataCellEdit<T> =
    | (CellEditing<T, 'text'> & { options?: undefined })
    | (CellEditing<T, 'multiline'> & { options?: undefined })
    | (CellEditing<T, 'number'> & { options?: undefined })
    | (CellEditing<T, 'date'> & {
          options?: undefined
          /** The day the date editor's calendar starts its weeks on, the app's: 1 for Monday (the default), 0 for Sunday. */
          weekStartsOn?: 0 | 1
      })
    | (CellEditing<T, 'time'> & { options?: undefined })
    | (CellEditing<T, 'select'> & {
          /** The choices, the same for every row or a row's own. */
          options: readonly EditOption[] | ((row: T) => readonly EditOption[])
      })

/** A color a cell is filled with; see `DataColumn.fill`. */
export interface CellFill {
    color: string
    solid?: boolean
}

/** One column: its name, how wide it is, how a row draws its cell, and how it sorts. */
export interface DataColumn<T> {
    id: string
    /** The column's name, in its head and in the column menu. */
    header: string
    /**
     * What the column's head draws in place of `header`, such as a name with a mark or a second line
     * under it; `header` still names the column in the menu, a stacked card and its resize handle.
     * A head of several lines makes the head row as tall as it needs.
     */
    head?: ReactNode
    /**
     * The band the column sits in, such as one option of a cut whose other options are the columns
     * under it. Neighboring columns with the same band are drawn under one head above theirs, a rule
     * marking where each band starts; a stacked card names the column by its band and its header.
     */
    band?: string
    /**
     * A CSS grid track (`8rem`, `minmax(12rem,1fr)`), or `content`: as wide as the widest of its
     * head and the cells drawn, up to `maxWidth`, the other columns sharing what is left. Its cells
     * are measured at their own width, again once fonts load or a cell is cut short, and the width
     * counts toward when the table stacks. A dragged width wins over either.
     */
    width: string
    /** The widest a `content` column grows, as a CSS length; 20rem by default. */
    maxWidth?: string
    /**
     * The narrowest a `content` column is drawn, as a CSS length, counted toward the table's least
     * width before its cells are measured too: room for a heading whose own width says too little.
     */
    minWidth?: string
    cell: (row: T) => ReactNode
    align?: 'start' | 'center' | 'end'
    /**
     * A color under a row's cell in this column, in the table's cells: a CSS color such as a token's
     * variable, mixed into the table's ground, or at full strength with the ink for fills when `solid`.
     */
    fill?: (row: T) => CellFill | undefined
    /** The value the column sorts by; a column without one does not sort. */
    sortValue?: (row: T) => string | number
    /** Whether the column menu may hide it. The first column never hides. */
    hideable?: boolean
    /** Whether its head's right edge resizes it, when the table's columns resize. */
    resizable?: boolean
    /** The narrowest a drag takes it, in pixels. */
    minSize?: number
    /** What the column says for a group of rows, in the group's head: a sum, a range, a count. */
    aggregate?: (rows: readonly T[]) => ReactNode
    /**
     * How the column shows once the table stacks its rows as cards on a narrow box: `line` (the
     * default) a line of its own, `primary` the value in body text under the title over up to
     * `stackLines` lines, `secondary` among the muted facts that share the card's last line, `lead`
     * before the title, such as a box that marks a row done, and `none` not at all. The first
     * column that is not `lead` is the title.
     */
    stack?: 'lead' | 'line' | 'primary' | 'secondary' | 'none'
    /** The most lines a `primary` value takes in a stacked card; 2 by default. */
    stackLines?: number
    /**
     * How the title column draws as a stacked card's title: `line` (the default) keeps it to one line,
     * cut short; `free` draws the cell as it is, as tall as it needs, so a name can stand over its code
     * and the code is never cut. The cell reads `stacked` from `useTableCell` to choose its shape.
     */
    stackTitle?: 'line' | 'free'
    /** Whether the column's line in a stacked card starts with its name; without it the value takes the whole line. */
    stackLabel?: boolean
    /**
     * Makes the column's cells editable, in a table given `editing`: the editor, the value it starts
     * from and the save, which runs for each cell on its own. In a stacked card the column's line is a
     * field to edit in.
     */
    edit?: DataCellEdit<T>
}

/** One thing a row's menu offers, or a line between groups of them. */
export type DataAction =
    | {
          id: string
          label: string
          icon?: ReactNode
          destructive?: boolean
          disabled?: boolean
          /** Also drawn as a button on the row, shown while the pointer is over it. Needs an icon. */
          inline?: boolean
          onSelect: () => void
      }
    | { id: string; separator: true }

/** A row for `DataTable` to bring into view by its key, opening it when `open`. */
export interface DataReveal {
    key: string
    open?: boolean
}

export interface DataSort {
    column: string
    direction: 'asc' | 'desc'
}

/** The controls a cell may hold whose press is their own, never the row's open. */
const CELL_CONTROL = 'button, a[href], input, select, textarea, label, [role="switch"], [role="checkbox"], [role="combobox"]'

/** The words a data table says, in English unless an app passes its own. */
export interface DataTableWords {
    columns: string
    actions: string
    tableView: string
    gridView: string
    sort: string
    unsorted: string
    ascending: string
    descending: string
    rows: (count: number) => string
    /** The bar's count while more rows may still load. */
    loaded: (count: number) => string
    /** The pager's account of the rows shown: `1–50 of 10,000`. */
    range: (from: number, to: number, total: number) => string
    page: (page: number, pages: number) => string
    perPage: string
    firstPage: string
    previousPage: string
    nextPage: string
    lastPage: string
    selected: (count: number) => string
    clear: string
    /** The selection bar's accessible name. */
    selection: string
    selectAll: string
    /** The bar's offer, once a page is selected, to select every row on every page. */
    selectEvery: (count: number) => string
    allSelected: (count: number) => string
    selectRow: string
    expand: string
    collapse: string
    /** The button that loads more rows, with `loadMore="button"`: how many the next load brings, when the app says. */
    loadMore: (count: number | undefined) => string
    /** A branch's control while its children load. */
    loadingChildren: string
    /** A column's resize handle. */
    resize: (column: string) => string
    /** The column menu's buttons that move a column earlier or later in the table. */
    moveUp: (column: string) => string
    moveDown: (column: string) => string
    empty: string
    /** A group head's box, which selects every row in the group. */
    selectGroup: string
    /** A group head's fold button, by whether the group is folded now. */
    foldGroup: (folded: boolean) => string
    /** A group head's count of its rows: `12`, or `12 runs`. */
    groupCount: (count: number) => string
    /** A cell's spinner while its save runs. */
    saving: string
    /** What a refused save says when the app's error carries no message. */
    saveFailed: string
    /** What a number cell says of text that is not a number. */
    notNumber: string
    /** A row's grip, with `onReorder`: what it moves. */
    moveRow: (row: string) => string
    /** Said to a screen reader once a row is moved from the keyboard, its new place counted from 1. */
    rowMoved: (row: string, place: number, count: number) => string
}

const WORDS: DataTableWords = {
    columns: 'Columns',
    actions: 'Actions',
    tableView: 'Table',
    gridView: 'Grid',
    sort: 'Sort',
    unsorted: 'As given',
    ascending: 'Ascending',
    descending: 'Descending',
    rows: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'row' : 'rows'}`,
    loaded: (count) => `${count.toLocaleString('en-US')} loaded`,
    range: (from, to, total) => `${from.toLocaleString('en-US')}–${to.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`,
    page: (page, pages) => `Page ${page.toLocaleString('en-US')} of ${pages.toLocaleString('en-US')}`,
    perPage: 'Rows per page',
    firstPage: 'First page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    lastPage: 'Last page',
    selected: (count) => `${count.toLocaleString('en-US')} selected`,
    clear: 'Clear',
    selection: 'Selection',
    selectAll: 'Select all rows',
    selectEvery: (count) => `Select all ${count.toLocaleString('en-US')}`,
    allSelected: (count) => `All ${count.toLocaleString('en-US')} selected`,
    selectRow: 'Select row',
    expand: 'Expand',
    collapse: 'Collapse',
    loadMore: (count) => (count === undefined ? 'Load more' : `Load ${count.toLocaleString('en-US')} more`),
    loadingChildren: 'Loading',
    resize: (column) => `Resize ${column}`,
    moveUp: (column) => `Move ${column} up`,
    moveDown: (column) => `Move ${column} down`,
    empty: 'Nothing here.',
    selectGroup: 'Select group',
    foldGroup: (folded) => (folded ? 'Show group' : 'Hide group'),
    groupCount: (count) => count.toLocaleString('en-US'),
    saving: 'Saving',
    saveFailed: 'Could not save',
    notNumber: 'Enter a number',
    moveRow: (row) => `Move ${row}`,
    rowMoved: (row, place, count) => `${row} moved to ${place.toLocaleString('en-US')} of ${count.toLocaleString('en-US')}`,
}

/** A row as drawn: where it sits in the tree, and whether it has children and shows them. */
export interface FlatRow<T> {
    row: T
    key: string
    depth: number
    parent: string | undefined
    branch: boolean
    open: boolean
    /** Open, with children that are not known yet. */
    waiting: boolean
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** The rows in a column's order, stable, so rows that compare equal keep the order they came in. */
export function sortRows<T>(rows: readonly T[], value: (row: T) => string | number, direction: 'asc' | 'desc'): T[] {
    const keyed = rows.map((row, index) => ({ row, index, value: value(row) }))
    const sign = direction === 'asc' ? 1 : -1
    keyed.sort((a, b) => {
        const order =
            typeof a.value === 'number' && typeof b.value === 'number'
                ? a.value - b.value
                : collator.compare(String(a.value), String(b.value))
        return sign * order || a.index - b.index
    })
    return keyed.map((entry) => entry.row)
}

/** The rows as drawn, top to bottom: each level in order, an open row's children right under it. */
export function flattenRows<T>({
    rows,
    rowKey,
    childRows,
    hasChildren,
    hasDetail,
    expanded,
    order,
}: {
    rows: readonly T[]
    rowKey: (row: T) => string
    childRows?: (row: T) => readonly T[] | undefined
    /** Whether a row whose children are not known yet has any. */
    hasChildren?: (row: T) => boolean
    /** Whether a row has a detail of its own to draw under it, which opens it as children do. */
    hasDetail?: (row: T) => boolean
    expanded: ReadonlySet<string>
    order: (rows: readonly T[]) => readonly T[]
}): FlatRow<T>[] {
    const flat: FlatRow<T>[] = []
    const walk = (level: readonly T[], depth: number, parent: string | undefined) => {
        for (const row of order(level)) {
            const key = rowKey(row)
            const children = childRows?.(row)
            const lazy = children === undefined && hasChildren?.(row) === true
            const branch = (children === undefined ? lazy : children.length > 0) || hasDetail?.(row) === true
            const open = branch && expanded.has(key)
            flat.push({ row, key, depth, parent, branch, open, waiting: open && lazy })
            if (open && children !== undefined) walk(children, depth + 1, key)
        }
    }
    walk(rows, 0, undefined)
    return flat
}

/** The top-level rows that share a group key, in the order they came. */
export interface RowGroup<T> {
    key: string
    rows: readonly T[]
}

/** A group's head as drawn: its rows, whether it is folded, and its rows as drawn when it is not. */
export interface GroupHead<T> extends RowGroup<T> {
    head: true
    folded: boolean
    entries: FlatRow<T>[]
}

/** A line of a grouped table: a group's head or a row. */
export type TableLine<T> = GroupHead<T> | FlatRow<T>

export function isGroupHead<T>(line: TableLine<T>): line is GroupHead<T> {
    return 'head' in line
}

/**
 * The rows gathered by their group key: the keys `order` names first, in its order, then the rest
 * in the order their first row came. Rows keep their order inside a group.
 */
export function groupRows<T>(rows: readonly T[], groupOf: (row: T) => string, order: readonly string[] = []): RowGroup<T>[] {
    const byKey = new Map<string, T[]>()
    for (const row of rows) {
        const key = groupOf(row)
        const list = byKey.get(key)
        if (list === undefined) byKey.set(key, [row])
        else list.push(row)
    }
    const rank = (key: string) => {
        const at = order.indexOf(key)
        return at < 0 ? order.length : at
    }
    // Map keeps first-appearance order; a stable sort puts the named keys ahead of it.
    return [...byKey.entries()].map(([key, list]) => ({ key, rows: list })).sort((a, b) => rank(a.key) - rank(b.key))
}

/**
 * A grouped table's lines, top to bottom: each group's head, then its rows as `flatten` draws them
 * unless it is folded; and the rows alone, for selection and the keyboard.
 */
export function groupLines<T>(
    groups: readonly RowGroup<T>[],
    folded: ReadonlySet<string>,
    flatten: (rows: readonly T[]) => FlatRow<T>[],
): { heads: GroupHead<T>[]; lines: TableLine<T>[]; rows: FlatRow<T>[] } {
    const heads: GroupHead<T>[] = []
    const lines: TableLine<T>[] = []
    const rows: FlatRow<T>[] = []
    for (const group of groups) {
        const shut = folded.has(group.key)
        const entries = shut ? [] : flatten(group.rows)
        const head: GroupHead<T> = { ...group, head: true, folded: shut, entries }
        heads.push(head)
        lines.push(head, ...entries)
        rows.push(...entries)
    }
    return { heads, lines, rows }
}

/** A row's key and every key under it. */
export function branchKeys<T>(row: T, rowKey: (row: T) => string, childRows?: (row: T) => readonly T[] | undefined): string[] {
    const keys: string[] = []
    const walk = (node: T) => {
        keys.push(rowKey(node))
        for (const child of childRows?.(node) ?? []) walk(child)
    }
    walk(row)
    return keys
}

/** The key of every row with children, at any depth: what opening every branch opens. */
export function treeBranchKeys<T>(
    rows: readonly T[],
    rowKey: (row: T) => string,
    childRows: (row: T) => readonly T[] | undefined,
): Set<string> {
    const keys = new Set<string>()
    const walk = (level: readonly T[]) => {
        for (const row of level) {
            const children = childRows(row)
            if (children === undefined || children.length === 0) continue
            keys.add(rowKey(row))
            walk(children)
        }
    }
    walk(rows)
    return keys
}

/**
 * A tree cut down to what matches: every matching row, its whole branch, and the rows on the way
 * to it. `childRows` gives the cut tree's children and `open` the branches that lead to a match,
 * so passing both to the table shows every match. With nothing to match, the tree is given back.
 */
export function findInTree<T>({
    rows,
    rowKey,
    childRows,
    match,
}: {
    rows: readonly T[]
    rowKey: (row: T) => string
    childRows: (row: T) => readonly T[] | undefined
    /** Whether a row matches; undefined matches nothing and leaves the tree as it is. */
    match: ((row: T) => boolean) | undefined
}): { rows: readonly T[]; childRows: (row: T) => readonly T[] | undefined; open: Set<string> } {
    if (match === undefined) return { rows, childRows, open: new Set() }
    const keep = new Set<string>()
    const whole = new Set<string>()
    const open = new Set<string>()
    // A row inside a match keeps all its children; a match deeper down still opens the way to it.
    const walk = (row: T, inside: boolean): boolean => {
        const key = rowKey(row)
        const hit = match(row)
        if (inside || hit) whole.add(key)
        let found = false
        for (const child of childRows(row) ?? []) found = walk(child, inside || hit) || found
        if (found) open.add(key)
        if (hit || found) keep.add(key)
        return hit || found
    }
    for (const row of rows) walk(row, false)
    return {
        rows: rows.filter((row) => keep.has(rowKey(row))),
        childRows: (row) => {
            const children = childRows(row)
            return children === undefined || whole.has(rowKey(row)) ? children : children.filter((child) => keep.has(rowKey(child)))
        },
        open,
    }
}

/** The columns in the order drawn, by `columnOrder`: those `order` names first, the first column staying first. */
export function orderColumns<C extends { id: string }>(columns: readonly C[], order: readonly string[]): C[] {
    if (order.length === 0) return [...columns]
    const byId = new Map(columns.map((column) => [column.id, column]))
    return columnOrder(
        order,
        columns.map((column) => column.id),
    ).flatMap((id) => byId.get(id) ?? [])
}

/** The column ids in order after moving one a place earlier or later; the first column never moves, nor does another past it. */
export function movedColumn(columns: readonly { id: string }[], id: string, by: -1 | 1): string[] {
    const ids = columns.map((column) => column.id)
    const at = ids.indexOf(id)
    const to = at + by
    if (at < 1 || to < 1 || to >= ids.length) return ids
    ;[ids[at], ids[to]] = [ids[to], ids[at]]
    return ids
}

/**
 * The columns of a stacked row by where they go: the leads before the title, the title (the first
 * column that is not a lead), the primary values under it, the labeled lines, and the facts that
 * share one quiet line. Compact, every line is a fact.
 */
export function stackColumns<C extends { stack?: DataColumn<unknown>['stack'] }>(shown: readonly C[], layout: 'labeled' | 'compact') {
    const title = shown.find((column) => column.stack !== 'lead')
    const rest = shown.filter((column) => column !== title && column.stack !== 'lead' && column.stack !== 'none')
    const line = (column: C) => (column.stack ?? 'line') === 'line'
    return {
        lead: shown.filter((column) => column.stack === 'lead'),
        title,
        primary: rest.filter((column) => column.stack === 'primary'),
        lines: layout === 'compact' ? [] : rest.filter(line),
        facts: rest.filter((column) => column.stack === 'secondary' || (layout === 'compact' && line(column))),
    }
}

/** The room a row's grip takes at the start of its first cell, with `onReorder`. */
const GRIP = '1.375rem'

/**
 * A track widened by `by` at its floor: a length grows by it, a `minmax` floor grows by it, and a
 * fraction or `auto` is left, having room to give.
 */
export function widenTrack(width: string, by: string): string {
    const range = /^minmax\(\s*([^,]+?)\s*,(.*)\)$/.exec(width)
    if (range !== null) return `minmax(calc(${range[1]} + ${by}),${range[2]})`
    return /^\d*\.?\d+(px|rem|em|ch)$/.test(width) ? `calc(${width} + ${by})` : width
}

/** The least width of a grid track: its own length, a `minmax` floor, or nothing for a fraction or `auto`. */
function trackMin(width: string): string {
    const floor = /^minmax\(\s*([^,]+?)\s*,/.exec(width)?.[1] ?? width
    return /^\d*\.?\d+(px|rem|em|ch)$/.test(floor) ? floor : '0px'
}

/**
 * A `content` column's track once its cells are measured: the widest cell (`need`, in pixels), no
 * narrower than its `minWidth` and no wider than its `maxWidth`. With no measure yet it is the floor.
 */
export function contentTrack(need: number | undefined, column: { minWidth?: string; maxWidth?: string }): string {
    const most = column.maxWidth ?? CONTENT_MAX
    const at = need === undefined ? undefined : `${String(need)}px`
    const floor = column.minWidth === undefined ? at : at === undefined ? column.minWidth : `max(${at}, ${column.minWidth})`
    return floor === undefined ? '0px' : `min(${floor}, ${most})`
}

/**
 * The least width of each drawn column, which the row's least width adds up: a dragged width, a
 * `content` column's measured need (kept while the rows are stacked, so it still counts toward
 * stacking), or a track's own floor.
 */
export function columnLeast(
    column: { id: string; width: string; minWidth?: string; maxWidth?: string },
    dragged: number | undefined,
    needs: Readonly<Record<string, number>>,
): string {
    if (dragged !== undefined) return `${String(dragged)}px`
    return column.width === 'content' ? contentTrack(needs[column.id], column) : trackMin(column.width)
}

/** The width a table stacks below when it names none: a phone's for a list, which also stacks once its columns no longer fit, and a little wider for a table. */
export function stackDefault(auto: boolean): number {
    return auto ? 480 : 576
}

/**
 * Whether the rows stack as cards: below `stackBelow` (`stackWidth`, in pixels) once the columns'
 * least width (`columnsWidth`) no longer fits too, or with `minWidth="auto"` below `stackBelow` or
 * once the columns no longer fit, whichever is wider, so a list never scrolls sideways.
 */
export function stacksAt(width: number, stackWidth: number, columnsWidth: number, auto: boolean): boolean {
    return width > 0 && width < (auto ? Math.max : Math.min)(stackWidth, columnsWidth)
}

/** The part of a document's fonts a table listens to: a promise when all have loaded, and an event for each load. */
export interface FontLoads {
    ready: Promise<unknown>
    addEventListener: (type: 'loadingdone', listener: () => void) => void
    removeEventListener: (type: 'loadingdone', listener: () => void) => void
}

/**
 * Calls `onLoad` once the fonts already asked for have loaded, and again each time more finish
 * loading, so widths measured in a fallback face are measured again in the real one. Returns the
 * function that stops listening.
 */
export function watchFonts(fonts: FontLoads | undefined, onLoad: () => void): () => void {
    let live = true
    const loaded = () => live && onLoad()
    fonts?.ready.then(loaded, loaded)
    fonts?.addEventListener('loadingdone', loaded)
    return () => {
        live = false
        fonts?.removeEventListener('loadingdone', loaded)
    }
}

type Deferred = typeof import('./table-deferred')
let deferred: Deferred | undefined
let deferredLoad: Promise<Deferred> | undefined

/** Fetches `./table-deferred` once for every table; a failed fetch is tried again on the next ask. */
function loadDeferred(): Promise<Deferred> {
    deferredLoad ??= import('./table-deferred').then(
        (module) => {
            deferred = module
            return module
        },
        (error: unknown) => {
            deferredLoad = undefined
            throw error
        },
    )
    return deferredLoad
}

/**
 * Starts a watch from `./table-deferred` once it has loaded, so a table with no content column
 * never fetches it. Returns the function that stops the watch, or keeps it from starting.
 */
function watching(start: (watch: Deferred) => () => void): () => void {
    let live = true
    let stop: (() => void) | undefined
    loadDeferred().then(
        (watch) => {
            if (live) stop = start(watch)
        },
        () => undefined,
    )
    return () => {
        live = false
        stop?.()
    }
}

/** `./table-deferred` once it has loaded, fetched after the first paint once `wanted`; undefined until then. */
function useDeferred(wanted: boolean): Deferred | undefined {
    const [loaded, setLoaded] = useState(deferred)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        loadDeferred().then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return loaded ?? deferred
}

/**
 * Whether a `content` column's cells have outgrown its measured width: some cell's content is cut
 * (`scrollWidth` past `clientWidth`) in a column that was not already cut at its `maxWidth` when
 * measured.
 */
export function outgrown(
    cells: readonly { column: string; clientWidth: number; scrollWidth: number }[],
    capped: ReadonlySet<string>,
): boolean {
    return cells.some((cell) => !capped.has(cell.column) && cell.scrollWidth > cell.clientWidth + 0.5)
}

/**
 * Each column's room with the widths just measured: the same object when none changed, so a measure
 * that finds nothing new draws nothing again.
 */
export function roomsWith(
    before: Readonly<Record<string, number>>,
    measured: readonly { column: string; width: number }[],
): Readonly<Record<string, number>> {
    return measured.every(({ column, width }) => before[column] === width)
        ? before
        : { ...before, ...Object.fromEntries(measured.map(({ column, width }) => [column, width])) }
}

export interface TableCellFillProps {
    children?: ReactNode
    /** Whether its text wraps rather than being cut short on one line. */
    wrap?: boolean
}

/**
 * Part of a cell that takes its column's width without adding to it, such as a description under a
 * code in a `content` column: the column is as wide as its other content, its `minWidth` or its
 * group's widest, and this part fills that width and is cut short within it. A column's measure
 * leaves out anything marked `data-measure="skip"`, as this part is.
 */
export function TableCellFill({ children, wrap = false }: TableCellFillProps) {
    return (
        <span data-measure="skip" className={cn('block w-0 min-w-full', wrap ? 'break-words' : 'truncate')}>
            {children}
        </span>
    )
}

interface WidthGroup {
    widest: Readonly<Record<string, number>>
    report: (table: string, widths: Readonly<Record<string, number>> | undefined) => void
}

const WidthGroupContext = createContext<WidthGroup | undefined>(undefined)

/** The widest of each column's measured widths across the tables of a group. */
export function widestOf(tables: readonly Readonly<Record<string, number>>[]): Record<string, number> {
    const widest: Record<string, number> = {}
    for (const widths of tables) for (const [id, width] of Object.entries(widths)) widest[id] = Math.max(widest[id] ?? 0, width)
    return widest
}

export interface DataTableGroupProps {
    children: ReactNode
}

/**
 * Tables of one shape whose `content` columns line up: each such column is as wide as the widest
 * it is measured in any of the group's tables, such as the same listing in separate sections.
 * Columns are matched by their `id`.
 */
export function DataTableGroup({ children }: DataTableGroupProps) {
    const [tables, setTables] = useState<Readonly<Record<string, Readonly<Record<string, number>>>>>({})
    const report = useCallback((table: string, widths: Readonly<Record<string, number>> | undefined) => {
        setTables((before) => {
            if (widths === undefined) {
                if (!(table in before)) return before
                const { [table]: _gone, ...rest } = before
                return rest
            }
            const was = before[table]
            const same =
                was !== undefined &&
                Object.keys(was).length === Object.keys(widths).length &&
                Object.entries(widths).every(([id, width]) => was[id] === width)
            return same ? before : { ...before, [table]: widths }
        })
    }, [])
    const group = useMemo(() => ({ widest: widestOf(Object.values(tables)), report }), [tables, report])
    return <WidthGroupContext value={group}>{children}</WidthGroupContext>
}

/**
 * The width of a stacked line's name: the widest name, at most `most` pixels, and the columns whose
 * name is cut short at it.
 */
export function stackLabels(most: number, names: readonly { id: string; width: number }[]): { width: number; cut: Set<string> } {
    return {
        width: Math.ceil(Math.min(most, Math.max(0, ...names.map((name) => name.width)))),
        cut: new Set(names.filter((name) => name.width > most).map((name) => name.id)),
    }
}

/** The keys of the drawn rows from one key to another, either way round. */
export function rangeKeys<T>(flat: readonly FlatRow<T>[], from: string, to: string): string[] {
    const a = flat.findIndex((entry) => entry.key === from)
    const b = flat.findIndex((entry) => entry.key === to)
    if (a < 0 || b < 0) return [to]
    const [start, end] = a < b ? [a, b] : [b, a]
    return flat.slice(start, end + 1).map((entry) => entry.key)
}

/** A value its owner may hold, or the table holds itself when the owner passes none. */
function useHeld<V>(value: V | undefined, initial: V, onChange?: (value: V) => void): [V, (value: V) => void] {
    const [own, setOwn] = useState(initial)
    const held = value === undefined ? own : value
    const set = useCallback(
        (next: V) => {
            if (value === undefined) setOwn(next)
            onChange?.(next)
        },
        [value, onChange],
    )
    return [held, set]
}

const EMPTY: ReadonlySet<string> = new Set()
const NO_WIDTHS: Readonly<Record<string, number>> = {}
const NO_ORDER: readonly string[] = []
const NO_CHILDREN: ReadonlyMap<string, readonly unknown[]> = new Map()
const CHECK = '2.5rem'
/** Rows drawn above and below the visible ones, so a quick scroll does not show blank space. */
const OVERSCAN = 8
/** The space between cards, and around them, in pixels. */
const GAP = 16
/** A stacked card's padding, the height of each of its lines, and of each line of a primary value, in pixels. */
const STACK_PAD = 8
const STACK_LINE = 20
const STACK_PRIMARY_LINE = 22
/** The height of a stacked card's line of secondary facts, room for an avatar among them. */
const STACK_FACTS = 24
/** The height of a stacked card's line that holds a field to edit in, in pixels. */
const STACK_EDIT_LINE = 36
/** The height of a stacked card's title line. */
const STACK_TITLE = 24
const NO_EDITS: ReadonlyMap<string, CellEdit> = new Map()
/** A muted row's content, dimmed as a control that is off is: a table row's cells, keeping their grounds, and a listed row's lines. */
const MUTED_CELLS = '[&>[data-track]>*]:opacity-60'
const MUTED_ITEM = '*:opacity-60'
/** The widest a `content` column grows when it names no `maxWidth`. */
const CONTENT_MAX = '20rem'

/** How a row reads: `muted` dims it, such as an account switched off; the status tones tint it. */
export type DataRowTone = 'muted' | 'critical' | 'warning'

/** A toned row's ground: the status tones mixed into the card, opaque so a pinned cell keeps it as rows scroll under. */
const TONE_GROUND: Record<Exclude<DataRowTone, 'muted'>, string> = {
    critical: 'bg-[color-mix(in_oklab,var(--critical)_8%,var(--card))]',
    warning: 'bg-[color-mix(in_oklab,var(--warning)_10%,var(--card))]',
}

export interface DataTableProps<T> {
    columns: DataColumn<T>[]
    rows: readonly T[]
    rowKey: (row: T) => string
    /** A row's children; a row with any is drawn with a control to open it. */
    childRows?: (row: T) => readonly T[] | undefined
    /** Whether a row has children not loaded yet; such a row opens, and `loadChildren` brings them. */
    hasChildren?: (row: T) => boolean
    /**
     * A branch's children, fetched when it first opens while `childRows` does not give them. The
     * table keeps them; a load that fails closes the branch again.
     */
    loadChildren?: (row: T) => Promise<readonly T[]>
    /**
     * A row's own detail, drawn under it across the table's width once it is opened, such as the
     * fields of a record that are not more rows; `undefined` or `null` for a row without one. A row
     * with a detail opens and closes as a branch does, and its open state is held in `expanded`.
     */
    detail?: (row: T) => ReactNode
    /**
     * Whether a row has a `detail`, so it draws the control that opens it; given, `detail` is called
     * only for the rows opened, so it may be costly. Without it every row's `detail` is asked.
     */
    hasDetail?: (row: T) => boolean
    /**
     * The name of a row's control that opens or closes it, its accessible name and its tooltip, such
     * as `Show the tokens of ada`; `words.expand` and `words.collapse` by default.
     */
    expandLabel?: (row: T, open: boolean) => string
    /**
     * How a row reads: `muted` dims its content, such as an account switched off or a token revoked;
     * `critical` and `warning` tint its ground in the status's tone. Selection and the pointer's tint
     * draw over either.
     */
    rowTone?: (row: T) => DataRowTone | undefined
    expanded?: ReadonlySet<string>
    defaultExpanded?: ReadonlySet<string>
    onExpandedChange?: (expanded: ReadonlySet<string>) => void
    /**
     * Brings a row into view, such as one arriving from a search result: the branches above it
     * open, its group unfolds, its page shows, and it is scrolled to and made the active row with
     * the focus on the table. `open` opens the row itself too, its detail or its children. As
     * `CodeEditor`'s `reveal`, each new object reveals once, so hold it (in state, or a constant)
     * rather than writing it inline; a key no row has waits for the rows to bring it.
     */
    reveal?: DataReveal | null
    sort?: DataSort | null
    defaultSort?: DataSort | null
    onSortChange?: (sort: DataSort | null) => void
    /** The app sorts the rows itself, such as on a server; the table only shows and reports the sort. */
    manualSort?: boolean
    /** Each row gets a box to select it, and the head a box for all of them. */
    selectable?: boolean
    selection?: ReadonlySet<string>
    defaultSelection?: ReadonlySet<string>
    onSelectionChange?: (selection: ReadonlySet<string>) => void
    /** What the bar offers to do with the selected rows; `clear` empties the selection. */
    bulkActions?: (selection: ReadonlySet<string>, clear: () => void) => ReactNode
    hiddenColumns?: ReadonlySet<string>
    defaultHiddenColumns?: ReadonlySet<string>
    onHiddenColumnsChange?: (hidden: ReadonlySet<string>) => void
    /**
     * The columns' ids in the order drawn, set from the column menu: a column not named follows in
     * its given order, and the first column stays first.
     */
    columnOrder?: readonly string[]
    defaultColumnOrder?: readonly string[]
    onColumnOrderChange?: (order: readonly string[]) => void
    /** Pressing a row or Enter on it, such as to show it in a side panel. */
    onOpen?: (row: T) => void
    /** The row shown elsewhere, drawn as chosen. */
    opened?: (row: T) => boolean
    /**
     * A chevron at the end of every row, saying that a press (`onOpen`) leaves the list for the
     * row's own page rather than showing it beside the list.
     */
    chevron?: boolean
    /** What a row's menu offers: from the button at its end, and on a right-click anywhere on it. */
    rowActions?: (row: T) => DataAction[]
    /** When the menu button at a row's end shows: always, only while the pointer is over the row, or never (right-click only). */
    actionButton?: 'always' | 'hover' | 'none'
    /** The menu button's icon. */
    actionIcon?: ReactNode
    /**
     * The search field, first in the bar and sized by it: a fixed width beside the count, and the
     * whole width of a narrow table.
     */
    search?: ReactNode
    /**
     * What the bar holds when nothing is selected, such as filters. With a `search` they take a line
     * of their own under it and wrap from the left edge; without one they sit before the count, and
     * take a line of their own under it on a narrow table.
     */
    toolbar?: ReactNode
    /** The count the bar shows, when the rows given are not all there are. */
    total?: number
    /**
     * Rows a page at a time, with a pager at the foot. `client`: the table sorts every row and shows
     * one page of them. `server`: the rows given are the page, `total` counts them all, and the app
     * sorts (with `manualSort`) and fetches the page it hears.
     */
    paging?: 'client' | 'server'
    /** The page shown, counted from 0. */
    page?: number
    defaultPage?: number
    onPageChange?: (page: number) => void
    pageSize?: number
    defaultPageSize?: number
    onPageSizeChange?: (size: number) => void
    /** The sizes the pager offers. */
    pageSizes?: number[]
    /** More rows exist than are given; nearing the end asks for them with `onLoadMore`, or the button does with `loadMore="button"`. */
    hasMore?: boolean
    /**
     * How more rows are asked for while `hasMore`: `end`, the default, as the end of what has loaded
     * comes near; `button`, from a Load more button after the last row, for a list whose reader decides.
     */
    loadMore?: 'end' | 'button'
    /** How many rows the next load brings, said on the Load more button. */
    loadMoreCount?: number
    /** Rows are on their way: placeholder rows show at the end, or fill the table when it has none yet. */
    loading?: boolean
    onLoadMore?: () => void
    /**
     * With server pages, the app selects every row on every page itself, as the table holds only the
     * page shown; given this, the bar offers it once the page shown is selected.
     */
    onSelectAllPages?: () => void
    /**
     * A row drawn as a card, for the grid view; given one, the bar offers table and grid. Cards keep
     * the table's selection, menus, sort, pages and loading; a tree's rows show as they are open.
     */
    card?: (row: T) => ReactNode
    view?: 'table' | 'grid'
    defaultView?: 'table' | 'grid'
    onViewChange?: (view: 'table' | 'grid') => void
    /** The narrowest a card goes; cards share out any width left on their line. */
    cardWidth?: string
    /** Every card's height, one for all so the grid draws only what is in view. */
    cardHeight?: string
    /**
     * Below this width of its own box, in pixels or as a CSS length such as `64rem`, and once the box
     * is narrower than `minWidth` too, the table shows each row as a card: the first column its title
     * and every other a labeled line. A table whose columns fit stays a table, so a small panel on a
     * wide screen keeps its rows. It is the box's width, never the window's, so the table holds up in
     * any container. `false` keeps the table, which then scrolls sideways. 576 for a table; 480, a
     * phone's width, for a list, which stacks once its columns no longer fit too, so a list in a
     * narrow panel on a wide screen keeps its rows while they fit.
     */
    stackBelow?: number | string | false
    /**
     * The narrowest the columns go before the table scrolls sideways, and never narrower than the
     * columns' own least widths, a `content` column's measured width among them. `auto`: just the
     * columns' least widths, and the table stacks below `stackBelow` or once its columns no longer
     * fit, never scrolling sideways, for a listing. `48rem` for a table, `auto` for a list.
     */
    minWidth?: string
    /**
     * How stacked rows draw their columns. `labeled`: each column on a line of its own after its
     * name, an editable one as a field to edit in. `compact`: the title as the main line, any `lead`
     * columns before it, and every other column in one quiet line of details under it, an editable
     * value opening its editor on a press, in its line's place while open. For a list of short
     * things on a phone, such as tasks.
     */
    stackLayout?: 'labeled' | 'compact'
    /** How an editable table marks its active cell while it has the focus: `underline` (the default), a line in the focus color under it, `ring`, `soft`, or `row`, which washes the cell's row. */
    cellFocus?: CellFocus
    /** `auto` lets a row grow to fit its tallest cell; every row is then drawn, not only those in view. */
    rowHeight?: 'fixed' | 'auto'
    /** Whether the column heads' edges resize the columns. */
    resizable?: boolean
    /** Whether the columns menu moves columns up and down; `false` leaves only showing and hiding them. */
    reorderable?: boolean
    /**
     * Lets the reader put the rows in order: a grip at the start of each row, or of each card while
     * the rows are stacked, drags it (a finger holds it a moment first), a line showing where it
     * lands, and Alt (Option) with the up and down arrows moves the active row a place. Hears where
     * the row at `from` goes, both places among `rows` as given. Rows reorder while they are drawn
     * as given: not sorted, grouped or a tree; the drag engine loads only for a table that reorders.
     */
    onReorder?: (from: number, to: number) => void
    /** What a row is called by its grip and to a screen reader as it moves; its key without it. */
    rowLabel?: (row: T) => string
    /** What a target outside the table, such as a tree's folders, takes its rows as; only the table takes them without it. */
    dragKind?: string
    /** Widths in pixels by column id; a column without one keeps its own `width`. */
    columnWidths?: Readonly<Record<string, number>>
    defaultColumnWidths?: Readonly<Record<string, number>>
    onColumnWidthsChange?: (widths: Readonly<Record<string, number>>) => void
    /** `list`: a short listing's look, with no bar above the head while nothing is selected, unless it has a `search` or a `toolbar`. */
    variant?: 'table' | 'list'
    /**
     * Whether the bar above the head shows while nothing is selected: by default a table has one, and a
     * list only with a `search` or a `toolbar`. `false` for a table that only shows its rows, such as a
     * scorecard.
     */
    bar?: boolean
    /** A line at the foot, such as how many rows are loaded. */
    foot?: ReactNode
    /**
     * What the table shows with no rows: a sentence, drawn as the table's own line, or a node such
     * as an `Empty` with an icon and an action. Given, it stands alone, without the column heads,
     * unless the bar holds a `search` or a `toolbar` whose filters may have emptied the table.
     * `words.empty` by default, under the column heads.
     */
    empty?: ReactNode
    /** Tints the row under the pointer. */
    hover?: boolean
    /** Draws the column names over the rows; off for a listing whose rows say what they are. */
    columnHeads?: boolean
    /** Gathers the top-level rows under group heads, by a field of the row or a key made from it. */
    groupBy?: (keyof T & string) | ((row: T) => string)
    /** A group head's label; the group's key by default. */
    groupLabel?: (key: string, rows: readonly T[]) => ReactNode
    /** The group keys drawn first, in this order; the rest follow in the order their first row came. */
    groupOrder?: readonly string[]
    /** The keys of the folded groups. */
    foldedGroups?: ReadonlySet<string>
    defaultFoldedGroups?: ReadonlySet<string>
    onFoldedGroupsChange?: (folded: ReadonlySet<string>) => void
    /** Draws the table's own border and corners; off for a table set into a frame of its own. */
    framed?: boolean
    /**
     * Edits the cells of columns with `edit`: `tableEditing` from `@winterop-com/sokkel-ui/table-editing`.
     * Without it no cell edits, and the table carries none of the editors.
     */
    editing?: TableEditing
    words?: Partial<DataTableWords>
    className?: string
}

/**
 * A table for rows of any number: sorting, selection with a bulk bar, a column menu, child rows,
 * column widths, and the keyboard. Only the rows in view are drawn, so fifty thousand scroll as
 * smoothly as fifty.
 *
 * Rows are one line at the density's row height; `rowHeight="auto"` lets a row grow to its
 * tallest cell, and then every row is drawn, so it suits listings of a few hundred rows. The head
 * stays put while the rows scroll, and the first column stays put while they scroll sideways.
 * Each column head's right edge resizes its column, as a panel's edge does: drag it, move it with
 * the arrows, or double-click it or press Enter to put it back. A column sized as a fraction
 * becomes pixels once dragged. `resizable={false}`, or `resizable: false` on a column, turns it
 * off; phones and stacked cards have no handles. The columns menu shows, hides and moves the
 * columns after the first; `reorderable={false}` leaves it showing and hiding only. A column with a `sortValue` sorts from
 * its head: up, down, then as the rows came. With `selectable`, each row gets a box; Shift picks
 * a range and Ctrl or Command a single row from anywhere on the row, and once anything is
 * selected the bar above says how many and holds `bulkActions`. With `childRows`, a row with
 * children opens and closes, children sort among themselves, and choosing a row chooses its
 * whole branch. With `hasChildren` and `loadChildren`, a branch's children load when it first
 * opens, a spinner in its control until they come. Arrow keys move through the rows, Space
 * selects, Enter opens, and Right and Left open and close a branch.
 *
 * With `detail`, a row opens into a free-form detail of its own, drawn under it across the width
 * of the table, such as a record's fields with their documentation: not more rows of the same shape,
 * which `childRows` gives. It opens from the same control as a branch, Right and Left open and
 * close it, and its open state is the same `expanded`. Without `onOpen`, a press or Enter on such a
 * row opens and closes it too. Stacked rows show it under their card; the grid view's cards do not.
 * A table with details draws every row, as their heights are not known before they are.
 *
 * Without `selectable`, a plain click, Enter or Space picks a row with `onOpen`, and the row
 * `opened` names is drawn and marked selected, for a list beside its detail. `variant="list"` is
 * the look of a short listing: no bar above the head (until rows are selected, or with a `search`
 * or a `toolbar`), the column names
 * as the box's head, the columns set apart by a gap rather than padded, and, once the box is
 * narrow, a plain divided list of rows each as tall as its lines; a `foot` line says what the bar
 * would have.
 *
 * Columns with a `band` are drawn under band heads above their own, neighbors with the same band
 * sharing one, and a rule marks where each band starts and ends, such as the options of a cut set
 * under the options of a smaller one. Stacked, a column is named by its band and its header.
 *
 * With `groupBy`, the rows gather under group heads, each with its label, its count and what each
 * column's `aggregate` says for its rows; pressing a head folds the group. Rows sort within their
 * group, and a head's box selects the whole group. Groups apply to a table drawn whole or scrolled,
 * not paged; in the grid view each group's cards sit under their head.
 *
 * The column menu in the bar hides columns and moves them earlier or later; the first column stays
 * first, as each row's title.
 *
 * Given `editing` (`tableEditing` from `@winterop-com/sokkel-ui/table-editing`), a column with
 * `edit` has editable cells, each saved on its own through the column's `save`. The arrows then
 * move between cells as well as rows, the active cell ringed while the table has the focus; Enter,
 * F2, a double click or a press on the active cell opens its editor, and a typed character opens
 * it on that character. In the editor Enter saves and moves down, Tab saves and moves to the next
 * editable cell (Shift back), and Escape drops the edit. While a save runs the cell shows the new
 * value with a spinner; a refusal marks the cell and keeps what was typed, and a value that is not
 * one, or that `validate` refuses, keeps the editor open. Leaving the editor saves. Cells keep
 * their edits across scrolling, sorting and pages, as each is held by its row's key. Stacked as
 * cards, an editable column's line is a field that opens on a press. A table that edits nothing
 * carries none of it.
 *
 * `reveal` brings a row into view by its key, such as one chosen from a search: the branches above
 * it open, its group unfolds and its page shows, then it is scrolled to, virtualized or not, and
 * made the active row with the focus on the table; with `open` its own detail or children open too.
 *
 * Sort, selection, open branches, folded groups, hidden columns, the columns' order and their
 * widths are each held by the table unless the app passes the value and hears the change; a saved
 * view (`SavedViews`) holds them from outside.
 *
 * The bar above the head holds `search` and the `toolbar`'s tools, then the count, the sort and the
 * view switch. With a search, the search and the count share the first line and the tools take a
 * line of their own under it, wrapping from the left edge. Once the rows stack as cards, each column's
 * `stack` says how it shows: a line (named, or not with `stackLabel: false`), a primary value over
 * several lines under the title, a secondary fact on the card's last line, or a lead before the
 * title, such as a box that marks a row done. `stackLayout="compact"` draws a stacked row as its
 * leads and its title over one quiet line of every other column, for a list of short things on a
 * phone; an editable value there opens its editor on a press, in its line's place. A stacked list's
 * rows keep their selection box and their menu.
 *
 * With no rows the table says `empty`: a sentence, or a node such as an `Empty` with an icon and
 * an action.
 *
 * The table draws its own box, a border with rounded corners; `framed={false}` drops both, for a
 * table set into a panel or a card that already frames it.
 */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    childRows,
    hasChildren,
    loadChildren,
    detail,
    hasDetail: givenHasDetail,
    expandLabel,
    rowTone,
    expanded: expandedValue,
    defaultExpanded = EMPTY,
    onExpandedChange,
    reveal,
    sort: sortValue,
    defaultSort = null,
    onSortChange,
    manualSort = false,
    selectable = false,
    selection: selectionValue,
    defaultSelection = EMPTY,
    onSelectionChange,
    bulkActions,
    hiddenColumns: hiddenValue,
    defaultHiddenColumns = EMPTY,
    onHiddenColumnsChange,
    columnOrder: orderValue,
    defaultColumnOrder = NO_ORDER,
    onColumnOrderChange,
    onOpen,
    opened,
    chevron = false,
    rowActions,
    actionButton = 'always',
    actionIcon = <EllipsisIcon />,
    search,
    toolbar,
    total,
    paging,
    page: pageValue,
    defaultPage = 0,
    onPageChange,
    pageSize: pageSizeValue,
    defaultPageSize = 50,
    onPageSizeChange,
    pageSizes = [25, 50, 100],
    hasMore = false,
    loadMore = 'end',
    loadMoreCount,
    loading = false,
    onLoadMore,
    onSelectAllPages,
    card,
    view: viewValue,
    defaultView = 'table',
    onViewChange,
    cardWidth = '12rem',
    cardHeight = '16rem',
    stackBelow: ownStackBelow,
    stackLayout = 'labeled',
    cellFocus = 'underline',
    minWidth: ownMinWidth,
    rowHeight: rowSizing = 'fixed',
    resizable = true,
    reorderable = true,
    onReorder,
    rowLabel,
    dragKind,
    columnWidths: widthsValue,
    defaultColumnWidths = NO_WIDTHS,
    onColumnWidthsChange,
    variant = 'table',
    bar,
    foot,
    empty,
    hover = true,
    columnHeads = true,
    groupBy,
    groupLabel,
    groupOrder,
    foldedGroups: foldedValue,
    defaultFoldedGroups = EMPTY,
    onFoldedGroupsChange,
    framed = true,
    editing,
    words: ownWords,
    className,
}: DataTableProps<T>) {
    const words = { ...WORDS, ...ownWords }
    const [sort, setSort] = useHeld(sortValue, defaultSort, onSortChange)
    const [selection, setSelection] = useHeld(selectionValue, defaultSelection, onSelectionChange)
    const [expanded, setExpanded] = useHeld(expandedValue, defaultExpanded, onExpandedChange)
    const [hidden, setHidden] = useHeld(hiddenValue, defaultHiddenColumns, onHiddenColumnsChange)
    const [widths, setWidths] = useHeld(widthsValue, defaultColumnWidths, onColumnWidthsChange)
    const [columnIds, setColumnIds] = useHeld(orderValue, defaultColumnOrder, onColumnOrderChange)
    const ordered = useMemo(() => orderColumns(columns, columnIds), [columns, columnIds])
    const auto = rowSizing === 'auto'
    const list = variant === 'list'
    const minWidth = ownMinWidth ?? (list ? 'auto' : '48rem')
    const stackBelow = ownStackBelow ?? stackDefault(minWidth === 'auto')

    // Children loaded on demand, kept by the table unless `childRows` gives them.
    const [loaded, setLoaded] = useState(NO_CHILDREN as ReadonlyMap<string, readonly T[]>)
    const fetching = useRef(new Set<string>())
    const kids = useCallback((row: T) => childRows?.(row) ?? loaded.get(rowKey(row)), [childRows, loaded, rowKey])
    const tree = childRows !== undefined || loadChildren !== undefined
    const treeKids = tree ? kids : undefined
    // Rows open into children, a detail of their own, or both; each such row draws the control that opens it.
    const opens = tree || detail !== undefined
    // Whether a row has a detail: the app says, or else its detail is asked.
    const hasDetail = useMemo(
        () =>
            detail === undefined
                ? undefined
                : (givenHasDetail ??
                  ((row: T) => {
                      const said = detail(row)
                      return said !== undefined && said !== null && said !== false
                  })),
        [detail, givenHasDetail],
    )

    const shown = ordered.filter((column, index) => index === 0 || !hidden.has(column.id))
    // Columns in bands draw a head line above theirs, and a rule where each band starts and ends.
    const banded = shown.some((column) => column.band !== undefined)
    const bandEdge = (index: number) =>
        banded && index > 0 && shown[index].band !== shown[index - 1].band && (shown[index].band ?? shown[index - 1].band) !== undefined
    const sortColumn = sort === null ? undefined : columns.find((column) => column.id === sort.column)
    const order = useCallback(
        (level: readonly T[]) =>
            manualSort || sort === null || sortColumn?.sortValue === undefined
                ? level
                : sortRows(level, sortColumn.sortValue, sort.direction),
        [manualSort, sort, sortColumn],
    )
    const [folded, setFolded] = useHeld(foldedValue, defaultFoldedGroups, onFoldedGroupsChange)
    const grouped = groupBy !== undefined && paging === undefined
    const groupOf = useMemo(
        () => (groupBy === undefined ? undefined : typeof groupBy === 'function' ? groupBy : (row: T) => String(row[groupBy])),
        [groupBy],
    )
    const groups = useMemo(
        () => (grouped && groupOf !== undefined ? groupRows(rows, groupOf, groupOrder) : undefined),
        [grouped, groupOf, rows, groupOrder],
    )

    // Rows the reader puts in order, while they are drawn as given; the drag layer loads only then.
    const ordering = onReorder !== undefined && sort === null && !tree && groupOf === undefined
    const reorderLayer = useTableReorder(ordering)
    const rowKeys = useMemo(() => (ordering ? rows.map(rowKey) : []), [ordering, rows, rowKey])
    const [rowAt, setRowAt] = useState<RowDropAt | undefined>(undefined)
    const showRowAt = useCallback(
        (at: RowDropAt | undefined) => setRowAt((now) => (now?.key === at?.key && now?.part === at?.part ? now : at)),
        [],
    )
    const [rowSaid, setRowSaid] = useState('')
    const labelOf = (row: T) => rowLabel?.(row) ?? rowKey(row)
    /** Moves the row with `key` a place up or down from the keyboard. */
    const stepRow = (key: string, by: -1 | 1) => {
        const from = rowKeys.indexOf(key)
        const to = stepTo(from, by, rowKeys.length)
        if (from === -1 || to === undefined || onReorder === undefined) return
        onReorder(from, to)
        setRowSaid(words.rowMoved(labelOf(rows[from]), to + 1, rows.length))
    }
    // Every row as drawn, and with groups the heads among them.
    const {
        all,
        heads: groupHeads,
        lines: groupedLines,
    } = useMemo(() => {
        const flatten = (level: readonly T[]) =>
            flattenRows({
                rows: level,
                rowKey,
                childRows: treeKids,
                hasChildren: loadChildren === undefined ? undefined : hasChildren,
                hasDetail,
                expanded,
                order,
            })
        if (groups === undefined) return { all: flatten(rows), heads: undefined, lines: undefined }
        const laid = groupLines(groups, folded, flatten)
        return { all: laid.rows, heads: laid.heads, lines: laid.lines }
    }, [rows, rowKey, treeKids, hasChildren, loadChildren, hasDetail, expanded, order, groups, folded])
    const foldGroup = (key: string) => {
        const next = new Set(folded)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setFolded(next)
    }
    const latestExpanded = useRef({ expanded, setExpanded })
    useEffect(() => {
        latestExpanded.current = { expanded, setExpanded }
    })
    // An open branch whose children are not known asks for them once; a failed load closes it.
    useEffect(() => {
        if (loadChildren === undefined) return
        for (const entry of all) {
            if (!entry.waiting || fetching.current.has(entry.key)) continue
            fetching.current.add(entry.key)
            loadChildren(entry.row).then(
                (children) => {
                    fetching.current.delete(entry.key)
                    setLoaded((before) => new Map(before).set(entry.key, children))
                },
                () => {
                    fetching.current.delete(entry.key)
                    const { expanded: now, setExpanded: set } = latestExpanded.current
                    const next = new Set(now)
                    next.delete(entry.key)
                    set(next)
                },
            )
        }
    }, [all, loadChildren])

    // A page of the rows, or all of them; everything below draws and moves through `flat`.
    const [page, setPage] = useHeld(pageValue, defaultPage, onPageChange)
    const [pageSize, setPageSize] = useHeld(pageSizeValue, defaultPageSize, onPageSizeChange)
    const pageCount = paging === 'server' ? (total ?? all.length) : all.length
    const pages = paging === undefined ? 1 : Math.max(1, Math.ceil(pageCount / pageSize))
    const current = Math.min(page, pages - 1)
    const flat = useMemo(
        () => (paging === 'client' ? all.slice(current * pageSize, (current + 1) * pageSize) : all),
        [paging, all, current, pageSize],
    )
    // The table's lines: the rows, with the group heads among them when grouped.
    const drawn: TableLine<T>[] = groupedLines ?? flat
    const allKeys = useMemo(
        () => (selectable ? rows.flatMap((row) => branchKeys(row, rowKey, treeKids)) : []),
        [selectable, rows, rowKey, treeKids],
    )

    // Only the rows in view are drawn: the row height is measured from the density's token.
    // The grid holds the head and, under it, the scroller of the rows.
    const gridBox = useRef<HTMLDivElement>(null)
    const headBox = useRef<HTMLDivElement>(null)
    const scroller = useRef<HTMLDivElement>(null)
    const probe = useRef<HTMLDivElement>(null)
    const cardProbe = useRef<HTMLDivElement>(null)
    const widthProbe = useRef<HTMLDivElement>(null)
    const stackProbe = useRef<HTMLDivElement>(null)
    const [columnsWidth, setColumnsWidth] = useState(768)
    const [stackWidth, setStackWidth] = useState(typeof stackBelow === 'number' ? stackBelow : 576)
    const [rowHeight, setRowHeight] = useState(40)
    const [cardBox, setCardBox] = useState({ width: 192, height: 256 })
    const [view, setView] = useState({ top: 0, height: 800, width: 1200, full: 0 })
    // The width of the rows' scroll bar, which the head beside it leaves free.
    const [gutter, setGutter] = useState(0)
    useLayoutEffect(() => {
        const box = scroller.current
        const measure = probe.current
        const measureCard = cardProbe.current
        if (box === null || measure === null || measureCard === null) return
        const update = () => {
            setRowHeight(measure.offsetHeight || 40)
            setCardBox({ width: measureCard.offsetWidth || 192, height: measureCard.offsetHeight || 256 })
            setColumnsWidth(widthProbe.current?.offsetWidth || 768)
            if (stackProbe.current !== null) setStackWidth(stackProbe.current.offsetWidth)
            setView({ top: box.scrollTop, height: box.clientHeight, width: box.clientWidth, full: box.scrollHeight })
            setGutter(box.offsetWidth - box.clientWidth)
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        observer.observe(measureCard)
        if (stackProbe.current !== null) observer.observe(stackProbe.current)
        if (widthProbe.current !== null) observer.observe(widthProbe.current)
        return () => observer.disconnect()
    }, [])
    const [shownView, setShownView] = useHeld(viewValue, defaultView, onViewChange)
    const chosenGrid = shownView === 'grid' && card !== undefined
    // A narrow box stacks the rows as cards, one to a line, each as tall as its columns need.
    const stacked = !chosenGrid && stackBelow !== false && stacksAt(view.width, stackWidth, columnsWidth, minWidth === 'auto')
    const gridView = chosenGrid || stacked
    // A stacked card: the leads and the title, then the primary values, the lines, and the secondary facts on one line.
    const compact = stackLayout === 'compact'
    const stackParts = useMemo(() => stackColumns(shown, stackLayout), [shown, stackLayout])
    const editable = (column: DataColumn<T> | undefined) => column?.edit !== undefined && editing !== undefined
    // Compact, an editable title or line of facts is as tall as the editor that opens in its place.
    const titleEdits = compact && editable(stackParts.title)
    const factsEdit = compact && stackParts.facts.some(editable)
    const cardPixels = stacked
        ? STACK_PAD * 2 +
          (titleEdits ? STACK_EDIT_LINE : STACK_TITLE) +
          stackParts.primary.reduce((sum, column) => sum + (column.stackLines ?? 2) * STACK_PRIMARY_LINE, 0) +
          stackParts.lines.reduce((sum, column) => sum + (editable(column) ? STACK_EDIT_LINE : STACK_LINE), 0) +
          (stackParts.facts.length > 0 ? (factsEdit ? STACK_EDIT_LINE : STACK_FACTS) : 0) +
          2
        : cardBox.height
    // The grid is drawn a line of cards at a time; the table's line is one row.
    const perLine = stacked ? 1 : gridView ? Math.max(1, Math.floor((view.width - 2 * GAP + GAP) / (cardBox.width + GAP))) : 1
    const lineHeight = gridView ? cardPixels + GAP : rowHeight
    const lines = gridView ? Math.ceil(flat.length / perLine) : drawn.length
    const over = gridView ? 2 : OVERSCAN
    useLayoutEffect(() => {
        if (scroller.current !== null) scroller.current.scrollTop = 0
    }, [current, pageSize, shownView])

    // Nearing the end of what has loaded asks for more, and so does a first load too short to fill the view.
    // Details are drawn under their rows at their own heights, so a table with them draws every row.
    const detailed = detail !== undefined && !chosenGrid
    const nearEnd = view.top + view.height >= ((auto && !gridView) || detailed ? view.full : lines * lineHeight) - lineHeight * over
    const moreByButton = loadMore === 'button'
    useEffect(() => {
        if (hasMore && !moreByButton && !loading && nearEnd) onLoadMore?.()
    }, [hasMore, moreByButton, loading, nearEnd, onLoadMore])

    // Rows that grow are all drawn, as their heights are not known before they are.
    // A narrow list is a plain list of rows as tall as their lines.
    const listed = list && stacked
    // Grouped cards are drawn group by group, every one of them.
    const every = (auto && !gridView) || listed || (gridView && groupHeads !== undefined)
    const whole = every || detailed
    const firstLine = whole ? 0 : Math.max(0, Math.floor(view.top / lineHeight) - over)
    const lastLine = whole ? lines : Math.min(lines, Math.ceil((view.top + view.height) / lineHeight) + over)
    const first = firstLine * perLine
    const last = Math.min(gridView ? flat.length : drawn.length, lastLine * perLine)

    const [active, setActive] = useState<string | undefined>(undefined)
    const anchor = useRef<string | undefined>(undefined)

    // `content` columns not dragged: drawn at `max-content` while their cells are measured, then at the widest.
    const contentColumns = gridView ? [] : shown.filter((column) => column.width === 'content' && widths[column.id] === undefined)
    const contentKey = contentColumns.map((column) => column.id).join(' ')
    // The widths last measured are kept while the rows are stacked, so they still count toward stacking.
    const [ownWidths, setContentWidths] = useState<Readonly<Record<string, number>>>(NO_WIDTHS)
    // In a group, each content column is as wide as the widest of the group's tables.
    const group = useContext(WidthGroupContext)
    const tableId = useId()
    const report = group?.report
    useEffect(() => report?.(tableId, ownWidths), [report, tableId, ownWidths])
    useEffect(() => () => report?.(tableId, undefined), [report, tableId])
    const widest = group?.widest
    const contentWidths = useMemo(() => (widest === undefined ? ownWidths : widestOf([ownWidths, widest])), [widest, ownWidths])
    const [measuring, setMeasuring] = useState(true)
    // Columns cut at their `maxWidth` once measured, whose cut cells call for no new measure; unknown until drawn so.
    const capped = useRef<ReadonlySet<string> | undefined>(undefined)
    // Fonts that load after a measure change what the cells need, a fallback face being narrower or wider.
    const [fontLoads, setFontLoads] = useState(0)
    // Only widths measured from text call for it: a content column's or a stacked line's name.
    const measuresText = contentKey !== '' || stacked
    useEffect(
        () =>
            measuresText
                ? watchFonts(typeof document === 'undefined' ? undefined : document.fonts, () => setFontLoads((count) => count + 1))
                : undefined,
        [measuresText],
    )
    useLayoutEffect(() => setMeasuring(true), [rows, contentKey, rowHeight, columnHeads, fontLoads])
    const contentCells = (box: HTMLElement, column: string) =>
        box.querySelectorAll<HTMLElement>(`[role="gridcell"][data-track="${CSS.escape(column)}"] > :last-child`)
    useLayoutEffect(() => {
        const box = gridBox.current
        if (!measuring || contentColumns.length === 0 || box === null) return
        const next: Record<string, number> = {}
        for (const column of contentColumns) {
            let widest = 0
            for (const cell of box.querySelectorAll(`[data-track="${CSS.escape(column.id)}"]`))
                widest = Math.max(widest, cell.getBoundingClientRect().width)
            if (widest > 0) next[column.id] = Math.ceil(Math.max(widest, column.minSize ?? 0))
        }
        capped.current = undefined
        setContentWidths((before) => ({ ...before, ...next }))
        setMeasuring(false)
    })
    // A content cell whose size or content changes, its value grown or its face loaded, is measured again once cut short.
    const drawnFrom = view.top
    useEffect(() => {
        const box = scroller.current
        if (measuring || contentColumns.length === 0 || box === null || typeof ResizeObserver === 'undefined') return
        const cells = contentColumns.flatMap((column) =>
            [...contentCells(box, column.id)].map((element) => ({ column: column.id, element })),
        )
        const sizes = () =>
            cells.map(({ column, element }) => ({ column, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }))
        // Cut right after a measure, a column is cut at its `maxWidth`.
        capped.current ??= new Set(
            sizes()
                .filter((cell) => outgrown([cell], EMPTY))
                .map((cell) => cell.column),
        )
        const check = () => {
            if (outgrown(sizes(), capped.current ?? EMPTY)) setMeasuring(true)
        }
        return watching((watch) =>
            watch.watchCells(
                cells.map(({ element }) => element),
                check,
            ),
        )
    }, [measuring, contentKey, drawnFrom, rows])

    // A stacked line's name is as wide as the widest name, at most 12rem, its whole text on hover when cut.
    const labelProbe = useRef<HTMLDivElement>(null)
    const [labels, setLabels] = useState<{ width: number; cut: ReadonlySet<string> }>({ width: 80, cut: EMPTY })
    useLayoutEffect(() => {
        const probe = labelProbe.current
        if (probe === null) return
        const [cap, ...names] = [...probe.children] as HTMLElement[]
        const { width, cut } = stackLabels(
            cap.offsetWidth,
            names.map((name) => ({ id: name.dataset.label ?? '', width: name.getBoundingClientRect().width })),
        )
        setLabels((before) =>
            before.width === width && before.cut.size === cut.size && [...cut].every((id) => before.cut.has(id)) ? before : { width, cut },
        )
    }, [stacked, stackParts, fontLoads])
    // While content columns are measured, the parts marked `data-measure="skip"` are left out of the rows.
    const measuringContent = measuring && contentColumns.length > 0

    // Each column's room is read from one of its drawn cells, the first in the rows, by one observer for the table,
    // once a cell has asked for its room.
    const [rooms, setRooms] = useState<Readonly<Record<string, number>>>(NO_WIDTHS)
    const roomsAsked = useRef(false)
    const roomCells = useRef(new Map<Element, string>())
    const roomObserver = useRef<ResizeObserver>(undefined)
    useEffect(() => () => roomObserver.current?.disconnect(), [])
    const roomOf = (column: string) => (element: HTMLElement | null) => {
        const cells = roomCells.current
        if (element === null || !roomsAsked.current || [...cells.values()].includes(column)) return
        const observer = (roomObserver.current ??= new ResizeObserver((entries) =>
            setRooms((before) =>
                roomsWith(
                    before,
                    entries.flatMap(({ target, contentRect }) => {
                        const id = cells.get(target)
                        return id === undefined ? [] : [{ column: id, width: Math.round(contentRect.width) }]
                    }),
                ),
            ),
        ))
        cells.set(element, column)
        observer.observe(element)
        return () => {
            observer.unobserve(element)
            cells.delete(element)
        }
    }
    const cell = useMemo(() => ({ ...NO_CELL, width: view.width, stacked }), [view.width, stacked])
    // A column's cells read the table and their column's room; they are drawn again with the table, so nothing is kept.
    const inColumn = (column: string, content: ReactNode) => (
        <TableCellContext
            key={column}
            value={{
                ...cell,
                get columnWidth() {
                    roomsAsked.current = true
                    return rooms[column] ?? 0
                },
            }}
        >
            {content}
        </TableCellContext>
    )

    // A row with no actions, or only separators, has no menu at all: no button and no right-click menu.
    const actionsOf = (row: T): DataAction[] | undefined => {
        const actions = rowActions?.(row)
        return actions === undefined || actions.every((action) => 'separator' in action) ? undefined : actions
    }

    // The end column fits the inline actions the first row has, and the menu button unless it is off.
    const inlineSlots =
        rowActions === undefined || rows.length === 0
            ? 0
            : rowActions(rows[0]).filter((action) => !('separator' in action) && action.inline === true).length
    const menuWidth =
        rowActions === undefined || (actionButton === 'none' && inlineSlots === 0)
            ? undefined
            : (actionButton === 'none' ? 0.5 : 2.5) + inlineSlots * 1.75
    const endWidth = menuWidth === undefined && !chevron ? undefined : `${String((menuWidth ?? 0.5) + (chevron ? 1.5 : 0))}rem`
    const track = (column: DataColumn<T>) => {
        const dragged = widths[column.id]
        if (dragged !== undefined) return `${String(dragged)}px`
        if (column.width !== 'content') return column.width
        const need = contentWidths[column.id]
        return measuring || need === undefined ? 'max-content' : contentTrack(need, column)
    }
    // The first column makes room for the row's grip, so its own content keeps the width it was given.
    const trackAt = (column: DataColumn<T>, index: number) =>
        index === 0 && ordering && widths[column.id] === undefined ? widenTrack(track(column), GRIP) : track(column)
    const template = [selectable ? CHECK : undefined, ...shown.map(trackAt), endWidth].filter(Boolean).join(' ')
    // The rows are never narrower than their columns' least widths, so a widened column scrolls the table sideways.
    const least = [
        selectable ? CHECK : undefined,
        ...shown.map((column) => columnLeast(column, widths[column.id], contentWidths)),
        endWidth,
    ].filter(Boolean)
    if (list) least.push('2 * var(--density-panel-pad)', `${String(0.75 * (least.length - 1))}rem`)
    if (ordering) least.push(GRIP)
    const rowMin = minWidth === 'auto' ? `calc(${least.join(' + ')})` : `max(${minWidth}, calc(${least.join(' + ')}))`
    const grid = { gridTemplateColumns: template, minWidth: rowMin }
    const canResize = resizable && !gridView
    const heads = useRef(new Map<string, { current: HTMLElement | null }>())
    const headRef = (id: string) => {
        let ref = heads.current.get(id)
        if (ref === undefined) {
            ref = { current: null }
            heads.current.set(id, ref)
        }
        return ref
    }

    const toggle = (entry: FlatRow<T>, range: boolean) => {
        const next = new Set(selection)
        if (range && anchor.current !== undefined) {
            const on = !selection.has(entry.key) || selection.has(anchor.current)
            for (const key of rangeKeys(flat, anchor.current, entry.key)) {
                if (on) next.add(key)
                else next.delete(key)
            }
        } else {
            const on = !selection.has(entry.key)
            for (const key of branchKeys(entry.row, rowKey, treeKids)) {
                if (on) next.add(key)
                else next.delete(key)
            }
        }
        anchor.current = entry.key
        setSelection(next)
    }
    const clear = () => setSelection(new Set())
    const allChosen = allKeys.length > 0 && selection.size >= allKeys.length && allKeys.every((key) => selection.has(key))
    // With pages, the head's box selects the page shown, and the bar then offers every row.
    const headKeys = paging === undefined ? allKeys : flat.map((entry) => entry.key)
    const headChosen = headKeys.length > 0 && headKeys.every((key) => selection.has(key))
    const chooseHead = () => {
        const next = new Set(selection)
        for (const key of headKeys) {
            if (headChosen) next.delete(key)
            else next.add(key)
        }
        setSelection(next)
    }
    const everyCount = paging === 'server' ? (total ?? pageCount) : allKeys.length
    const offerEvery =
        paging !== undefined &&
        headChosen &&
        !allChosen &&
        (paging === 'client' || onSelectAllPages !== undefined) &&
        everyCount > selection.size

    const openBranch = (key: string, open: boolean) => {
        const next = new Set(expanded)
        if (open) next.add(key)
        else next.delete(key)
        setExpanded(next)
    }

    const nextSort = (column: DataColumn<T>) => {
        if (paging !== undefined) setPage(0)
        if (sort?.column !== column.id) setSort({ column: column.id, direction: 'asc' })
        else if (sort.direction === 'asc') setSort({ column: column.id, direction: 'desc' })
        else setSort(null)
    }

    /** Moves the active row and scrolls it into view under the head. */
    const moveTo = (index: number) => {
        const entry = flat[Math.max(0, Math.min(flat.length - 1, index))]
        if (entry === undefined) return
        setActive(entry.key)
        const box = scroller.current
        if (box === null) return
        if (whole) {
            box.querySelector(`[data-row="${CSS.escape(entry.key)}"]`)?.scrollIntoView({ block: 'nearest' })
            return
        }
        const at = Math.floor((gridView ? flat.indexOf(entry) : drawn.indexOf(entry)) / perLine) * lineHeight
        if (at < box.scrollTop) box.scrollTop = at
        else if (at + lineHeight > box.scrollTop + box.clientHeight) box.scrollTop = at + lineHeight - box.clientHeight
    }
    const activeIndex = active === undefined ? -1 : flat.findIndex((entry) => entry.key === active)

    // Editable cells, given `editing`: the active cell, the open editor, and each cell's draft while it is open,
    // saving or refused. The editing itself is the app's `editing`, so a table that edits nothing carries none of it.
    const [activeColumn, setActiveColumn] = useState<string | undefined>(undefined)
    const [cellEdits, setCellEdits] = useState(NO_EDITS)
    const [openCell, setOpenCell] = useState<OpenCell | undefined>(undefined)
    const held = useRef({ opening: undefined as OpenCell | undefined, attempts: 0, refocus: false })
    const edits: TableEditingContext<T> | undefined =
        editing === undefined || !shown.some((column) => column.edit !== undefined)
            ? undefined
            : {
                  shown,
                  flat,
                  active,
                  setActive,
                  activeColumn,
                  setActiveColumn,
                  edits: cellEdits,
                  setEdits: setCellEdits,
                  open: openCell,
                  setOpen: setOpenCell,
                  held,
                  moveTo,
                  grid: gridView,
                  step: gridView ? perLine : 1,
                  words,
                  cellFocus,
                  labelCut: labels.cut,
              }
    useEffect(() => {
        if (edits !== undefined) editing?.settle(edits, gridBox.current, scroller.current)
    })

    /** A row picked by a press or Enter: opened with `onOpen`, or without it, a row with a detail opened or closed. */
    const pick = (entry: FlatRow<T>) => {
        if (onOpen !== undefined) onOpen(entry.row)
        else if (hasDetail?.(entry.row) === true) openBranch(entry.key, !entry.open)
    }
    /** Whether a press on a row does anything. */
    const pressable = onOpen !== undefined || detail !== undefined

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const page = Math.max(1, Math.floor(view.height / lineHeight) - 1) * perLine
        const entry = flat[activeIndex]
        if (ordering && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault()
            if (entry !== undefined) stepRow(entry.key, event.key === 'ArrowUp' ? -1 : 1)
            return
        }
        if (edits !== undefined && editing?.keyDown(edits, event, entry) === true) return
        const moves: Record<string, () => void> = {
            ArrowDown: () => moveTo(activeIndex + perLine),
            ArrowUp: () => moveTo(Math.max(0, activeIndex - perLine)),
            PageDown: () => moveTo(activeIndex + page),
            PageUp: () => moveTo(Math.max(0, activeIndex - page)),
            Home: () => moveTo(0),
            End: () => moveTo(flat.length - 1),
            ' ': () => {
                if (entry === undefined) return
                if (selectable) toggle(entry, event.shiftKey)
                else pick(entry)
            },
            Enter: () => {
                if (entry !== undefined) pick(entry)
            },
            ArrowRight: () => {
                if (gridView) moveTo(activeIndex + 1)
                else if (entry?.branch === true && !entry.open) openBranch(entry.key, true)
            },
            ArrowLeft: () => {
                if (gridView) return moveTo(Math.max(0, activeIndex - 1))
                if (entry === undefined) return
                if (entry.open) openBranch(entry.key, false)
                else if (entry.parent !== undefined) moveTo(flat.findIndex((one) => one.key === entry.parent))
            },
        }
        const move = moves[event.key]
        if (move === undefined) return
        event.preventDefault()
        move()
    }

    const press = (entry: FlatRow<T>, event: MouseEvent) => {
        // A press on a control in a cell, such as a switch or a link, is the control's alone.
        const control = event.target instanceof Element ? event.target.closest(CELL_CONTROL) : null
        if (control !== null && control !== event.currentTarget && event.currentTarget.contains(control)) return
        setActive(entry.key)
        if (selectable && event.shiftKey) toggle(entry, true)
        else if (selectable && (event.metaKey || event.ctrlKey)) toggle(entry, false)
        else pick(entry)
    }

    /** A branch row's selection: all of it, part of it, or none. */
    const branchState = (entry: FlatRow<T>): 'all' | 'some' | 'none' => {
        if (selection.has(entry.key)) return 'all'
        if (!entry.branch || selection.size === 0) return 'none'
        return branchKeys(entry.row, rowKey, treeKids).some((key) => selection.has(key)) ? 'some' : 'none'
    }

    // Every column but the first moves in the column menu; the hideable ones also hide there.
    const movable = ordered.slice(1)
    const hideable = movable.filter((column) => column.hideable !== false)
    const reorder = reorderable && movable.length > 1
    const menuColumns = reorder ? movable : hideable
    const move = (id: string, by: -1 | 1) => setColumnIds(movedColumn(ordered, id, by))
    const sortable = manualSort && onSortChange === undefined ? [] : columns.filter((column) => column.sortValue !== undefined)
    // The bar over the rows, with the selection, the search, the tools, the count and the menus of columns and sorts.
    const barShown = selection.size > 0 || (bar ?? (!list || search !== undefined || toolbar !== undefined))
    const columnMenu = barShown && !gridView && (hideable.length > 0 || reorder)
    const sortMenu = barShown && gridView && sortable.length > 0
    // Base UI's checkbox and the menus' lists are fetched after the first paint, so they are here by the time a box is
    // pressed or a menu opens; until then a selection box is drawn the same without it.
    const later = useDeferred(selectable || columnMenu || sortMenu || !!reveal)

    // A row to reveal: its way opened once the code that finds it is here and the row is known, then shown, scrolled
    // to and made active. Each reveal is done once.
    const revealed = useRef<unknown>(undefined)
    const revealing = useRef<string>(undefined)
    useEffect(() => {
        const found = reveal && reveal !== revealed.current && later?.rowPath(rows, rowKey, treeKids, reveal.key)
        if (!found) return
        revealed.current = reveal
        const open = new Set([...expanded, ...found.above, ...(reveal.open ? [reveal.key] : [])])
        if (open.size > expanded.size) setExpanded(open)
        const into = groupOf?.(found.top)
        if (into !== undefined && folded.has(into)) setFolded(new Set([...folded].filter((key) => key !== into)))
        revealing.current = reveal.key
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- a reveal waits for its code and its row, then is done once
    }, [reveal, later, rows, treeKids])
    useEffect(() => {
        if (revealing.current === undefined) return
        const at = all.findIndex((entry) => entry.key === revealing.current)
        const on = Math.floor(at / pageSize)
        if (at < 0) return
        if (paging === 'client' && on !== current) return setPage(on)
        revealing.current = undefined
        gridBox.current?.focus({ preventScroll: true })
        moveTo(flat.indexOf(all[at]))
    })
    // A list pins nothing and sets its columns apart with a gap; a table pins its first and last columns and pads its cells.
    const pinned = list ? '' : 'sticky z-1 bg-inherit shadow-[1px_0_0_var(--border)]'
    const pinnedEnd = list ? '' : 'sticky z-1 bg-inherit shadow-[-1px_0_0_var(--border)]'
    const pad = list ? '' : 'px-3'
    // The rule where a band starts or ends; a list's columns sit apart by a gap, so its rule takes room after it too.
    const edge = cn('border-l border-border', list && 'pl-3')
    const spaced = list && 'gap-3 px-(--density-panel-pad)'
    // A head drawn as a node may take several lines, so the head row grows to fit it.
    const tallHeads = shown.some((column) => column.head !== undefined)

    /** The name of a row's control that opens or closes it, the row's own when the app gives one. */
    const branchLabel = (entry: FlatRow<T>) => expandLabel?.(entry.row, entry.open) ?? (entry.open ? words.collapse : words.expand)

    /** A tree row's indent and its control: open or close, or a spinner while its children load. */
    const treeControl = (entry: FlatRow<T>) => (
        <span className="flex shrink-0 items-center" style={{ paddingLeft: `${String(entry.depth * 1.25)}rem` }}>
            {entry.waiting ? (
                <span className="mr-1 flex size-5 items-center justify-center text-muted-foreground">
                    <Spinner className="size-3.5" aria-label={words.loadingChildren} />
                </span>
            ) : entry.branch ? (
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={branchLabel(entry)}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    setActive(entry.key)
                                    openBranch(entry.key, !entry.open)
                                }}
                                className="mr-1 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                            />
                        }
                    >
                        <ChevronRightIcon className={cn('size-3.5 transition-transform', entry.open && 'rotate-90')} />
                    </TooltipTrigger>
                    <TooltipContent>{branchLabel(entry)}</TooltipContent>
                </Tooltip>
            ) : (
                <span className="mr-1 size-5" />
            )}
        </span>
    )

    /** A group head's fold control, label and count, the same in every view. */
    const groupTitle = (head: GroupHead<T>) => (
        <>
            <button
                type="button"
                aria-label={words.foldGroup(head.folded)}
                aria-expanded={!head.folded}
                onClick={(event) => {
                    event.stopPropagation()
                    foldGroup(head.key)
                }}
                // The button's own keys press it rather than moving the active row.
                onKeyDown={(event) => event.stopPropagation()}
                className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
                <ChevronRightIcon className={cn('size-3.5 transition-transform', !head.folded && 'rotate-90')} />
            </button>
            <span className="min-w-0 truncate">{groupLabel?.(head.key, head.rows) ?? head.key}</span>
            <span className="ml-2 shrink-0 font-mono text-xs font-normal text-muted-foreground tabular-nums">
                {words.groupCount(head.rows.length)}
            </span>
        </>
    )

    /** A group's selection: every row in it, at any depth, folded or not. */
    const groupKeysOf = (head: GroupHead<T>) => head.rows.flatMap((row) => branchKeys(row, rowKey, treeKids))
    const groupBox = (head: GroupHead<T>) => {
        const keys = groupKeysOf(head)
        const all = keys.length > 0 && keys.every((key) => selection.has(key))
        const some = !all && keys.some((key) => selection.has(key))
        return (
            <SelectBox
                later={later}
                aria-label={words.selectGroup}
                tabIndex={-1}
                checked={all}
                indeterminate={some}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={() => {
                    const next = new Set(selection)
                    for (const key of keys) {
                        if (all) next.delete(key)
                        else next.add(key)
                    }
                    setSelection(next)
                }}
            />
        )
    }

    /**
     * How many columns a group head's label takes: the first and every one after it up to the first
     * that aggregates, so a narrow first column never cuts the label short.
     */
    const aggregated = shown.findIndex((column, at) => at > 0 && column.aggregate !== undefined)
    const labelSpan = aggregated === -1 ? shown.length : aggregated

    /** A group's head as a line of the table, on the table's columns. */
    const groupRow = (head: GroupHead<T>, index: number) => {
        const left = selectable ? 'left-(--check)' : 'left-0'
        const spans = labelSpan > 1
        return (
            <div
                key={`group:${head.key}`}
                role="row"
                aria-rowindex={index + 2}
                aria-expanded={!head.folded}
                data-group={head.key}
                onClick={() => foldGroup(head.key)}
                className={cn(
                    'grid cursor-pointer items-center border-b border-border bg-panel-ground text-sm font-medium',
                    spaced,
                    every ? 'min-h-(--density-row)' : 'h-(--density-row)',
                )}
                style={grid}
            >
                {selectable && (
                    <span role="gridcell" className={cn(pinned, 'left-0 flex h-full items-center justify-center')}>
                        {groupBox(head)}
                    </span>
                )}
                {/* A label across several columns keeps to the pinned edge inside its cell, rather than pinning the whole width. */}
                <span
                    role="gridcell"
                    aria-colspan={spans ? labelSpan : undefined}
                    className={cn('flex h-full min-w-0 items-center', !spans && cn(pad, pinned, left))}
                    style={{ '--check': CHECK, gridColumn: spans ? `span ${String(labelSpan)}` : undefined } as React.CSSProperties}
                >
                    {spans ? (
                        <span className={cn('flex min-w-0 items-center', pad, !list && cn('sticky', left))}>{groupTitle(head)}</span>
                    ) : (
                        groupTitle(head)
                    )}
                </span>
                {shown.slice(labelSpan).map((column, index) => (
                    <span
                        key={column.id}
                        role="gridcell"
                        className={cn(
                            'flex h-full min-w-0 items-center',
                            pad,
                            bandEdge(labelSpan + index) && edge,
                            column.align === 'end' && 'justify-end tabular-nums',
                            column.align === 'center' && 'justify-center tabular-nums',
                        )}
                    >
                        <span className="min-w-0 truncate">{column.aggregate?.(head.rows)}</span>
                    </span>
                ))}
                {endWidth !== undefined && <span role="gridcell" className={cn(pinnedEnd, 'right-0 h-full')} />}
            </div>
        )
    }

    // An empty table given its own words says them alone, unless the bar's search or tools may have emptied it.
    const bare = drawn.length === 0 && !loading && empty !== undefined && search === undefined && toolbar === undefined
    const showHeads = !gridView && columnHeads && !bare
    // The head stays where the rows are sideways once the columns change, and a wheel over it scrolls the rows.
    useLayoutEffect(() => {
        if (headBox.current !== null && scroller.current !== null) headBox.current.scrollLeft = scroller.current.scrollLeft
    })
    useEffect(() => {
        const head = headBox.current
        if (!showHeads || head === null) return
        const wheel = (event: WheelEvent) => {
            if (event.ctrlKey || scroller.current === null) return
            event.preventDefault()
            scroller.current.scrollBy(event.deltaX, event.deltaY)
        }
        head.addEventListener('wheel', wheel, { passive: false })
        return () => head.removeEventListener('wheel', wheel)
    }, [showHeads])
    // With the Load more button, the button's spinner stands for the rows on their way once some are drawn.
    const moreButton = moreByButton && hasMore && flat.length > 0
    const placeholders = loading && !(moreByButton && flat.length > 0)

    /** A press on a part of a stacked row that is its own control, kept from opening the row. */
    const keep = (event: MouseEvent) => event.stopPropagation()

    /** A row's menu button, or nothing for a row without actions or a table with the button off. */
    const menuFor = (actions: DataAction[] | undefined, variant: 'ghost' | 'secondary') =>
        actions === undefined || actionButton === 'none' ? null : (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={<Button variant={variant} size="icon-xs" tabIndex={-1} aria-label={words.actions} />}
                    onClick={keep}
                >
                    {actionIcon}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <MenuItems actions={actions} kind="dropdown" />
                </DropdownMenuContent>
            </DropdownMenu>
        )

    /** A row's selection box in a stacked row or a card, or nothing when rows are not selected. */
    const boxFor = (entry: FlatRow<T>) =>
        selectable ? (
            <SelectBox
                later={later}
                aria-label={words.selectRow}
                tabIndex={-1}
                checked={selection.has(entry.key)}
                onCheckedChange={() => toggle(entry, false)}
            />
        ) : null

    /** A stacked row's lead columns before its title, each its own control. */
    const leadsOf = (entry: FlatRow<T>, listed: boolean) =>
        stackParts.lead.map((column) => (
            <span key={column.id} role={listed ? 'gridcell' : undefined} className="flex h-6 shrink-0 items-center" onClick={keep}>
                {column.cell(entry.row)}
            </span>
        ))

    /** Whether a stacked row draws a value; a card keeps every line, so all cards are one height. */
    const saidIn = (listed: boolean) => (value: ReactNode) =>
        !listed || (value !== null && value !== undefined && value !== false && value !== '')

    /** The secondary facts in one muted line, the last of them giving way when the line is short. */
    const factsLine = (facts: { column: DataColumn<T>; value: ReactNode }[], listed: boolean, height: string, indent?: CSSProperties) => (
        <div
            role={listed ? 'gridcell' : undefined}
            className={cn('flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground', !listed && height)}
            style={indent}
        >
            {facts.map(({ column, value }, index) => (
                <Fragment key={column.id}>
                    {index > 0 && (
                        <span aria-hidden className="shrink-0 text-faint">
                            ·
                        </span>
                    )}
                    <span className={cn('min-w-0 truncate', index === facts.length - 1 ? 'shrink' : 'shrink-0')}>{value}</span>
                </Fragment>
            ))}
        </div>
    )

    /** Each primary value in body text over up to its `stackLines` lines. */
    const primaryLines = (entry: FlatRow<T>, listed: boolean, indent?: CSSProperties) =>
        stackParts.primary.map((column) => {
            const value = column.cell(entry.row)
            if (!saidIn(listed)(value)) return null
            return (
                <div
                    key={column.id}
                    ref={roomOf(column.id)}
                    role={listed ? 'gridcell' : undefined}
                    className="line-clamp-(--stack-lines) min-w-0 text-sm font-normal"
                    style={{ ...indent, '--stack-lines': column.stackLines ?? 2 } as CSSProperties}
                >
                    {inColumn(column.id, value)}
                </div>
            )
        })

    /**
     * What a stacked row shows under its title: each primary value over its lines, each line with its
     * column's name unless the column drops it, and the secondary facts in one muted line. A card
     * keeps every line, so all cards are one height; a narrow list leaves out a line with nothing to say.
     */
    const stackedLines = (entry: FlatRow<T>, listed: boolean) => {
        const indent: CSSProperties | undefined = listed && opens ? { paddingLeft: `${String(entry.depth * 1.25 + 1.5)}rem` } : undefined
        const said = saidIn(listed)
        const facts = stackParts.facts.map((column) => ({ column, value: column.cell(entry.row) })).filter(({ value }) => said(value))
        return (
            <>
                {primaryLines(entry, listed, indent)}
                {stackParts.lines.map((column) => {
                    if (column.edit !== undefined && edits !== undefined)
                        return inColumn(column.id, editing?.line(edits, entry, column, listed, indent))
                    const value = column.cell(entry.row)
                    if (!said(value)) return null
                    return (
                        <div
                            key={column.id}
                            role={listed ? 'gridcell' : undefined}
                            className={cn('flex min-w-0 gap-2 text-xs', listed ? 'items-baseline' : 'min-h-5 items-center')}
                            style={indent}
                        >
                            {column.stackLabel !== false && (
                                <span
                                    title={labels.cut.has(column.id) ? columnName(column) : undefined}
                                    className="w-(--stack-label) shrink-0 truncate text-muted-foreground"
                                >
                                    {columnName(column)}
                                </span>
                            )}
                            {/* Text is cut short itself with the whole of it in its title; a part such as a chip and a code keeps its own shape. */}
                            <span ref={roomOf(column.id)} className="flex min-w-0 flex-1">
                                {typeof value === 'string' || typeof value === 'number' ? (
                                    <span title={String(value)} className="min-w-0 truncate">
                                        {value}
                                    </span>
                                ) : (
                                    inColumn(column.id, value)
                                )}
                            </span>
                        </div>
                    )
                })}
                {facts.length > 0 && factsLine(facts, listed, 'h-6', indent)}
            </>
        )
    }

    /**
     * A compact stacked row: the selection box, the tree's control and the leads, then the title
     * over the primary values and one quiet line of facts, and the menu. An editable value opens on
     * a press, its editor taking its line's place while open.
     */
    const compactRow = (entry: FlatRow<T>, listed: boolean, box: ReactNode, menu: ReactNode) => {
        const title = stackParts.title
        const isOpen = (column: DataColumn<T>) => edits !== undefined && editing?.isOpen(edits, entry, column) === true
        const valueOf = (column: DataColumn<T>) =>
            column.edit !== undefined && edits !== undefined ? editing?.value(edits, entry, column) : column.cell(entry.row)
        const said = saidIn(listed)
        const facts = stackParts.facts
            .filter((column) => said(column.cell(entry.row)))
            .map((column) => ({ column, value: valueOf(column) }))
        const open = stackParts.facts.find(isOpen)
        return (
            <div className="flex min-w-0 items-start gap-2 text-sm">
                {box !== null && (
                    <span className="flex h-6 items-center" onClick={keep}>
                        {box}
                    </span>
                )}
                {opens && <span className="flex h-6 items-center">{treeControl(entry)}</span>}
                {leadsOf(entry, listed)}
                <div className="flex min-w-0 flex-1 flex-col">
                    {title !== undefined &&
                        (edits !== undefined && isOpen(title) ? (
                            editing?.line(edits, entry, title, listed, undefined, false)
                        ) : (
                            <div
                                role={listed ? 'gridcell' : undefined}
                                className={cn(
                                    'flex min-w-0 items-center',
                                    title.stackTitle === 'free' ? 'min-h-6 py-0.5' : titleEdits && !listed ? 'h-9' : 'h-6',
                                )}
                            >
                                <span className={cn('min-w-0', title.stackTitle === 'free' ? 'flex-1' : 'truncate')}>
                                    {inColumn(title.id, valueOf(title))}
                                </span>
                            </div>
                        ))}
                    {primaryLines(entry, listed)}
                    {open !== undefined && edits !== undefined
                        ? editing?.line(edits, entry, open, listed)
                        : facts.length > 0 && factsLine(facts, listed, factsEdit ? 'h-9' : 'h-6')}
                </div>
                {menu !== null && <span className="flex h-6 items-center">{menu}</span>}
            </div>
        )
    }

    /** A row with actions, with its right-click menu around it. */
    /** A row's grip, with `onReorder`: what drags it once the drag layer is here, and the same grip until then. */
    const rowGrip = (row: T, handle: DragHandleProps | undefined) => {
        const { ref, ...rest } = handle ?? {}
        return (
            <button
                {...rest}
                ref={ref}
                type="button"
                tabIndex={-1}
                aria-label={words.moveRow(labelOf(row))}
                onClick={(event) => event.stopPropagation()}
                className="mr-1 -ml-1.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground active:cursor-grabbing"
            >
                <GripVerticalIcon className="size-3.5" aria-hidden />
            </button>
        )
    }
    /** A stacked row's selection box with its grip before it, while the rows reorder. */
    const leadWithGrip = (entry: FlatRow<T>, grip: DragHandleProps | undefined, box: ReactNode): ReactNode =>
        ordering ? (
            <>
                {rowGrip(entry.row, grip)}
                {box}
            </>
        ) : (
            box
        )
    /** A row on the drag layer once it is here, else the row as it is. */
    const reorderRow = (entry: FlatRow<T>, draw: (drag?: TableRowDrag & Record<string, unknown>) => ReactElement) =>
        reorderLayer !== undefined && ordering ? (
            <reorderLayer.TableReorderRow key={entry.key} rowKey={entry.key} label={labelOf(entry.row)} row={entry.row}>
                {draw}
            </reorderLayer.TableReorderRow>
        ) : (
            draw()
        )
    /** The rows, on the drag layer once it is here. */
    const wrapRows = (body: ReactElement) =>
        reorderLayer !== undefined && ordering && onReorder !== undefined ? (
            <reorderLayer.TableReorderArea keys={rowKeys} kind={dragKind} onReorder={onReorder} show={showRowAt}>
                {body}
            </reorderLayer.TableReorderArea>
        ) : (
            body
        )
    const withMenu = (entry: FlatRow<T>, actions: DataAction[] | undefined, body: ReactElement) =>
        actions === undefined ? (
            body
        ) : (
            <ContextMenu key={entry.key} onOpenChange={(open) => open && setActive(entry.key)}>
                <ContextMenuTrigger render={body} />
                <ContextMenuContent className="w-48">
                    <MenuItems actions={actions} kind="context" />
                </ContextMenuContent>
            </ContextMenu>
        )

    /**
     * An open row's detail, drawn under it: across the table's width under a table row, starting
     * where the row's first cell does and kept in view as the table scrolls sideways; under the card
     * of a stacked row. Its keys and presses are its own, never the table's.
     */
    const detailFor = (entry: FlatRow<T>, kind: 'row' | 'item' | 'card', ground?: string) => {
        if (!entry.open || detail === undefined) return null
        const said = detail(entry.row)
        if (said === undefined || said === null || said === false) return null
        const content = (
            <div
                role="gridcell"
                aria-colspan={kind === 'row' ? shown.length + (selectable ? 1 : 0) + (endWidth === undefined ? 0 : 1) : undefined}
                className={cn('min-w-0 text-sm', kind === 'row' && 'sticky left-0 py-3 pr-3')}
                style={
                    kind === 'row'
                        ? {
                              maxWidth: view.width,
                              paddingLeft: `calc(${selectable ? CHECK : '0rem'} + ${String(entry.depth * 1.25 + 1.5)}rem + ${list ? 'var(--density-panel-pad)' : '0.75rem'})`,
                          }
                        : kind === 'item'
                          ? { paddingLeft: `${String(entry.depth * 1.25 + 1.5)}rem` }
                          : undefined
                }
            >
                {said}
            </div>
        )
        const own = {
            key: `${entry.key}:detail`,
            role: 'row',
            'data-detail': entry.key,
            onClick: keep,
            onKeyDown: (event: KeyboardEvent) => event.stopPropagation(),
        }
        if (kind === 'item')
            return (
                <li {...own} className="px-(--density-panel-pad) pb-3">
                    {content}
                </li>
            )
        if (kind === 'card')
            return (
                <div {...own} className="min-w-0 rounded-surface border border-border bg-panel-ground px-3 py-2">
                    {content}
                </div>
            )
        return (
            <div {...own} className={cn('border-b border-border', ground)} style={{ minWidth: rowMin }}>
                {content}
            </div>
        )
    }
    /** A row's own element with its open detail after it. */
    const withDetail = (entry: FlatRow<T>, body: ReactElement, kind: 'row' | 'item' | 'card', ground?: string) => {
        const after = detailFor(entry, kind, ground)
        if (after === null) return body
        return (
            <Fragment key={entry.key}>
                {body}
                {after}
            </Fragment>
        )
    }

    /** A row as a card: the app's card, with the selection box and the menu laid over its top corners. */
    const cardFor = (entry: FlatRow<T>) => {
        const chosen = selection.has(entry.key)
        const isOpened = opened?.(entry.row) === true
        const actions = actionsOf(entry.row)
        const box = boxFor(entry)
        const menu = menuFor(actions, stacked ? 'ghost' : 'secondary')
        const title = stackParts.title
        const tone = rowTone?.(entry.row)
        // Stacked, the box, the title and the menu share the first line, and every line starts at the box's edge.
        const stackedCard = (grip: DragHandleProps | undefined) => (
            <div
                data-tone={tone}
                className={cn(
                    'flex h-full flex-col rounded-surface border border-border px-3 py-2 group-hover/card:bg-hover',
                    tone !== undefined && tone !== 'muted' ? TONE_GROUND[tone] : 'bg-card',
                    tone === 'muted' && MUTED_ITEM,
                )}
            >
                {compact ? (
                    compactRow(entry, false, leadWithGrip(entry, grip, box), menu)
                ) : (
                    <>
                        <div
                            className={cn('flex min-w-0 gap-2', title?.stackTitle === 'free' ? 'min-h-6 items-start' : 'h-6 items-center')}
                        >
                            {ordering && rowGrip(entry.row, grip)}
                            {box !== null && (
                                <span className="flex" onClick={keep}>
                                    {box}
                                </span>
                            )}
                            {opens && treeControl(entry)}
                            {leadsOf(entry, false)}
                            {/* The title keeps to its line: a cell of two lines, a name over its code, shows its first. */}
                            {title?.stackTitle === 'free' ? (
                                <span className="min-w-0 flex-1 py-0.5 text-sm font-medium">
                                    {inColumn(title.id, title.cell(entry.row))}
                                </span>
                            ) : (
                                <span className="h-6 min-w-0 flex-1 truncate text-sm leading-6 font-medium">
                                    {title === undefined ? null : inColumn(title.id, title.cell(entry.row))}
                                </span>
                            )}
                            {menu}
                        </div>
                        {stackedLines(entry, false)}
                    </>
                )}
            </div>
        )
        const draw = ({
            grip,
            ref: dragRef,
            'data-dragging': dragged,
            className: passedClass,
            ...passed
        }: TableRowDrag & Record<string, unknown> = {}) => (
            <div
                key={entry.key}
                {...passed}
                ref={dragRef}
                data-dragging={dragged}
                role="row"
                aria-selected={selectable ? chosen : opened === undefined ? undefined : isOpened}
                data-active={entry.key === active || undefined}
                onClick={(event) => press(entry, event)}
                className={cn(
                    'group/card relative min-w-0 overflow-hidden rounded-surface [&>*:first-child]:h-full',
                    pressable && 'cursor-pointer',
                    chosen ? 'ring-2 ring-primary' : isOpened && 'ring-2 ring-ring/60',
                    'group-focus-visible/table:data-active:ring-2 group-focus-visible/table:data-active:ring-ring',
                    dragged === true && 'opacity-40',
                    typeof passedClass === 'string' && passedClass,
                )}
                style={{ height: cardPixels }}
            >
                {stacked ? stackedCard(grip) : card?.(entry.row)}
                {stacked && rowAt?.key === entry.key && <RowLine part={rowAt.part} inside />}
                {!stacked && box !== null && (
                    <span
                        onClick={keep}
                        className={cn(
                            'absolute top-2 left-2 flex rounded-md bg-background/85 p-1 opacity-0 group-hover/card:opacity-100',
                            (chosen || selection.size > 0) && 'opacity-100',
                        )}
                    >
                        {box}
                    </span>
                )}
                {!stacked && menu !== null && (
                    <span
                        className={cn(
                            'absolute top-2 right-2',
                            actionButton === 'hover' && 'opacity-0 group-hover/card:opacity-100 has-data-popup-open:opacity-100',
                        )}
                    >
                        {menu}
                    </span>
                )}
            </div>
        )
        return stacked ? withDetail(entry, withMenu(entry, actions, reorderRow(entry, draw)), 'card') : withMenu(entry, actions, draw())
    }

    return (
        // Contained, so the table takes its width from its container and never widens a grid, a flex row or the page;
        // at least 15rem, so a container that sizes itself to its content still gets a readable table.
        <TableCellContext value={cell}>
            <div
                className={cn(
                    'flex min-h-0 min-w-60 flex-col overflow-hidden bg-card [contain:inline-size]',
                    framed && 'rounded-surface border border-border-strong',
                    className,
                )}
                style={{ '--stack-label': `${String(labels.width)}px` } as CSSProperties}
            >
                {barShown && (
                    <ListingBar
                        search={search}
                        toolbar={toolbar}
                        selection={
                            selection.size > 0 ? (
                                <SelectionBar
                                    count={selection.size}
                                    onClear={clear}
                                    offer={
                                        offerEvery && (
                                            <Button
                                                variant="link"
                                                size="xs"
                                                onClick={() =>
                                                    paging === 'client' ? setSelection(new Set(allKeys)) : onSelectAllPages?.()
                                                }
                                            >
                                                {words.selectEvery(everyCount)}
                                            </Button>
                                        )
                                    }
                                    words={{
                                        selected: (count) =>
                                            paging === 'client' && allChosen ? words.allSelected(allKeys.length) : words.selected(count),
                                        clear: words.clear,
                                        label: words.selection,
                                    }}
                                >
                                    {bulkActions?.(selection, clear)}
                                </SelectionBar>
                            ) : undefined
                        }
                        // An empty table says so in its own words, so the bar adds no count of nothing.
                        count={
                            selection.size > 0 || (drawn.length === 0 && !loading)
                                ? undefined
                                : hasMore && total === undefined
                                  ? words.loaded(allCount(rows, treeKids))
                                  : words.rows(total ?? allCount(rows, treeKids))
                        }
                        end={
                            <>
                                {sortMenu && selection.size === 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                                            {sort === null ? (
                                                <ArrowUpDownIcon />
                                            ) : sort.direction === 'asc' ? (
                                                <ArrowUpIcon />
                                            ) : (
                                                <ArrowDownIcon />
                                            )}
                                            {sortColumn?.header ?? words.sort}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {later !== undefined && (
                                                <later.SortChoices
                                                    columns={sortable}
                                                    sort={sort}
                                                    onColumn={(value) => {
                                                        if (paging !== undefined) setPage(0)
                                                        setSort(
                                                            value === '' ? null : { column: value, direction: sort?.direction ?? 'asc' },
                                                        )
                                                    }}
                                                    onSortChange={setSort}
                                                    words={words}
                                                />
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                {card !== undefined && !stacked && (
                                    <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
                                        {(['table', 'grid'] as const).map((one) => (
                                            <IconButton
                                                label={one === 'table' ? words.tableView : words.gridView}
                                                key={one}
                                                size="icon-xs"
                                                pressed={shownView === one}
                                                onClick={() => setShownView(one)}
                                                className={cn(
                                                    'text-muted-foreground',
                                                    shownView === one && 'bg-background text-foreground shadow-xs hover:bg-background',
                                                )}
                                            >
                                                {one === 'table' ? <TableIcon /> : <LayoutGridIcon />}
                                            </IconButton>
                                        ))}
                                    </div>
                                )}
                                {columnMenu && (
                                    <Popover>
                                        <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={words.columns} />}>
                                            <Columns3Icon />
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="end"
                                            aria-label={words.columns}
                                            className="w-64 max-w-(--available-width) gap-0 p-1"
                                        >
                                            <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">{words.columns}</p>
                                            {later !== undefined && (
                                                <later.ColumnChoices
                                                    columns={menuColumns}
                                                    hidden={hidden}
                                                    onHiddenChange={setHidden}
                                                    onMove={reorder ? move : undefined}
                                                    words={words}
                                                />
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </>
                        }
                    />
                )}
                {ordering && (
                    <span aria-live="polite" className="sr-only">
                        {rowSaid}
                    </span>
                )}
                <div
                    ref={gridBox}
                    role="grid"
                    aria-rowcount={drawn.length + 1}
                    aria-multiselectable={selectable || undefined}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    // A press on the table's empty ground, past its rows, leaves it, as a press outside would.
                    onMouseDown={(event) => {
                        if (event.target instanceof Element && event.target.closest('[role=row]') === null) {
                            event.preventDefault()
                            if (event.currentTarget.contains(document.activeElement) && document.activeElement instanceof HTMLElement)
                                document.activeElement.blur()
                        }
                    }}
                    onFocus={() => {
                        if (active === undefined && flat.length > 0)
                            setActive(flat[Math.min(first + OVERSCAN, flat.length - 1)]?.key ?? flat[0].key)
                        if (edits !== undefined) editing?.focus(edits)
                    }}
                    data-measuring={measuringContent || undefined}
                    className="group/table relative flex min-h-0 flex-1 flex-col outline-none data-measuring:[&_[data-measure=skip]]:hidden"
                >
                    {showHeads && (
                        // The head stands above the rows' scroller, so the scroll bar starts under it; it follows the
                        // rows sideways, and is padded by the width of their scroll bar so its columns stay over theirs.
                        <div
                            ref={headBox}
                            onScroll={(event) => {
                                const box = scroller.current
                                if (box !== null && box.scrollLeft !== event.currentTarget.scrollLeft)
                                    box.scrollLeft = event.currentTarget.scrollLeft
                            }}
                            className="shrink-0 overflow-hidden bg-table-head-ground bg-[linear-gradient(to_top,var(--table-head-line)_1px,transparent_1px)]"
                            style={gutter > 0 ? { paddingRight: gutter } : undefined}
                        >
                            {banded && (
                                <div
                                    role="row"
                                    className={cn(
                                        'grid items-center',
                                        TABLE_HEAD_ROW,
                                        list ? 'h-(--density-panel-head)' : 'h-(--density-row)',
                                        spaced,
                                        TABLE_HEAD_TEXT,
                                    )}
                                    style={grid}
                                >
                                    {selectable && <span aria-hidden className={cn(pinned, 'left-0 h-full')} />}
                                    {columnBands(shown).map((run) =>
                                        run.band === undefined ? (
                                            <span
                                                key={shown[run.start].id}
                                                aria-hidden
                                                className={cn(
                                                    'h-full',
                                                    run.start === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                                    bandEdge(run.start) && edge,
                                                )}
                                                style={run.start === 0 ? ({ '--check': CHECK } as React.CSSProperties) : undefined}
                                            />
                                        ) : (
                                            <span
                                                key={`band:${shown[run.start].id}`}
                                                role="columnheader"
                                                aria-colspan={run.span}
                                                title={run.band}
                                                className={cn('flex h-full min-w-0 items-center', pad, bandEdge(run.start) && edge)}
                                                style={{ gridColumn: `span ${String(run.span)}` }}
                                            >
                                                <span className="truncate">{run.band}</span>
                                            </span>
                                        ),
                                    )}
                                    {endWidth !== undefined && <span aria-hidden className={cn(pinnedEnd, 'right-0 h-full')} />}
                                </div>
                            )}
                            <div
                                role="row"
                                aria-rowindex={1}
                                className={cn(
                                    'grid items-center',
                                    TABLE_HEAD_ROW,
                                    list ? 'min-h-(--density-panel-head)' : 'min-h-(--density-row)',
                                    !tallHeads && (list ? 'h-(--density-panel-head)' : 'h-(--density-row)'),
                                    spaced,
                                    TABLE_HEAD_TEXT,
                                )}
                                style={grid}
                            >
                                {selectable && (
                                    <span role="columnheader" className={cn(pinned, 'left-0 flex h-full items-center justify-center')}>
                                        <SelectBox
                                            later={later}
                                            aria-label={words.selectAll}
                                            checked={headChosen}
                                            indeterminate={!headChosen && selection.size > 0}
                                            onCheckedChange={chooseHead}
                                        />
                                    </span>
                                )}
                                {shown.map((column, index) => {
                                    const sorted = sort?.column === column.id ? sort.direction : undefined
                                    const head = headRef(column.id)
                                    return (
                                        <span
                                            key={column.id}
                                            ref={(element) => {
                                                head.current = element
                                            }}
                                            role="columnheader"
                                            data-track={column.id}
                                            aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                                            className={cn(
                                                'relative flex h-full min-w-0 items-center',
                                                pad,
                                                column.align === 'end' && 'justify-end',
                                                column.align === 'center' && 'justify-center',
                                                tallHeads && 'py-1.5',
                                                index === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                                bandEdge(index) && edge,
                                            )}
                                            style={index === 0 ? ({ '--check': CHECK } as React.CSSProperties) : undefined}
                                        >
                                            {index === 0 && ordering && <span aria-hidden className="mr-1 w-6 shrink-0" />}
                                            {column.sortValue === undefined ? (
                                                column.head === undefined ? (
                                                    <span className="truncate" title={column.header}>
                                                        {column.header}
                                                    </span>
                                                ) : (
                                                    <span className="min-w-0">{column.head}</span>
                                                )
                                            ) : (
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => nextSort(column)}
                                                    className={cn(
                                                        // A button keeps its own case unless told, so the head's case reaches the sortable ones.
                                                        'flex min-w-0 items-center gap-1 rounded-sm [text-transform:inherit] outline-none hover:text-foreground',
                                                        column.align === 'end' && 'flex-row-reverse',
                                                        sorted !== undefined && 'text-foreground',
                                                    )}
                                                >
                                                    {column.head === undefined ? (
                                                        <span className="truncate" title={column.header}>
                                                            {column.header}
                                                        </span>
                                                    ) : (
                                                        <span className="min-w-0">{column.head}</span>
                                                    )}
                                                    {sorted === 'asc' && <ArrowUpIcon className="size-3.5 shrink-0" />}
                                                    {sorted === 'desc' && <ArrowDownIcon className="size-3.5 shrink-0" />}
                                                </button>
                                            )}
                                            {canResize && column.resizable !== false && (
                                                // The handle's keys move the column, not the active row.
                                                <span className="contents" onKeyDown={(event) => event.stopPropagation()}>
                                                    <ResizeHandle
                                                        target={head}
                                                        follow={false}
                                                        size={widths[column.id]}
                                                        onSize={(size) => setWidths({ ...widths, [column.id]: size })}
                                                        onReset={() => {
                                                            const next = { ...widths }
                                                            delete next[column.id]
                                                            setWidths(next)
                                                        }}
                                                        min={column.minSize ?? 64}
                                                        max={2000}
                                                        label={words.resize(column.header)}
                                                        className="absolute inset-y-0 right-0 mx-0 pointer-coarse:hidden"
                                                    />
                                                </span>
                                            )}
                                        </span>
                                    )
                                })}
                                {endWidth !== undefined && (
                                    <span role="columnheader" aria-label={words.actions} className={cn(pinnedEnd, 'right-0 h-full')} />
                                )}
                            </div>
                        </div>
                    )}
                    <div
                        ref={scroller}
                        onScroll={(event) => {
                            if (headBox.current !== null) headBox.current.scrollLeft = event.currentTarget.scrollLeft
                            setView({
                                top: event.currentTarget.scrollTop,
                                height: event.currentTarget.clientHeight,
                                width: event.currentTarget.clientWidth,
                                full: event.currentTarget.scrollHeight,
                            })
                        }}
                        className="relative min-h-0 flex-1 overflow-auto"
                    >
                        {/* Measures the row and card sizes without adding to what scrolls. */}
                        <div aria-hidden className="pointer-events-none invisible absolute size-0 overflow-hidden">
                            <div ref={probe} className="h-(--density-row) w-px" />
                            <div ref={cardProbe} style={{ width: cardWidth, height: cardHeight }} />
                            <div ref={widthProbe} style={{ width: rowMin }} />
                            {stacked && (
                                <div ref={labelProbe} className="w-max text-xs">
                                    <span className="block w-48" />
                                    {stackParts.lines.map(
                                        (column) =>
                                            column.stackLabel !== false && (
                                                <span key={column.id} data-label={column.id} className="block w-max whitespace-nowrap">
                                                    {columnName(column)}
                                                </span>
                                            ),
                                    )}
                                </div>
                            )}
                            <div
                                ref={stackProbe}
                                style={{
                                    width:
                                        stackBelow === false ? 0 : typeof stackBelow === 'number' ? `${String(stackBelow)}px` : stackBelow,
                                }}
                            />
                        </div>
                        {drawn.length === 0 && !loading ? (
                            empty === undefined || typeof empty === 'string' ? (
                                <p className="px-(--density-panel-pad) py-3 text-sm text-muted-foreground">{empty ?? words.empty}</p>
                            ) : (
                                empty
                            )
                        ) : listed ? (
                            wrapRows(
                                <ul className="divide-y divide-border">
                                    {drawn.map((entry) => {
                                        if (isGroupHead(entry))
                                            return (
                                                <li
                                                    key={`group:${entry.key}`}
                                                    role="row"
                                                    aria-expanded={!entry.folded}
                                                    data-group={entry.key}
                                                    onClick={() => foldGroup(entry.key)}
                                                    className="flex min-w-0 cursor-pointer items-center bg-panel-ground px-(--density-panel-pad) py-1.5 text-sm font-medium"
                                                >
                                                    {selectable && (
                                                        <span className="mr-2 flex" onClick={(event) => event.stopPropagation()}>
                                                            {groupBox(entry)}
                                                        </span>
                                                    )}
                                                    {groupTitle(entry)}
                                                </li>
                                            )
                                        const chosen = selection.has(entry.key)
                                        const isOpened = opened?.(entry.row) === true
                                        const title = stackParts.title
                                        const actions = actionsOf(entry.row)
                                        const box = boxFor(entry)
                                        const menu = menuFor(actions, 'ghost')
                                        const tone = rowTone?.(entry.row)
                                        const item = ({
                                            grip,
                                            ref: dragRef,
                                            'data-dragging': dragged,
                                            className: passedClass,
                                            ...passed
                                        }: TableRowDrag & Record<string, unknown> = {}) => (
                                            <li
                                                key={entry.key}
                                                {...passed}
                                                ref={dragRef}
                                                data-dragging={dragged}
                                                role="row"
                                                data-tone={tone}
                                                aria-selected={selectable ? chosen : opened === undefined ? undefined : isOpened}
                                                aria-expanded={entry.branch ? entry.open : undefined}
                                                aria-level={tree ? entry.depth + 1 : undefined}
                                                data-row={entry.key}
                                                data-active={entry.key === active || undefined}
                                                onClick={(event) => press(entry, event)}
                                                className={cn(
                                                    'flex flex-col gap-1 px-(--density-panel-pad) text-sm',
                                                    // A row and its open detail read as one item, with no line between them.
                                                    '[&:has(+[data-detail])]:border-b-0',
                                                    compact ? 'py-2' : 'py-2.5',
                                                    tone !== undefined && tone !== 'muted' && TONE_GROUND[tone],
                                                    tone === 'muted' && MUTED_ITEM,
                                                    hover && 'hover:bg-hover',
                                                    pressable && 'cursor-pointer',
                                                    (chosen || isOpened) && 'bg-secondary hover:bg-secondary',
                                                    'group-focus-visible/table:data-active:shadow-[inset_2px_0_0_var(--ring)]',
                                                    ordering && 'relative',
                                                    dragged === true && 'opacity-40',
                                                    typeof passedClass === 'string' && passedClass,
                                                )}
                                            >
                                                {rowAt?.key === entry.key && <RowLine part={rowAt.part} />}
                                                {compact ? (
                                                    compactRow(entry, true, leadWithGrip(entry, grip, box), menu)
                                                ) : (
                                                    <>
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            {ordering && rowGrip(entry.row, grip)}
                                                            {box !== null && (
                                                                <span className="flex" onClick={keep}>
                                                                    {box}
                                                                </span>
                                                            )}
                                                            {leadsOf(entry, true)}
                                                            {title !== undefined && (
                                                                <div
                                                                    role="gridcell"
                                                                    className="flex min-w-0 flex-1 items-center font-medium"
                                                                >
                                                                    {opens && treeControl(entry)}
                                                                    <span className="min-w-0 truncate">{title.cell(entry.row)}</span>
                                                                </div>
                                                            )}
                                                            {menu}
                                                        </div>
                                                        {stackedLines(entry, true)}
                                                    </>
                                                )}
                                            </li>
                                        )
                                        return withDetail(entry, withMenu(entry, actions, reorderRow(entry, item)), 'item')
                                    })}
                                </ul>,
                            )
                        ) : gridView && groupHeads !== undefined ? (
                            <div className="flex flex-col gap-4 p-4">
                                {groupHeads.map((head) => (
                                    <section key={head.key} data-group={head.key} aria-expanded={!head.folded}>
                                        <div className="flex min-w-0 items-center text-sm font-medium">
                                            {selectable && <span className="mr-2 flex">{groupBox(head)}</span>}
                                            {groupTitle(head)}
                                        </div>
                                        {!head.folded && (
                                            <div
                                                className="mt-2 grid gap-4"
                                                style={{ gridTemplateColumns: `repeat(${String(perLine)}, minmax(0, 1fr))` }}
                                            >
                                                {head.entries.map((entry) => cardFor(entry))}
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </div>
                        ) : gridView ? (
                            wrapRows(
                                <div className="px-4 pt-4" style={{ minHeight: lines * lineHeight + GAP }}>
                                    <div style={{ height: firstLine * lineHeight }} />
                                    <div
                                        className="grid gap-4"
                                        style={{ gridTemplateColumns: `repeat(${String(perLine)}, minmax(0, 1fr))` }}
                                    >
                                        {flat.slice(first, last).map((entry) => cardFor(entry))}
                                        {placeholders &&
                                            Array.from(
                                                {
                                                    length:
                                                        flat.length === 0
                                                            ? perLine * Math.max(1, Math.ceil(view.height / lineHeight))
                                                            : perLine,
                                                },
                                                (_, index) => (
                                                    <Skeleton
                                                        key={`loading-${String(index)}`}
                                                        className="rounded-surface"
                                                        style={{ height: cardPixels }}
                                                    />
                                                ),
                                            )}
                                    </div>
                                </div>,
                            )
                        ) : (
                            wrapRows(
                                <div
                                    style={whole ? { minWidth: rowMin } : { height: drawn.length * rowHeight, minWidth: rowMin }}
                                    className="relative"
                                >
                                    {!whole && <div style={{ height: first * rowHeight }} />}
                                    {drawn.slice(first, last).map((entry, offset) => {
                                        if (isGroupHead(entry)) return groupRow(entry, first + offset)
                                        const chosen = selection.has(entry.key)
                                        const isOpened = opened?.(entry.row) === true
                                        const state = selectable ? branchState(entry) : 'none'
                                        const actions = actionsOf(entry.row)
                                        // Every other line on the zebra's ground, counted from the table's first line so a
                                        // line keeps its stripe as the table scrolls; a row's detail shares its ground.
                                        const tone = rowTone?.(entry.row)
                                        const ground =
                                            tone !== undefined && tone !== 'muted'
                                                ? TONE_GROUND[tone]
                                                : (first + offset) % 2 === 1
                                                  ? 'bg-table-zebra'
                                                  : 'bg-card'
                                        const row = ({
                                            grip,
                                            ref: dragRef,
                                            'data-dragging': draggedRow,
                                            className: passedClass,
                                            ...passed
                                        }: TableRowDrag & Record<string, unknown> = {}) => (
                                            <div
                                                key={entry.key}
                                                {...passed}
                                                ref={dragRef}
                                                data-dragging={draggedRow}
                                                role="row"
                                                data-tone={tone}
                                                aria-rowindex={first + offset + 2}
                                                aria-selected={selectable ? chosen : opened === undefined ? undefined : isOpened}
                                                aria-expanded={entry.branch ? entry.open : undefined}
                                                aria-level={tree ? entry.depth + 1 : undefined}
                                                aria-busy={entry.waiting || undefined}
                                                data-row={entry.key}
                                                data-active={entry.key === active || undefined}
                                                onClick={(event) => press(entry, event)}
                                                className={cn(
                                                    'group/row grid cursor-default items-center border-b border-border text-sm',
                                                    ground,
                                                    tone === 'muted' && MUTED_CELLS,
                                                    spaced,
                                                    list && first + offset === drawn.length - 1 && 'border-b-0',
                                                    every ? 'min-h-(--density-row)' : 'h-(--density-row)',
                                                    hover && 'hover:bg-hover',
                                                    pressable && 'cursor-pointer',
                                                    (chosen || isOpened) && 'bg-secondary hover:bg-secondary',
                                                    'group-focus-visible/table:data-active:shadow-[inset_2px_0_0_var(--ring)]',
                                                    cellFocus === 'row' && 'group-focus-within/table:has-data-cell-active:bg-hover',
                                                    ordering && 'relative',
                                                    draggedRow === true && 'opacity-40',
                                                    typeof passedClass === 'string' && passedClass,
                                                )}
                                                style={grid}
                                            >
                                                {rowAt?.key === entry.key && <RowLine part={rowAt.part} />}
                                                {selectable && (
                                                    <span
                                                        role="gridcell"
                                                        className={cn(pinned, 'left-0 flex h-full items-center justify-center')}
                                                    >
                                                        <SelectBox
                                                            later={later}
                                                            aria-label={words.selectRow}
                                                            tabIndex={-1}
                                                            checked={state === 'all'}
                                                            indeterminate={state === 'some'}
                                                            onClick={(event) => event.stopPropagation()}
                                                            onCheckedChange={(event) => toggle(entry, event.shiftKey)}
                                                        />
                                                    </span>
                                                )}
                                                {shown.map((column, index) => {
                                                    const pinnedHere = index === 0 && pinned !== ''
                                                    const cellProps =
                                                        edits === undefined
                                                            ? undefined
                                                            : editing?.cellProps(edits, entry, column, pinnedHere)
                                                    const filled = column.fill?.(entry.row)
                                                    return (
                                                        <span
                                                            key={column.id}
                                                            role="gridcell"
                                                            data-track={column.id}
                                                            data-pinned={pinnedHere || undefined}
                                                            data-filled={
                                                                filled === undefined ? undefined : filled.solid === true ? 'solid' : 'tint'
                                                            }
                                                            {...cellProps}
                                                            className={cn(
                                                                'flex h-full min-w-0 items-center',
                                                                pad,
                                                                bandEdge(index) && edge,
                                                                every && 'py-2',
                                                                column.align === 'end' && 'justify-end tabular-nums',
                                                                column.align === 'center' && 'justify-center',
                                                                index === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                                                filled !== undefined &&
                                                                    (filled.solid === true
                                                                        ? 'bg-(--fill) text-on-fill'
                                                                        : 'bg-[color-mix(in_oklab,var(--fill)_24%,var(--card))]'),
                                                                cellProps?.className,
                                                            )}
                                                            style={
                                                                index === 0 || filled !== undefined
                                                                    ? ({
                                                                          '--check': index === 0 ? CHECK : undefined,
                                                                          '--fill': filled?.color,
                                                                      } as React.CSSProperties)
                                                                    : undefined
                                                            }
                                                        >
                                                            {index === 0 && ordering && rowGrip(entry.row, grip)}
                                                            {index === 0 && opens && treeControl(entry)}
                                                            {/* Fills its track, so a part that takes the column's width fills more than its measure. */}
                                                            <span
                                                                ref={roomOf(column.id)}
                                                                className={cn(
                                                                    'min-w-0 flex-1',
                                                                    every ? 'break-words' : 'truncate',
                                                                    column.align === 'end' && 'text-right',
                                                                    column.align === 'center' && 'text-center',
                                                                )}
                                                            >
                                                                {inColumn(
                                                                    column.id,
                                                                    edits === undefined
                                                                        ? column.cell(entry.row)
                                                                        : editing?.content(edits, entry, column),
                                                                )}
                                                            </span>
                                                        </span>
                                                    )
                                                })}
                                                {endWidth !== undefined && (
                                                    <span
                                                        role="gridcell"
                                                        className={cn(
                                                            pinnedEnd,
                                                            'right-0 flex h-full items-center justify-end gap-0.5 pr-1.5',
                                                        )}
                                                    >
                                                        {actions !== undefined && inlineSlots > 0 && (
                                                            <span className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
                                                                {actions.map((action) =>
                                                                    'separator' in action || action.inline !== true ? null : (
                                                                        <IconButton
                                                                            label={action.label}
                                                                            key={action.id}
                                                                            size="icon-xs"
                                                                            tabIndex={-1}
                                                                            disabled={action.disabled}
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                action.onSelect()
                                                                            }}
                                                                            className={cn(
                                                                                action.destructive === true &&
                                                                                    'text-destructive hover:text-destructive',
                                                                            )}
                                                                        >
                                                                            {action.icon}
                                                                        </IconButton>
                                                                    ),
                                                                )}
                                                            </span>
                                                        )}
                                                        {actions !== undefined && actionButton !== 'none' && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    render={
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon-xs"
                                                                            tabIndex={-1}
                                                                            aria-label={words.actions}
                                                                            className={cn(
                                                                                actionButton === 'hover' &&
                                                                                    'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
                                                                            )}
                                                                        />
                                                                    }
                                                                    onClick={(event) => event.stopPropagation()}
                                                                >
                                                                    {actionIcon}
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <MenuItems actions={actions} kind="dropdown" />
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                        {chevron && <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-faint" />}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                        return withDetail(entry, withMenu(entry, actions, reorderRow(entry, row)), 'row', ground)
                                    })}
                                </div>,
                            )
                        )}
                        {placeholders &&
                            !gridView &&
                            Array.from({ length: flat.length === 0 ? Math.max(3, Math.ceil(view.height / rowHeight)) : 3 }, (_, index) => (
                                <div
                                    key={`loading-${String(index)}`}
                                    aria-hidden
                                    className={cn('grid h-(--density-row) items-center border-b border-border', spaced)}
                                    style={grid}
                                >
                                    {selectable && <span />}
                                    {shown.map((column) => (
                                        <span key={column.id} className={cn('flex', pad, column.align === 'end' && 'justify-end')}>
                                            <Skeleton className="h-3 w-3/5" />
                                        </span>
                                    ))}
                                    {endWidth !== undefined && <span />}
                                </div>
                            ))}
                        {moreButton && (
                            // Kept in view as the table scrolls sideways.
                            <div className="sticky left-0 flex justify-center px-(--density-panel-pad) py-3">
                                <Button variant="outline" size="sm" disabled={loading} onClick={() => onLoadMore?.()}>
                                    {loading && <Spinner />}
                                    {words.loadMore(loadMoreCount)}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {foot !== undefined && (
                    <div className="shrink-0 border-t border-border-strong px-(--density-panel-pad) py-1.5 font-mono text-xs text-muted-foreground">
                        {foot}
                    </div>
                )}
                {paging !== undefined && (
                    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-(--density-panel-pad) py-1.5 text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">
                            {words.range(
                                pageCount === 0 ? 0 : current * pageSize + 1,
                                Math.min(pageCount, (current + 1) * pageSize),
                                pageCount,
                            )}
                        </span>
                        <label className="flex items-center gap-2">
                            {words.perPage}
                            <NativeSelect
                                size="sm"
                                value={String(pageSize)}
                                onChange={(event) => {
                                    setPage(0)
                                    setPageSize(Number(event.target.value))
                                }}
                            >
                                {pageSizes.map((size) => (
                                    <NativeSelectOption key={size} value={size}>
                                        {size}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </label>
                        <div className="ml-auto flex items-center gap-1">
                            <span className="mr-2 tabular-nums">{words.page(current + 1, pages)}</span>
                            <IconButton label={words.firstPage} disabled={current === 0} onClick={() => setPage(0)}>
                                <ChevronsLeftIcon />
                            </IconButton>
                            <IconButton label={words.previousPage} disabled={current === 0} onClick={() => setPage(current - 1)}>
                                <ChevronLeftIcon />
                            </IconButton>
                            <IconButton label={words.nextPage} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                                <ChevronRightIcon />
                            </IconButton>
                            <IconButton label={words.lastPage} disabled={current >= pages - 1} onClick={() => setPage(pages - 1)}>
                                <ChevronsRightIcon />
                            </IconButton>
                        </div>
                    </div>
                )}
            </div>
        </TableCellContext>
    )
}

/** Every row, children included, for the count in the bar. */
/** The line where a dragged row lands: at a row's top or bottom edge, inside it where the row clips what overflows. */
function RowLine({ part, inside = false }: { part: 'before' | 'after'; inside?: boolean }) {
    return (
        <span
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-x-0 z-2 h-0.5 bg-primary',
                part === 'before' ? (inside ? 'top-0' : '-top-px') : inside ? 'bottom-0' : '-bottom-px',
            )}
        />
    )
}

type TableReorder = typeof import('./table-reorder')
let tableReorder: TableReorder | undefined
let tableReorderLoad: Promise<TableReorder> | undefined

/** The rows' drag layer, fetched the first time a table that reorders is drawn, so a table that does not never carries the drag engine. */
function useTableReorder(wanted: boolean): TableReorder | undefined {
    const [loaded, setLoaded] = useState(tableReorder)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        tableReorderLoad ??= import('./table-reorder').then(
            (module) => (tableReorder = module),
            (error: unknown) => {
                tableReorderLoad = undefined
                throw error
            },
        )
        tableReorderLoad.then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return wanted ? (loaded ?? tableReorder) : undefined
}

function allCount<T>(rows: readonly T[], childRows?: (row: T) => readonly T[] | undefined): number {
    if (childRows === undefined) return rows.length
    let count = 0
    const walk = (level: readonly T[]) => {
        for (const row of level) {
            count += 1
            const children = childRows(row)
            if (children !== undefined) walk(children)
        }
    }
    walk(rows)
    return count
}

interface SelectBoxProps {
    /** `./table-deferred`, once it has loaded. */
    later: Deferred | undefined
    checked: boolean
    indeterminate?: boolean
    'aria-label': string
    tabIndex?: number
    onClick?: (event: MouseEvent) => void
    /** Called on a press, with whether Shift was held. */
    onCheckedChange: (event: { shiftKey: boolean }) => void
}

/**
 * A selection box: Base UI's checkbox once `./table-deferred` has loaded, and until then the same box
 * drawn the same way, which takes a press the same, so a table that selects nothing never loads it.
 */
function SelectBox({ later, checked, indeterminate = false, onClick, onCheckedChange, ...rest }: SelectBoxProps) {
    if (later !== undefined)
        return (
            <later.Checkbox
                {...rest}
                checked={checked}
                indeterminate={indeterminate}
                onClick={onClick}
                onCheckedChange={(_, details) => onCheckedChange({ shiftKey: (details.event as { shiftKey?: boolean }).shiftKey === true })}
            />
        )
    // Base UI marks an indeterminate box as that alone, and a box as checked or unchecked otherwise.
    const state = indeterminate ? { 'data-indeterminate': '' } : checked ? { 'data-checked': '' } : { 'data-unchecked': '' }
    return (
        <span
            role="checkbox"
            aria-checked={indeterminate ? 'mixed' : checked}
            tabIndex={0}
            {...rest}
            data-slot="checkbox"
            {...state}
            className={CHECKBOX}
            onClick={(event) => {
                onClick?.(event)
                onCheckedChange({ shiftKey: event.shiftKey })
            }}
        >
            {(checked || indeterminate) && (
                <span data-slot="checkbox-indicator" {...state} className={CHECKBOX_INDICATOR}>
                    <CheckboxMarks />
                </span>
            )}
        </span>
    )
}

/** A row's actions as the items of its button menu or its right-click menu. */
function MenuItems({ actions, kind }: { actions: DataAction[]; kind: 'dropdown' | 'context' }) {
    const Item = kind === 'dropdown' ? DropdownMenuItem : ContextMenuItem
    const Separator = kind === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator
    return actions.map((action) =>
        'separator' in action ? (
            <Separator key={action.id} />
        ) : (
            <Item
                key={action.id}
                variant={action.destructive === true ? 'destructive' : 'default'}
                disabled={action.disabled}
                // A press reaches the row through React's tree from the menu's portal; it does the item's work alone, never the row's open.
                onClick={(event) => {
                    event.stopPropagation()
                    action.onSelect()
                }}
            >
                {action.icon}
                {action.label}
            </Item>
        ),
    )
}
