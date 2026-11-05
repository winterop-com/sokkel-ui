import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, Columns3Icon, EllipsisIcon } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../lib/cn'
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

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
    rows: (count: number) => string
    selected: (count: number) => string
    clear: string
    selectAll: string
    selectRow: string
    expand: string
    collapse: string
    empty: string
}

const WORDS: DataTableWords = {
    columns: 'Columns',
    actions: 'Actions',
    rows: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'row' : 'rows'}`,
    selected: (count) => `${count.toLocaleString('en-US')} selected`,
    clear: 'Clear',
    selectAll: 'Select all rows',
    selectRow: 'Select row',
    expand: 'Expand',
    collapse: 'Collapse',
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
    expanded,
    order,
}: {
    rows: readonly T[]
    rowKey: (row: T) => string
    childRows?: (row: T) => readonly T[] | undefined
    expanded: ReadonlySet<string>
    order: (rows: readonly T[]) => readonly T[]
}): FlatRow<T>[] {
    const flat: FlatRow<T>[] = []
    const walk = (level: readonly T[], depth: number, parent: string | undefined) => {
        for (const row of order(level)) {
            const key = rowKey(row)
            const children = childRows?.(row)
            const branch = children !== undefined && children.length > 0
            const open = branch && expanded.has(key)
            flat.push({ row, key, depth, parent, branch, open })
            if (open) walk(children, depth + 1, key)
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
const CHECK = '2.5rem'
/** Rows drawn above and below the visible ones, so a quick scroll does not show blank space. */
const OVERSCAN = 8

/**
 * A table for many rows: sorting, selection with a bulk bar, a column menu, child rows, and the
 * keyboard. Only the rows in view are drawn, so fifty thousand scroll as smoothly as fifty.
 *
 * Rows are one line at the density's row height. The head stays put while the rows scroll, and
 * the first column stays put while they scroll sideways. A column with a `sortValue` sorts from
 * its head: up, down, then as the rows came. With `selectable`, each row gets a box; Shift picks
 * a range and Ctrl or Command a single row from anywhere on the row, and once anything is
 * selected the bar above says how many and holds `bulkActions`. With `childRows`, a row with
 * children opens and closes, children sort among themselves, and choosing a row chooses its
 * whole branch. Arrow keys move through the rows, Space selects, Enter opens, and Right and Left
 * open and close a branch.
 *
 * Sort, selection, open branches and hidden columns are each held by the table unless the app
 * passes the value and hears the change.
 */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    childRows,
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
    minWidth = '48rem',
    words: ownWords,
    className,
}: {
    columns: DataColumn<T>[]
    rows: readonly T[]
    rowKey: (row: T) => string
    /** A row's children; a row with any is drawn with a control to open it. */
    childRows?: (row: T) => readonly T[] | undefined
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
    /** The narrowest the columns go before the table scrolls sideways. */
    minWidth?: string
    words?: Partial<DataTableWords>
    className?: string
}) {
    const words = { ...WORDS, ...ownWords }
    const [sort, setSort] = useHeld(sortValue, defaultSort, onSortChange)
    const [selection, setSelection] = useHeld(selectionValue, defaultSelection, onSelectionChange)
    const [expanded, setExpanded] = useHeld(expandedValue, defaultExpanded, onExpandedChange)
    const [hidden, setHidden] = useHeld(hiddenValue, defaultHiddenColumns, onHiddenColumnsChange)

    const shown = columns.filter((column, index) => index === 0 || !hidden.has(column.id))
    const sortColumn = sort === null ? undefined : columns.find((column) => column.id === sort.column)
    const order = useCallback(
        (level: readonly T[]) =>
            manualSort || sort === null || sortColumn?.sortValue === undefined
                ? level
                : sortRows(level, sortColumn.sortValue, sort.direction),
        [manualSort, sort, sortColumn],
    )
    const flat = useMemo(() => flattenRows({ rows, rowKey, childRows, expanded, order }), [rows, rowKey, childRows, expanded, order])
    const allKeys = useMemo(
        () => (selectable ? rows.flatMap((row) => branchKeys(row, rowKey, childRows)) : []),
        [selectable, rows, rowKey, childRows],
    )

    // Only the rows in view are drawn: the row height is measured from the density's token.
    const scroller = useRef<HTMLDivElement>(null)
    const probe = useRef<HTMLDivElement>(null)
    const [rowHeight, setRowHeight] = useState(40)
    const [view, setView] = useState({ top: 0, height: 800 })
    useLayoutEffect(() => {
        const box = scroller.current
        const measure = probe.current
        if (box === null || measure === null) return
        const update = () => {
            setRowHeight(measure.offsetHeight || 40)
            setView({ top: box.scrollTop, height: box.clientHeight })
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        return () => observer.disconnect()
    }, [])
    const first = Math.max(0, Math.floor(view.top / rowHeight) - OVERSCAN)
    const last = Math.min(flat.length, Math.ceil((view.top + view.height) / rowHeight) + OVERSCAN)

    const [active, setActive] = useState<string | undefined>(undefined)
    const anchor = useRef<string | undefined>(undefined)

    // The end column fits the inline actions the first row has, and the menu button unless it is off.
    const inlineSlots =
        rowActions === undefined || rows.length === 0
            ? 0
            : rowActions(rows[0]).filter((action) => !('separator' in action) && action.inline === true).length
    const endWidth =
        rowActions === undefined || (actionButton === 'none' && inlineSlots === 0)
            ? undefined
            : `${String((actionButton === 'none' ? 0.5 : 2.5) + inlineSlots * 1.75)}rem`
    const template = [selectable ? CHECK : undefined, ...shown.map((column) => column.width), endWidth].filter(Boolean).join(' ')
    const grid = { gridTemplateColumns: template, minWidth }

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
            for (const key of branchKeys(entry.row, rowKey, childRows)) {
                if (on) next.add(key)
                else next.delete(key)
            }
        }
        anchor.current = entry.key
        setSelection(next)
    }
    const clear = () => setSelection(new Set())
    const allChosen = allKeys.length > 0 && selection.size >= allKeys.length && allKeys.every((key) => selection.has(key))

    const openBranch = (key: string, open: boolean) => {
        const next = new Set(expanded)
        if (open) next.add(key)
        else next.delete(key)
        setExpanded(next)
    }

    const nextSort = (column: DataColumn<T>) => {
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
        const at = flat.indexOf(entry) * rowHeight
        const head = rowHeight
        if (at < box.scrollTop) box.scrollTop = at
        else if (at + rowHeight > box.scrollTop + box.clientHeight - head) box.scrollTop = at + rowHeight - box.clientHeight + head
    }
    const activeIndex = active === undefined ? -1 : flat.findIndex((entry) => entry.key === active)
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const page = Math.max(1, Math.floor(view.height / rowHeight) - 1)
        const entry = flat[activeIndex]
        const moves: Record<string, () => void> = {
            ArrowDown: () => moveTo(activeIndex + 1),
            ArrowUp: () => moveTo(Math.max(0, activeIndex - 1)),
            PageDown: () => moveTo(activeIndex + page),
            PageUp: () => moveTo(Math.max(0, activeIndex - page)),
            Home: () => moveTo(0),
            End: () => moveTo(flat.length - 1),
            ' ': () => {
                if (selectable && entry !== undefined) toggle(entry, event.shiftKey)
            },
            Enter: () => {
                if (entry !== undefined) onOpen?.(entry.row)
            },
            ArrowRight: () => {
                if (entry?.branch === true && !entry.open) openBranch(entry.key, true)
            },
            ArrowLeft: () => {
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
        return branchKeys(entry.row, rowKey, childRows).some((key) => selection.has(key)) ? 'some' : 'none'
    }

    const hideable = columns.filter((column, index) => index > 0 && column.hideable !== false)
    const pinned = 'sticky z-[1] bg-inherit shadow-[1px_0_0_var(--border)]'
    const pinnedEnd = 'sticky z-[1] bg-inherit shadow-[-1px_0_0_var(--border)]'

    return (
        <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card', className)}>
            <div className="flex h-(--density-panel-head) shrink-0 items-center gap-2 border-b border-border px-(--density-panel-pad) text-sm">
                {selection.size > 0 ? (
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="font-medium tabular-nums">{words.selected(selection.size)}</span>
                        <Button variant="ghost" size="xs" onClick={clear}>
                            {words.clear}
                        </Button>
                        {bulkActions?.(selection, clear)}
                    </div>
                ) : (
                    <div className="flex min-w-0 items-center gap-2">{toolbar}</div>
                )}
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {words.rows(total ?? allCount(rows, childRows))}
                </span>
                {hideable.length > 0 && (
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
                onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
                className="group/table relative min-h-0 flex-1 overflow-auto outline-none"
            >
                <div ref={probe} aria-hidden className="pointer-events-none invisible absolute h-(--density-row) w-px" />
                <div
                    role="row"
                    aria-rowindex={1}
                    className="sticky top-0 z-[2] grid h-(--density-row) items-center border-b border-border-strong bg-panel-ground text-[length:var(--table-head-size)] font-[number:var(--table-head-weight)] tracking-[var(--table-head-tracking)] text-muted-foreground [text-transform:var(--table-head-transform)]"
                    style={grid}
                >
                    {selectable && (
                        <span role="columnheader" className={cn(pinned, 'left-0 flex h-full items-center justify-center')}>
                            <Checkbox
                                aria-label={words.selectAll}
                                checked={allChosen}
                                indeterminate={!allChosen && selection.size > 0}
                                onCheckedChange={() => setSelection(allChosen ? new Set() : new Set(allKeys))}
                            />
                        </span>
                    )}
                    {shown.map((column, index) => {
                        const sorted = sort?.column === column.id ? sort.direction : undefined
                        return (
                            <span
                                key={column.id}
                                role="columnheader"
                                aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                                className={cn(
                                    'flex h-full min-w-0 items-center px-3',
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
                            </span>
                        )
                    })}
                    {endWidth !== undefined && (
                        <span role="columnheader" aria-label={words.actions} className={cn(pinnedEnd, 'right-0 h-full')} />
                    )}
                </div>
                {flat.length === 0 ? (
                    <p className="px-(--density-panel-pad) py-3 text-sm text-muted-foreground">{words.empty}</p>
                ) : (
                    <div style={{ height: flat.length * rowHeight, minWidth }} className="relative">
                        <div style={{ height: first * rowHeight }} />
                        {flat.slice(first, last).map((entry, offset) => {
                            const chosen = selection.has(entry.key)
                            const isOpened = opened?.(entry.row) === true
                            const state = selectable ? branchState(entry) : 'none'
                            const actions = rowActions?.(entry.row)
                            const row = (
                                <div
                                    key={entry.key}
                                    role="row"
                                    aria-rowindex={first + offset + 2}
                                    aria-selected={selectable ? chosen : undefined}
                                    aria-expanded={entry.branch ? entry.open : undefined}
                                    aria-level={childRows === undefined ? undefined : entry.depth + 1}
                                    data-active={entry.key === active || undefined}
                                    onClick={(event) => press(entry, event)}
                                    className={cn(
                                        'group/row grid h-(--density-row) cursor-default items-center border-b border-border bg-card text-sm hover:bg-muted',
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
                                                'flex h-full min-w-0 items-center px-3',
                                                column.align === 'end' && 'justify-end tabular-nums',
                                                index === 0 && cn(pinned, selectable ? 'left-(--check)' : 'left-0'),
                                            )}
                                            style={index === 0 ? ({ '--check': CHECK } as React.CSSProperties) : undefined}
                                        >
                                            {index === 0 && childRows !== undefined && (
                                                <span
                                                    className="flex shrink-0 items-center"
                                                    style={{ paddingLeft: `${String(entry.depth * 1.25)}rem` }}
                                                >
                                                    {entry.branch ? (
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
                                                            <ChevronRightIcon
                                                                className={cn('size-3.5 transition-transform', entry.open && 'rotate-90')}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <span className="mr-1 size-5" />
                                                    )}
                                                </span>
                                            )}
                                            <span className={cn('min-w-0 truncate', column.align === 'end' && 'text-right')}>
                                                {column.cell(entry.row)}
                                            </span>
                                        </span>
                                    ))}
                                    {actions !== undefined && endWidth !== undefined && (
                                        <span
                                            role="gridcell"
                                            className={cn(pinnedEnd, 'right-0 flex h-full items-center justify-end gap-0.5 pr-1.5')}
                                        >
                                            {inlineSlots > 0 && (
                                                <span className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
                                                    {actions.map((action) =>
                                                        'separator' in action || action.inline !== true ? null : (
                                                            <Button
                                                                key={action.id}
                                                                variant="ghost"
                                                                size="icon-xs"
                                                                tabIndex={-1}
                                                                aria-label={action.label}
                                                                title={action.label}
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
                                                            </Button>
                                                        ),
                                                    )}
                                                </span>
                                            )}
                                            {actionButton !== 'none' && (
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
                                                        {actions.map((action) =>
                                                            'separator' in action ? (
                                                                <DropdownMenuSeparator key={action.id} />
                                                            ) : (
                                                                <DropdownMenuItem
                                                                    key={action.id}
                                                                    variant={action.destructive === true ? 'destructive' : 'default'}
                                                                    disabled={action.disabled}
                                                                    onClick={action.onSelect}
                                                                >
                                                                    {action.icon}
                                                                    {action.label}
                                                                </DropdownMenuItem>
                                                            ),
                                                        )}
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
                                        {actions.map((action) =>
                                            'separator' in action ? (
                                                <ContextMenuSeparator key={action.id} />
                                            ) : (
                                                <ContextMenuItem
                                                    key={action.id}
                                                    variant={action.destructive === true ? 'destructive' : 'default'}
                                                    disabled={action.disabled}
                                                    onClick={action.onSelect}
                                                >
                                                    {action.icon}
                                                    {action.label}
                                                </ContextMenuItem>
                                            ),
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            )
                        })}
                    </div>
                )}
            </div>
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
