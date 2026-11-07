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
    LayoutGridIcon,
    TableIcon,
} from 'lucide-react'
import {
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { cn } from '../lib/cn'
import { ResizeHandle } from './ResizeHandle'
import { SelectionBar } from './SelectionBar'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import { Skeleton } from './ui/skeleton'
import { Spinner } from './ui/spinner'
import { TABLE_HEAD_TEXT } from '../lib/table'

/** One column: its name, how wide it is, how a row draws its cell, and how it sorts. */
export interface DataColumn<T> {
    id: string
    /** The column's name, in its head and in the column menu. */
    header: string
    /** A CSS grid track: `8rem`, `minmax(12rem,1fr)`. */
    width: string
    cell: (row: T) => ReactNode
    align?: 'start' | 'end'
    /** The value the column sorts by; a column without one does not sort. */
    sortValue?: (row: T) => string | number
    /** Whether the column menu may hide it. The first column never hides. */
    hideable?: boolean
    /** Whether its head's right edge resizes it, when the table's columns resize. */
    resizable?: boolean
    /** The narrowest a drag takes it, in pixels. */
    minSize?: number
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

export interface DataSort {
    column: string
    direction: 'asc' | 'desc'
}

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
    /** A branch's control while its children load. */
    loadingChildren: string
    /** A column's resize handle. */
    resize: (column: string) => string
    empty: string
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
    loadingChildren: 'Loading',
    resize: (column) => `Resize ${column}`,
    empty: 'Nothing here.',
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
    expanded,
    order,
}: {
    rows: readonly T[]
    rowKey: (row: T) => string
    childRows?: (row: T) => readonly T[] | undefined
    /** Whether a row whose children are not known yet has any. */
    hasChildren?: (row: T) => boolean
    expanded: ReadonlySet<string>
    order: (rows: readonly T[]) => readonly T[]
}): FlatRow<T>[] {
    const flat: FlatRow<T>[] = []
    const walk = (level: readonly T[], depth: number, parent: string | undefined) => {
        for (const row of order(level)) {
            const key = rowKey(row)
            const children = childRows?.(row)
            const branch = children === undefined ? hasChildren?.(row) === true : children.length > 0
            const open = branch && expanded.has(key)
            flat.push({ row, key, depth, parent, branch, open, waiting: open && children === undefined })
            if (open && children !== undefined) walk(children, depth + 1, key)
        }
    }
    walk(rows, 0, undefined)
    return flat
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

/** The least width of a grid track: its own length, a `minmax` floor, or nothing for a fraction or `auto`. */
function trackMin(width: string): string {
    const floor = /^minmax\(\s*([^,]+?)\s*,/.exec(width)?.[1] ?? width
    return /^\d*\.?\d+(px|rem|em|ch)$/.test(floor) ? floor : '0px'
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
const NO_CHILDREN: ReadonlyMap<string, readonly unknown[]> = new Map()
const CHECK = '2.5rem'
/** Rows drawn above and below the visible ones, so a quick scroll does not show blank space. */
const OVERSCAN = 8
/** The space between cards, and around them, in pixels. */
const GAP = 16
/** A stacked card's padding and the height of each of its lines, in pixels. */
const STACK_PAD = 8
const STACK_LINE = 20

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
 * off; phones and stacked cards have no handles. A column with a `sortValue` sorts from
 * its head: up, down, then as the rows came. With `selectable`, each row gets a box; Shift picks
 * a range and Ctrl or Command a single row from anywhere on the row, and once anything is
 * selected the bar above says how many and holds `bulkActions`. With `childRows`, a row with
 * children opens and closes, children sort among themselves, and choosing a row chooses its
 * whole branch. With `hasChildren` and `loadChildren`, a branch's children load when it first
 * opens, a spinner in its control until they come. Arrow keys move through the rows, Space
 * selects, Enter opens, and Right and Left open and close a branch.
 *
 * Without `selectable`, a plain click, Enter or Space picks a row with `onOpen`, and the row
 * `opened` names is drawn and marked selected, for a list beside its detail. `variant="list"` is
 * the look of a short listing: no bar above the head (until rows are selected), the column names
 * as the box's head, the columns set apart by a gap rather than padded, and, once the box is
 * narrow, a plain divided list of rows each as tall as its lines; a `foot` line says what the bar
 * would have.
 *
 * Sort, selection, open branches, hidden columns and column widths are each held by the table
 * unless the app passes the value and hears the change.
 */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    childRows,
    hasChildren,
    loadChildren,
    expanded: expandedValue,
    defaultExpanded = EMPTY,
    onExpandedChange,
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
    onOpen,
    opened,
    rowActions,
    actionButton = 'always',
    actionIcon = <EllipsisIcon />,
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
    loading = false,
    onLoadMore,
    onSelectAllPages,
    card,
    view: viewValue,
    defaultView = 'table',
    onViewChange,
    cardWidth = '12rem',
    cardHeight = '16rem',
    stackBelow = 576,
    minWidth: ownMinWidth,
    rowHeight: rowSizing = 'fixed',
    resizable = true,
    columnWidths: widthsValue,
    defaultColumnWidths = NO_WIDTHS,
    onColumnWidthsChange,
    variant = 'table',
    foot,
    hover = true,
    words: ownWords,
    className,
}: {
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
    expanded?: ReadonlySet<string>
    defaultExpanded?: ReadonlySet<string>
    onExpandedChange?: (expanded: ReadonlySet<string>) => void
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
    /** Pressing a row or Enter on it, such as to show it in a side panel. */
    onOpen?: (row: T) => void
    /** The row shown elsewhere, drawn as chosen. */
    opened?: (row: T) => boolean
    /** What a row's menu offers: from the button at its end, and on a right-click anywhere on it. */
    rowActions?: (row: T) => DataAction[]
    /** When the menu button at a row's end shows: always, only while the pointer is over the row, or never (right-click only). */
    actionButton?: 'always' | 'hover' | 'none'
    /** The menu button's icon. */
    actionIcon?: ReactNode
    /** What the bar holds when nothing is selected, such as a search field and filters. */
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
    /** More rows exist than are given; nearing the end asks for them with `onLoadMore`. */
    hasMore?: boolean
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
     * Below this width of its own box, in pixels, and once the box is narrower than `minWidth` too,
     * the table shows each row as a card: the first column its title and every other a labeled
     * line. A table whose columns fit stays a table, so a small panel on a wide
     * screen keeps its rows. `false` keeps the table, which then scrolls sideways.
     */
    stackBelow?: number | false
    /**
     * The narrowest the columns go before the table scrolls sideways, and never narrower than the
     * columns' own least widths. `auto`: just the columns' least widths, and the table stacks below
     * `stackBelow` alone, for a short listing in a narrow place. `48rem` for a table, `auto` for a list.
     */
    minWidth?: string
    /** `auto` lets a row grow to fit its tallest cell; every row is then drawn, not only those in view. */
    rowHeight?: 'fixed' | 'auto'
    /** Whether the column heads' edges resize the columns. */
    resizable?: boolean
    /** Widths in pixels by column id; a column without one keeps its own `width`. */
    columnWidths?: Readonly<Record<string, number>>
    defaultColumnWidths?: Readonly<Record<string, number>>
    onColumnWidthsChange?: (widths: Readonly<Record<string, number>>) => void
    /** `list`: a short listing's look, with no bar above the head while nothing is selected. */
    variant?: 'table' | 'list'
    /** A line at the foot, such as how many rows are loaded. */
    foot?: ReactNode
    /** Tints the row under the pointer. */
    hover?: boolean
    words?: Partial<DataTableWords>
    className?: string
}) {
    const words = { ...WORDS, ...ownWords }
    const [sort, setSort] = useHeld(sortValue, defaultSort, onSortChange)
    const [selection, setSelection] = useHeld(selectionValue, defaultSelection, onSelectionChange)
    const [expanded, setExpanded] = useHeld(expandedValue, defaultExpanded, onExpandedChange)
    const [hidden, setHidden] = useHeld(hiddenValue, defaultHiddenColumns, onHiddenColumnsChange)
    const [widths, setWidths] = useHeld(widthsValue, defaultColumnWidths, onColumnWidthsChange)
    const auto = rowSizing === 'auto'
    const list = variant === 'list'
    const minWidth = ownMinWidth ?? (list ? 'auto' : '48rem')

    // Children loaded on demand, kept by the table unless `childRows` gives them.
    const [loaded, setLoaded] = useState(NO_CHILDREN as ReadonlyMap<string, readonly T[]>)
    const fetching = useRef(new Set<string>())
    const kids = useCallback((row: T) => childRows?.(row) ?? loaded.get(rowKey(row)), [childRows, loaded, rowKey])
    const tree = childRows !== undefined || loadChildren !== undefined
    const treeKids = tree ? kids : undefined

    const shown = columns.filter((column, index) => index === 0 || !hidden.has(column.id))
    const sortColumn = sort === null ? undefined : columns.find((column) => column.id === sort.column)
    const order = useCallback(
        (level: readonly T[]) =>
            manualSort || sort === null || sortColumn?.sortValue === undefined
                ? level
                : sortRows(level, sortColumn.sortValue, sort.direction),
        [manualSort, sort, sortColumn],
    )
    const all = useMemo(
        () =>
            flattenRows({
                rows,
                rowKey,
                childRows: treeKids,
                hasChildren: loadChildren === undefined ? undefined : hasChildren,
                expanded,
                order,
            }),
        [rows, rowKey, treeKids, hasChildren, loadChildren, expanded, order],
    )
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
    const allKeys = useMemo(
        () => (selectable ? rows.flatMap((row) => branchKeys(row, rowKey, treeKids)) : []),
        [selectable, rows, rowKey, treeKids],
    )

    // Only the rows in view are drawn: the row height is measured from the density's token.
    const scroller = useRef<HTMLDivElement>(null)
    const probe = useRef<HTMLDivElement>(null)
    const cardProbe = useRef<HTMLDivElement>(null)
    const widthProbe = useRef<HTMLDivElement>(null)
    const [columnsWidth, setColumnsWidth] = useState(768)
    const [rowHeight, setRowHeight] = useState(40)
    const [cardBox, setCardBox] = useState({ width: 192, height: 256 })
    const [view, setView] = useState({ top: 0, height: 800, width: 1200, full: 0 })
    useLayoutEffect(() => {
        const box = scroller.current
        const measure = probe.current
        const measureCard = cardProbe.current
        if (box === null || measure === null || measureCard === null) return
        const update = () => {
            setRowHeight(measure.offsetHeight || 40)
            setCardBox({ width: measureCard.offsetWidth || 192, height: measureCard.offsetHeight || 256 })
            setColumnsWidth(widthProbe.current?.offsetWidth || 768)
            setView({ top: box.scrollTop, height: box.clientHeight, width: box.clientWidth, full: box.scrollHeight })
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        observer.observe(measureCard)
        return () => observer.disconnect()
    }, [])
    const [shownView, setShownView] = useHeld(viewValue, defaultView, onViewChange)
    const chosenGrid = shownView === 'grid' && card !== undefined
    // A narrow box stacks the rows as cards, one to a line, each as tall as its columns need.
    // Only when the columns no longer fit: a box narrower than both `stackBelow` and the columns' `minWidth`.
    const stacked =
        !chosenGrid &&
        stackBelow !== false &&
        view.width > 0 &&
        view.width < (minWidth === 'auto' ? stackBelow : Math.min(stackBelow, columnsWidth))
    const gridView = chosenGrid || stacked
    const cardPixels = stacked ? STACK_PAD * 2 + 24 + Math.max(0, shown.length - 1) * STACK_LINE + 2 : cardBox.height
    // The grid is drawn a line of cards at a time; the table's line is one row.
    const perLine = stacked ? 1 : gridView ? Math.max(1, Math.floor((view.width - 2 * GAP + GAP) / (cardBox.width + GAP))) : 1
    const lineHeight = gridView ? cardPixels + GAP : rowHeight
    const lines = Math.ceil(flat.length / perLine)
    const over = gridView ? 2 : OVERSCAN
    useLayoutEffect(() => {
        if (scroller.current !== null) scroller.current.scrollTop = 0
    }, [current, pageSize, shownView])

    // Nearing the end of what has loaded asks for more, and so does a first load too short to fill the view.
    const nearEnd = view.top + view.height >= (auto && !gridView ? view.full : lines * lineHeight) - lineHeight * over
    useEffect(() => {
        if (hasMore && !loading && nearEnd) onLoadMore?.()
    }, [hasMore, loading, nearEnd, onLoadMore])

    // Rows that grow are all drawn, as their heights are not known before they are.
    // A narrow list is a plain list of rows as tall as their lines.
    const listed = list && stacked
    const every = (auto && !gridView) || listed
    const firstLine = every ? 0 : Math.max(0, Math.floor(view.top / lineHeight) - over)
    const lastLine = every ? lines : Math.min(lines, Math.ceil((view.top + view.height) / lineHeight) + over)
    const first = firstLine * perLine
    const last = Math.min(flat.length, lastLine * perLine)

    const [active, setActive] = useState<string | undefined>(undefined)
    const anchor = useRef<string | undefined>(undefined)

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
    const endWidth =
        rowActions === undefined || (actionButton === 'none' && inlineSlots === 0)
            ? undefined
            : `${String((actionButton === 'none' ? 0.5 : 2.5) + inlineSlots * 1.75)}rem`
    const track = (column: DataColumn<T>) => (widths[column.id] === undefined ? column.width : `${String(widths[column.id])}px`)
    const template = [selectable ? CHECK : undefined, ...shown.map(track), endWidth].filter(Boolean).join(' ')
    // The rows are never narrower than their columns' least widths, so a widened column scrolls the table sideways.
    const least = [selectable ? CHECK : undefined, ...shown.map((column) => trackMin(track(column))), endWidth].filter(Boolean)
    if (list) least.push('2 * var(--density-panel-pad)', `${String(0.75 * (least.length - 1))}rem`)
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
        if (every) {
            box.querySelector(`[data-row="${CSS.escape(entry.key)}"]`)?.scrollIntoView({ block: 'nearest' })
            return
        }
        const at = Math.floor(flat.indexOf(entry) / perLine) * lineHeight
        const head = gridView ? 0 : rowHeight
        if (at < box.scrollTop) box.scrollTop = at
        else if (at + lineHeight > box.scrollTop + box.clientHeight - head) box.scrollTop = at + lineHeight - box.clientHeight + head
    }
    const activeIndex = active === undefined ? -1 : flat.findIndex((entry) => entry.key === active)
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const page = Math.max(1, Math.floor(view.height / lineHeight) - 1) * perLine
        const entry = flat[activeIndex]
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
                else onOpen?.(entry.row)
            },
            Enter: () => {
                if (entry !== undefined) onOpen?.(entry.row)
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
        setActive(entry.key)
        if (selectable && event.shiftKey) toggle(entry, true)
        else if (selectable && (event.metaKey || event.ctrlKey)) toggle(entry, false)
        else onOpen?.(entry.row)
    }

    /** A branch row's selection: all of it, part of it, or none. */
    const branchState = (entry: FlatRow<T>): 'all' | 'some' | 'none' => {
        if (selection.has(entry.key)) return 'all'
        if (!entry.branch || selection.size === 0) return 'none'
        return branchKeys(entry.row, rowKey, treeKids).some((key) => selection.has(key)) ? 'some' : 'none'
    }

    const hideable = columns.filter((column, index) => index > 0 && column.hideable !== false)
    const sortable = manualSort && onSortChange === undefined ? [] : columns.filter((column) => column.sortValue !== undefined)
    // A list pins nothing and sets its columns apart with a gap; a table pins its first and last columns and pads its cells.
    const pinned = list ? '' : 'sticky z-[1] bg-inherit shadow-[1px_0_0_var(--border)]'
    const pinnedEnd = list ? '' : 'sticky z-[1] bg-inherit shadow-[-1px_0_0_var(--border)]'
    const pad = list ? '' : 'px-3'
    const spaced = list && 'gap-3 px-(--density-panel-pad)'

    /** A tree row's indent and its control: open or close, or a spinner while its children load. */
    const treeControl = (entry: FlatRow<T>) => (
        <span className="flex shrink-0 items-center" style={{ paddingLeft: `${String(entry.depth * 1.25)}rem` }}>
            {entry.waiting ? (
                <span className="mr-1 flex size-5 items-center justify-center text-muted-foreground">
                    <Spinner className="size-3.5" aria-label={words.loadingChildren} />
                </span>
            ) : entry.branch ? (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={entry.open ? words.collapse : words.expand}
                    onClick={(event) => {
                        event.stopPropagation()
                        setActive(entry.key)
                        openBranch(entry.key, !entry.open)
                    }}
                    className="mr-1 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <ChevronRightIcon className={cn('size-3.5 transition-transform', entry.open && 'rotate-90')} />
                </button>
            ) : (
                <span className="mr-1 size-5" />
            )}
        </span>
    )

    /** A row as a card: the app's card, with the selection box and the menu laid over its top corners. */
    const cardFor = (entry: FlatRow<T>) => {
        const chosen = selection.has(entry.key)
        const isOpened = opened?.(entry.row) === true
        const actions = actionsOf(entry.row)
        const box = selectable ? (
            <Checkbox aria-label={words.selectRow} tabIndex={-1} checked={chosen} onCheckedChange={() => toggle(entry, false)} />
        ) : null
        const menu =
            actions === undefined || actionButton === 'none' ? null : (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant={stacked ? 'ghost' : 'secondary'} size="icon-xs" tabIndex={-1} aria-label={words.actions} />
                        }
                        onClick={(event) => event.stopPropagation()}
                    >
                        {actionIcon}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <MenuItems actions={actions} kind="dropdown" />
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        const [title, ...rest] = shown
        // Stacked, the box, the title and the menu share the first line, and every line starts at the box's edge.
        const stackedCard = (
            <div className="flex h-full flex-col rounded-surface border border-border bg-card px-3 py-2 group-hover/card:bg-hover">
                <div className="flex h-6 min-w-0 items-center gap-2">
                    {box !== null && (
                        <span className="flex" onClick={(event) => event.stopPropagation()}>
                            {box}
                        </span>
                    )}
                    {tree && treeControl(entry)}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{title?.cell(entry.row)}</span>
                    {menu}
                </div>
                {rest.map((column) => (
                    <div key={column.id} className="flex h-5 min-w-0 items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 truncate text-muted-foreground">{column.header}</span>
                        <span className="min-w-0 truncate">{column.cell(entry.row)}</span>
                    </div>
                ))}
            </div>
        )
        const body = (
            <div
                key={entry.key}
                role="row"
                aria-selected={selectable ? chosen : opened === undefined ? undefined : isOpened}
                data-active={entry.key === active || undefined}
                onClick={(event) => press(entry, event)}
                className={cn(
                    'group/card relative min-w-0 overflow-hidden rounded-surface',
                    onOpen !== undefined && 'cursor-pointer',
                    chosen ? 'ring-2 ring-primary' : isOpened && 'ring-2 ring-ring/60',
                    'group-focus-visible/table:data-active:ring-2 group-focus-visible/table:data-active:ring-ring',
                )}
                style={{ height: cardPixels }}
            >
                {stacked ? stackedCard : card?.(entry.row)}
                {!stacked && box !== null && (
                    <span
                        onClick={(event) => event.stopPropagation()}
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
        if (actions === undefined) return body
        return (
            <ContextMenu key={entry.key} onOpenChange={(open) => open && setActive(entry.key)}>
                <ContextMenuTrigger render={body} />
                <ContextMenuContent className="w-48">
                    <MenuItems actions={actions} kind="context" />
                </ContextMenuContent>
            </ContextMenu>
        )
    }

    return (
        // Contained, so the table takes its width from its container and never widens a grid, a flex row or the page;
        // at least 15rem, so a container that sizes itself to its content still gets a readable table.
        <div
            className={cn(
                'flex min-h-0 min-w-60 flex-col overflow-hidden rounded-surface border border-border-strong bg-card [contain:inline-size]',
                className,
            )}
        >
            {(!list || selection.size > 0) && (
                <div className="flex min-h-(--density-panel-head) shrink-0 items-center gap-2 border-b border-border px-(--density-panel-pad) text-sm">
                    {selection.size > 0 ? (
                        <SelectionBar
                            count={selection.size}
                            onClear={clear}
                            offer={
                                offerEvery && (
                                    <Button
                                        variant="link"
                                        size="xs"
                                        onClick={() => (paging === 'client' ? setSelection(new Set(allKeys)) : onSelectAllPages?.())}
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
                    ) : (
                        // The tools wrap onto more lines when the bar is too narrow for them, so none is hidden.
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 py-0.5">{toolbar}</div>
                    )}
                    {selection.size === 0 && (
                        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                            {hasMore && total === undefined
                                ? words.loaded(allCount(rows, treeKids))
                                : words.rows(total ?? allCount(rows, treeKids))}
                        </span>
                    )}
                    {gridView && selection.size === 0 && sortable.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                                {sort === null ? <ArrowUpDownIcon /> : sort.direction === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                {sortColumn?.header ?? words.sort}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>{words.sort}</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={sort?.column ?? ''}
                                        onValueChange={(value: string) => {
                                            if (paging !== undefined) setPage(0)
                                            setSort(value === '' ? null : { column: value, direction: sort?.direction ?? 'asc' })
                                        }}
                                    >
                                        <DropdownMenuRadioItem value="">{words.unsorted}</DropdownMenuRadioItem>
                                        {sortable.map((column) => (
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
                                                setSort({ column: sort.column, direction: value === 'desc' ? 'desc' : 'asc' })
                                            }
                                        >
                                            <DropdownMenuRadioItem value="asc">{words.ascending}</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="desc">{words.descending}</DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </>
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
                    {!gridView && hideable.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={words.columns} />}>
                                <Columns3Icon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>{words.columns}</DropdownMenuLabel>
                                    {hideable.map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            checked={!hidden.has(column.id)}
                                            onCheckedChange={(on) => {
                                                const next = new Set(hidden)
                                                if (on) next.delete(column.id)
                                                else next.add(column.id)
                                                setHidden(next)
                                            }}
                                        >
                                            {column.header}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            )}
            <div
                ref={scroller}
                role="grid"
                aria-rowcount={flat.length + 1}
                aria-multiselectable={selectable || undefined}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onFocus={() => {
                    if (active === undefined && flat.length > 0)
                        setActive(flat[Math.min(first + OVERSCAN, flat.length - 1)]?.key ?? flat[0].key)
                }}
                onScroll={(event) =>
                    setView({
                        top: event.currentTarget.scrollTop,
                        height: event.currentTarget.clientHeight,
                        width: event.currentTarget.clientWidth,
                        full: event.currentTarget.scrollHeight,
                    })
                }
                className="group/table relative min-h-0 flex-1 overflow-auto outline-none"
            >
                {/* Measures the row and card sizes without adding to what scrolls. */}
                <div aria-hidden className="pointer-events-none invisible absolute size-0 overflow-hidden">
                    <div ref={probe} className="h-(--density-row) w-px" />
                    <div ref={cardProbe} style={{ width: cardWidth, height: cardHeight }} />
                    <div ref={widthProbe} style={{ width: rowMin }} />
                </div>
                {!gridView && (
                    <div
                        role="row"
                        aria-rowindex={1}
                        className={cn(
                            'sticky top-0 z-[2] grid items-center border-b border-border-strong bg-panel-ground',
                            list ? 'h-(--density-panel-head)' : 'h-(--density-row)',
                            spaced,
                            TABLE_HEAD_TEXT,
                        )}
                        style={grid}
                    >
                        {selectable && (
                            <span role="columnheader" className={cn(pinned, 'left-0 flex h-full items-center justify-center')}>
                                <Checkbox
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
                                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                                    className={cn(
                                        'relative flex h-full min-w-0 items-center',
                                        pad,
                                        column.align === 'end' && 'justify-end',
                                        index === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                    )}
                                    style={index === 0 ? ({ '--check': CHECK } as React.CSSProperties) : undefined}
                                >
                                    {column.sortValue === undefined ? (
                                        <span className="truncate">{column.header}</span>
                                    ) : (
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => nextSort(column)}
                                            className={cn(
                                                'flex min-w-0 items-center gap-1 rounded-sm outline-none hover:text-foreground',
                                                column.align === 'end' && 'flex-row-reverse',
                                                sorted !== undefined && 'text-foreground',
                                            )}
                                        >
                                            <span className="truncate">{column.header}</span>
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
                )}
                {flat.length === 0 && !loading ? (
                    <p className="px-(--density-panel-pad) py-3 text-sm text-muted-foreground">{words.empty}</p>
                ) : listed ? (
                    <ul className="divide-y divide-border">
                        {flat.map((entry) => {
                            const isOpened = opened?.(entry.row) === true
                            const [title, ...rest] = shown
                            return (
                                <li
                                    key={entry.key}
                                    role="row"
                                    aria-selected={opened === undefined ? undefined : isOpened}
                                    aria-expanded={entry.branch ? entry.open : undefined}
                                    aria-level={tree ? entry.depth + 1 : undefined}
                                    data-row={entry.key}
                                    data-active={entry.key === active || undefined}
                                    onClick={(event) => press(entry, event)}
                                    className={cn(
                                        'flex flex-col gap-1 px-(--density-panel-pad) py-2.5 text-sm',
                                        hover && 'hover:bg-hover',
                                        onOpen !== undefined && 'cursor-pointer',
                                        isOpened && 'bg-secondary hover:bg-secondary',
                                        'group-focus-visible/table:data-active:shadow-[inset_2px_0_0_var(--ring)]',
                                    )}
                                >
                                    {title !== undefined && (
                                        <div role="gridcell" className="flex min-w-0 items-center font-medium">
                                            {tree && treeControl(entry)}
                                            <span className="min-w-0 truncate">{title.cell(entry.row)}</span>
                                        </div>
                                    )}
                                    {rest.map((column) => {
                                        // A line with nothing to say is left out, and a tree's lines sit under its name.
                                        const value = column.cell(entry.row)
                                        if (value === null || value === undefined || value === false || value === '') return null
                                        return (
                                            <div
                                                key={column.id}
                                                role="gridcell"
                                                className="flex min-w-0 items-baseline gap-2 text-xs"
                                                style={tree ? { paddingLeft: `${String(entry.depth * 1.25 + 1.5)}rem` } : undefined}
                                            >
                                                <span className="w-20 shrink-0 text-muted-foreground">{column.header}</span>
                                                <span className="min-w-0 truncate">{value}</span>
                                            </div>
                                        )
                                    })}
                                </li>
                            )
                        })}
                    </ul>
                ) : gridView ? (
                    <div className="px-4 pt-4" style={{ minHeight: lines * lineHeight + GAP }}>
                        <div style={{ height: firstLine * lineHeight }} />
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${String(perLine)}, minmax(0, 1fr))` }}>
                            {flat.slice(first, last).map((entry) => cardFor(entry))}
                            {loading &&
                                Array.from(
                                    { length: flat.length === 0 ? perLine * Math.max(1, Math.ceil(view.height / lineHeight)) : perLine },
                                    (_, index) => (
                                        <Skeleton
                                            key={`loading-${String(index)}`}
                                            className="rounded-surface"
                                            style={{ height: cardPixels }}
                                        />
                                    ),
                                )}
                        </div>
                    </div>
                ) : (
                    <div style={every ? { minWidth: rowMin } : { height: flat.length * rowHeight, minWidth: rowMin }} className="relative">
                        {!every && <div style={{ height: first * rowHeight }} />}
                        {flat.slice(first, last).map((entry, offset) => {
                            const chosen = selection.has(entry.key)
                            const isOpened = opened?.(entry.row) === true
                            const state = selectable ? branchState(entry) : 'none'
                            const actions = actionsOf(entry.row)
                            const row = (
                                <div
                                    key={entry.key}
                                    role="row"
                                    aria-rowindex={first + offset + 2}
                                    aria-selected={selectable ? chosen : opened === undefined ? undefined : isOpened}
                                    aria-expanded={entry.branch ? entry.open : undefined}
                                    aria-level={tree ? entry.depth + 1 : undefined}
                                    aria-busy={entry.waiting || undefined}
                                    data-row={entry.key}
                                    data-active={entry.key === active || undefined}
                                    onClick={(event) => press(entry, event)}
                                    className={cn(
                                        'group/row grid cursor-default items-center border-b border-border bg-card text-sm',
                                        spaced,
                                        list && first + offset === flat.length - 1 && 'border-b-0',
                                        every ? 'min-h-(--density-row) scroll-mt-(--density-row)' : 'h-(--density-row)',
                                        hover && 'hover:bg-hover',
                                        onOpen !== undefined && 'cursor-pointer',
                                        (chosen || isOpened) && 'bg-secondary hover:bg-secondary',
                                        'group-focus-visible/table:data-active:shadow-[inset_2px_0_0_var(--ring)]',
                                    )}
                                    style={grid}
                                >
                                    {selectable && (
                                        <span role="gridcell" className={cn(pinned, 'left-0 flex h-full items-center justify-center')}>
                                            <Checkbox
                                                aria-label={words.selectRow}
                                                tabIndex={-1}
                                                checked={state === 'all'}
                                                indeterminate={state === 'some'}
                                                onClick={(event) => event.stopPropagation()}
                                                onCheckedChange={(_, details) => {
                                                    const shift = (details.event as unknown as { shiftKey?: boolean }).shiftKey === true
                                                    toggle(entry, shift)
                                                }}
                                            />
                                        </span>
                                    )}
                                    {shown.map((column, index) => (
                                        <span
                                            key={column.id}
                                            role="gridcell"
                                            className={cn(
                                                'flex h-full min-w-0 items-center',
                                                pad,
                                                every && 'py-2',
                                                column.align === 'end' && 'justify-end tabular-nums',
                                                index === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                            )}
                                            style={index === 0 ? ({ '--check': CHECK } as React.CSSProperties) : undefined}
                                        >
                                            {index === 0 && tree && treeControl(entry)}
                                            <span
                                                className={cn(
                                                    'min-w-0',
                                                    every ? 'break-words' : 'truncate',
                                                    column.align === 'end' && 'text-right',
                                                )}
                                            >
                                                {column.cell(entry.row)}
                                            </span>
                                        </span>
                                    ))}
                                    {endWidth !== undefined && (
                                        <span
                                            role="gridcell"
                                            className={cn(pinnedEnd, 'right-0 flex h-full items-center justify-end gap-0.5 pr-1.5')}
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
                                        </span>
                                    )}
                                </div>
                            )
                            if (actions === undefined) return row
                            return (
                                <ContextMenu key={entry.key} onOpenChange={(open) => open && setActive(entry.key)}>
                                    <ContextMenuTrigger render={row} />
                                    <ContextMenuContent className="w-48">
                                        <MenuItems actions={actions} kind="context" />
                                    </ContextMenuContent>
                                </ContextMenu>
                            )
                        })}
                    </div>
                )}
                {loading &&
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
    )
}

/** Every row, children included, for the count in the bar. */
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
                onClick={action.onSelect}
            >
                {action.icon}
                {action.label}
            </Item>
        ),
    )
}
