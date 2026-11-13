import { CircleAlertIcon } from 'lucide-react'
import type { CSSProperties, Dispatch, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, RefObject, SetStateAction } from 'react'

import { cn } from '../lib/cn'
import { columnName } from '../lib/table'
import {
    draftOf,
    EDIT_WORDS,
    failureOf,
    nextColumn,
    nextEditableCell,
    readDraft,
    shownValue,
    typesInto,
    type CellAt,
    type EditMove,
    type EditValue,
    type EditWords,
} from '../lib/edit'
import type { DataColumn, DataTableWords, FlatRow } from './DataTable'
import { InlineEditor } from './inline-edit-parts'
import { Spinner } from './ui/spinner'

/** A cell's edit as the table keeps it while it is open, saving, or refused. */
export interface CellEdit {
    draft: string
    saving: boolean
    error: string | null
    /** Which save this is, so a slower earlier one does not settle a later one. */
    attempt: number
}

/** The cell whose editor is open, and how it opened. */
export interface OpenCell extends CellAt {
    /** A select opens its list, as after a press; arriving by Tab it waits, focused. */
    openList: boolean
    /** The text starts selected; after a key that started the edit, the caret follows it. */
    selectAll: boolean
}

/** What the editing keeps between renders, ahead of them. */
export interface EditingHeld {
    /** The open cell as it is now, so a blur from an editor already left is not taken for leaving. */
    opening: OpenCell | undefined
    /** How many saves have started, to tell a save from a later one of the same cell. */
    attempts: number
    /** The table takes the focus back once the open editor has gone. */
    refocus: boolean
}

/** What a table hands its editing: its columns and rows as drawn, the active cell, and the cells' edits. */
export interface TableEditingContext<T> {
    shown: readonly DataColumn<T>[]
    flat: readonly FlatRow<T>[]
    active: string | undefined
    setActive: (key: string) => void
    activeColumn: string | undefined
    setActiveColumn: (id: string | undefined) => void
    edits: ReadonlyMap<string, CellEdit>
    setEdits: Dispatch<SetStateAction<ReadonlyMap<string, CellEdit>>>
    open: OpenCell | undefined
    setOpen: (cell: OpenCell | undefined) => void
    held: RefObject<EditingHeld>
    /** Moves the active row to an index of `flat` and scrolls it into view. */
    moveTo: (index: number) => void
    /** The table shows cards, stacked or in a grid, rather than rows. */
    grid: boolean
    /** How many rows a move down or up steps over: a line of cards in a grid. */
    step: number
    words: Pick<DataTableWords, 'saving' | 'saveFailed' | 'notNumber' | 'issueCritical' | 'issueWarning'>
    /** How the active cell is marked while the table has the focus. */
    cellFocus: CellFocus
    /** The columns whose name is cut short in a stacked line, so it says the whole of it on hover. */
    labelCut: ReadonlySet<string>
}

/** How an editable table marks its active cell: a ring, a soft outline on a washed cell, a line under it, or its row washed. */
export type CellFocus = 'ring' | 'soft' | 'underline' | 'row'

const CELL_FOCUS: Record<CellFocus, string> = {
    ring: 'group-focus-within/table:data-cell-active:shadow-[inset_0_0_0_2px_var(--ring)]',
    soft: 'group-focus-within/table:data-cell-active:bg-hover group-focus-within/table:data-cell-active:shadow-[inset_0_0_0_1px_var(--border-strong)]',
    underline: 'group-focus-within/table:data-cell-active:shadow-[inset_0_-2px_0_var(--ring)]',
    row: 'group-focus-within/table:data-cell-active:shadow-[inset_0_-1px_0_var(--border-strong)]',
}

/** A table cell's attributes while its table edits: which cell it is, its states, and its presses. */
export type EditingCellProps = HTMLAttributes<HTMLElement> & { [data: `data-${string}`]: string | true | undefined }

/**
 * Editable cells for `DataTable`, given to it as `editing`. A table that edits nothing is not given
 * it, and so carries none of the editors, their keys or their saves.
 */
export interface TableEditing {
    /** Takes a key pressed on the table; true when it was the editing's. */
    keyDown<T>(table: TableEditingContext<T>, event: KeyboardEvent<HTMLElement>, entry: FlatRow<T> | undefined): boolean
    /** The table took the focus: the first editable column becomes the active one. */
    focus<T>(table: TableEditingContext<T>): void
    /** A table cell's attributes. */
    cellProps<T>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>, pinned: boolean): EditingCellProps
    /** A table cell's content: its editor, its draft while saving or refused, or the column's own. */
    content<T>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>): ReactNode
    /**
     * An editable column's line in a stacked card: its name (unless `label` is false) and a field
     * that opens on a press, or the open editor in the field's place.
     */
    line<T>(
        table: TableEditingContext<T>,
        entry: FlatRow<T>,
        column: DataColumn<T>,
        listed: boolean,
        indent?: CSSProperties,
        label?: boolean,
    ): ReactNode
    /** An editable value as a compact stacked row draws it: its own content, opening its editor on a press. */
    value<T>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>): ReactNode
    /** Whether a cell's editor is open. */
    isOpen<T>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>): boolean
    /** After the table has drawn: the focus back to the grid from a closed editor, and the active cell in view in the rows' scroller. */
    settle<T>(table: TableEditingContext<T>, grid: HTMLElement | null, box: HTMLElement | null): void
}

const cellId = (row: string, column: string) => `${row}\u0000${column}`

const wordsOf = <T,>(table: TableEditingContext<T>): EditWords => ({
    ...EDIT_WORDS,
    saving: table.words.saving,
    failed: table.words.saveFailed,
    notNumber: table.words.notNumber,
    issueCritical: table.words.issueCritical,
    issueWarning: table.words.issueWarning,
})

const canEdit = <T,>(column: DataColumn<T> | undefined, row: T) =>
    column?.edit !== undefined && (column.edit.enabled === undefined || column.edit.enabled(row))

const optionsOf = <T,>(column: DataColumn<T>, row: T) => {
    const options = column.edit?.options
    return typeof options === 'function' ? options(row) : options
}

const setEdit = <T,>(table: TableEditingContext<T>, id: string, edit: CellEdit | undefined) =>
    table.setEdits((before) => {
        const next = new Map(before)
        if (edit === undefined) next.delete(id)
        else next.set(id, edit)
        return next
    })

const isOpen = <T,>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>) =>
    table.open?.row === entry.key && table.open.column === column.id

/** Opens a cell's editor: on its refused draft if it has one, or on what a key typed. */
function openEdit<T>(
    table: TableEditingContext<T>,
    entry: FlatRow<T>,
    column: DataColumn<T>,
    how: { draft?: string; openList?: boolean; selectAll?: boolean } = {},
) {
    if (column.edit === undefined || !canEdit(column, entry.row)) return
    const id = cellId(entry.key, column.id)
    const before = table.edits.get(id)
    if (before?.saving === true) return
    setEdit(table, id, {
        draft: how.draft ?? before?.draft ?? draftOf(column.edit.value(entry.row)),
        saving: false,
        error: how.draft === undefined ? (before?.error ?? null) : null,
        attempt: before?.attempt ?? 0,
    })
    const next = { row: entry.key, column: column.id, openList: how.openList ?? true, selectAll: how.selectAll ?? true }
    table.held.current.opening = next
    table.setOpen(next)
    table.setActive(entry.key)
    table.setActiveColumn(column.id)
}

function closeEdit<T>(table: TableEditingContext<T>, refocus: boolean) {
    table.held.current.opening = undefined
    table.held.current.refocus = refocus
    table.setOpen(undefined)
}

/**
 * Saves the open cell's draft, or `chosen` in its place, and tells whether the edit may move on. An
 * unchanged draft is let go; one that is not a value, or that `validate` refuses, is refused in
 * place. Leaving a refused draft unchanged keeps its mark and saves nothing.
 */
function saveEdit<T>(table: TableEditingContext<T>, leaving: boolean, chosen?: string): boolean {
    const at = table.held.current.opening
    if (at === undefined) return true
    const id = cellId(at.row, at.column)
    const held = table.edits.get(id)
    const column = table.shown.find((one) => one.id === at.column)
    const entry = table.flat.find((one) => one.key === at.row)
    if (held === undefined || held.saving || column?.edit === undefined || entry === undefined) return true
    const edit = chosen === undefined ? held : { ...held, draft: chosen, error: null }
    const spec = column.edit
    if (edit.draft === draftOf(spec.value(entry.row))) {
        setEdit(table, id, undefined)
        return true
    }
    if (leaving && edit.error !== null) return true
    const words = wordsOf(table)
    const read = readDraft(edit.draft, spec.editor, words)
    // One kind's value is the editor's value as the cycle handles it.
    const validate = spec.validate as ((value: EditValue, row: T) => string | null | undefined) | undefined
    const refusal = 'error' in read ? read.error : (validate?.(read.value, entry.row) ?? null)
    if (refusal !== null && refusal !== '') {
        setEdit(table, id, { ...edit, error: refusal })
        return leaving
    }
    const value = 'value' in read ? read.value : null
    const attempt = ++table.held.current.attempts
    setEdit(table, id, { ...edit, saving: true, error: null, attempt })
    const save = spec.save as (row: T, value: EditValue) => void | Promise<void>
    // A save that throws at once is refused like one that rejects later.
    Promise.resolve()
        .then(() => save(entry.row, value))
        .then(
            () =>
                table.setEdits((before) => {
                    if (before.get(id)?.attempt !== attempt) return before
                    const next = new Map(before)
                    next.delete(id)
                    return next
                }),
            (error: unknown) =>
                table.setEdits((before) => {
                    const now = before.get(id)
                    if (now?.attempt !== attempt) return before
                    return new Map(before).set(id, { ...now, saving: false, error: failureOf(error, words) })
                }),
        )
    return true
}

/** What a key in the open editor asks: drop it, save it, or save it and move to another cell. */
function moveEdit<T>(table: TableEditingContext<T>, move: EditMove) {
    const at = table.held.current.opening
    if (at === undefined) return
    if (move === 'cancel') {
        const id = cellId(at.row, at.column)
        if (table.edits.get(id)?.saving !== true) setEdit(table, id, undefined)
        return closeEdit(table, true)
    }
    if (!saveEdit(table, false)) return
    const index = table.flat.findIndex((one) => one.key === at.row)
    if (move === 'next' || move === 'previous') {
        const editable = table.shown.filter((column) => column.edit !== undefined)
        const byKey = new Map(table.flat.map((one) => [one.key, one]))
        const target = nextEditableCell(
            table.flat.map((one) => one.key),
            editable.map((column) => column.id),
            at,
            move === 'next' ? 1 : -1,
            (row, column) => {
                const entry = byKey.get(row)
                return (
                    entry !== undefined &&
                    canEdit(
                        editable.find((one) => one.id === column),
                        entry.row,
                    )
                )
            },
        )
        const entry = target === undefined ? undefined : byKey.get(target.row)
        const column = target === undefined ? undefined : editable.find((one) => one.id === target.column)
        if (entry === undefined || column === undefined || table.edits.get(cellId(entry.key, column.id))?.saving === true) {
            return closeEdit(table, true)
        }
        table.moveTo(table.flat.indexOf(entry))
        return openEdit(table, entry, column, { openList: false })
    }
    closeEdit(table, true)
    if (move === 'down') table.moveTo(index + table.step)
    if (move === 'up') table.moveTo(Math.max(0, index - table.step))
}

/** An editor's focus left it for somewhere outside: what was typed is saved, and the editor closes. */
function leaveEdit<T>(table: TableEditingContext<T>, at: CellAt) {
    const opening = table.held.current.opening
    if (opening?.row !== at.row || opening.column !== at.column) return
    saveEdit(table, true)
    closeEdit(table, false)
}

/**
 * A cell's editor while open, its draft with a spinner while it saves, its draft marked while
 * refused, and else the column's own content.
 */
function contentOf<T>(table: TableEditingContext<T>, entry: FlatRow<T>, column: DataColumn<T>, look: 'cell' | 'field'): ReactNode {
    const spec = column.edit
    const id = cellId(entry.key, column.id)
    const edit = spec === undefined ? undefined : table.edits.get(id)
    if (spec === undefined || edit === undefined) return column.cell(entry.row)
    const words = wordsOf(table)
    const options = optionsOf(column, entry.row)
    if (isOpen(table, entry, column) && table.open !== undefined) {
        return (
            <InlineEditor
                kind={spec.editor}
                look={look === 'cell' || spec.editor === 'multiline' ? 'cell' : 'field'}
                label={columnName(column)}
                draft={edit.draft}
                onDraftChange={(draft) => setEdit(table, id, { ...edit, draft, error: null })}
                options={options}
                saving={edit.saving}
                error={edit.error}
                openList={table.open.openList}
                selectAll={table.open.selectAll}
                inCell
                align={column.align === 'end' ? 'end' : 'start'}
                weekStartsOn={spec.editor === 'date' ? spec.weekStartsOn : undefined}
                onMove={(move) => moveEdit(table, move)}
                onChoose={(value) => {
                    if (saveEdit(table, false, value)) closeEdit(table, true)
                }}
                onLeave={() => leaveEdit(table, { row: entry.key, column: column.id })}
                onRefuse={(message, leaving) => {
                    const opening = table.held.current.opening
                    if (opening?.row !== entry.key || opening.column !== column.id) return
                    setEdit(table, id, { ...edit, error: message })
                    if (leaving) closeEdit(table, false)
                }}
                words={words}
            />
        )
    }
    const read = readDraft(edit.draft, spec.editor, words)
    const display = spec.display as ((value: EditValue, row: T) => ReactNode) | undefined
    const drawn =
        'error' in read ? edit.draft : display === undefined ? shownValue(read.value, spec.editor, options) : display(read.value, entry.row)
    return (
        <span
            className={cn('flex min-w-0 items-center gap-1.5', column.align === 'end' && 'flex-row-reverse')}
            title={edit.error ?? undefined}
        >
            <span className={cn('min-w-0 truncate', edit.saving && 'text-muted-foreground')}>{drawn}</span>
            {edit.saving ? (
                <Spinner className="size-3.5 shrink-0 text-muted-foreground" aria-label={words.saving} />
            ) : (
                edit.error !== null && <CircleAlertIcon role="img" aria-label={edit.error} className="size-4 shrink-0 text-critical-ink" />
            )}
        </span>
    )
}

/**
 * Editable cells for `DataTable`: pass it as the table's `editing`. A column's `edit` then makes
 * its cells editable, each saved on its own through the column's `save`; the arrows move a ringed
 * active cell, Enter, F2, a double click or a press on the active cell opens it, and a typed
 * character opens it on that character. The editors are the ones `InlineEdit` draws.
 */
export const tableEditing: TableEditing = {
    keyDown(table, event, entry) {
        // The arrows move between cells, Enter or F2 opens the active one, and a typed character opens it on what
        // was typed. The first column keeps a branch's arrows.
        if (table.open !== undefined || table.grid || entry === undefined || event.metaKey || event.ctrlKey || event.altKey) return false
        const ids = table.shown.map((column) => column.id)
        const columnId = table.activeColumn !== undefined && ids.includes(table.activeColumn) ? table.activeColumn : ids[0]
        const column = table.shown.find((one) => one.id === columnId)
        const first = columnId === ids[0]
        const opens = column !== undefined && canEdit(column, entry.row)
        const moves: Record<string, (() => void) | undefined> = {
            ArrowRight: first && entry.branch && !entry.open ? undefined : () => table.setActiveColumn(nextColumn(ids, columnId, 1)),
            ArrowLeft: first ? undefined : () => table.setActiveColumn(nextColumn(ids, columnId, -1)),
            Enter: opens ? () => openEdit(table, entry, column) : undefined,
            F2: opens ? () => openEdit(table, entry, column) : undefined,
        }
        // A character typed opens a text or number cell on it; Backspace or Delete opens it, or a date or a time, empty.
        const kind = column?.edit?.editor
        const typed =
            opens && kind !== 'select' && ((kind !== 'date' && kind !== 'time') || !typesInto(event))
                ? typesInto(event)
                    ? event.key
                    : event.key === 'Backspace' || event.key === 'Delete'
                      ? ''
                      : undefined
                : undefined
        const move = moves[event.key]
        if (move === undefined && typed === undefined) return false
        event.preventDefault()
        if (move !== undefined) move()
        else if (column !== undefined) openEdit(table, entry, column, { draft: typed, selectAll: false })
        return true
    },

    focus(table) {
        if (table.activeColumn === undefined) table.setActiveColumn(table.shown.find((column) => column.edit !== undefined)?.id)
    },

    cellProps(table, entry, column, pinned) {
        const edit = column.edit === undefined ? undefined : table.edits.get(cellId(entry.key, column.id))
        const opens = canEdit(column, entry.row)
        return {
            'data-column': column.id,
            'data-cell-active': (entry.key === table.active && column.id === table.activeColumn) || undefined,
            'aria-invalid': edit?.error != null || undefined,
            'aria-busy': edit?.saving === true || undefined,
            // A press makes the cell the active one; a press on the active cell opens it.
            onClick: (event: MouseEvent) => {
                if (event.shiftKey || event.metaKey || event.ctrlKey) return
                const wasActive = table.active === entry.key && table.activeColumn === column.id
                table.setActiveColumn(column.id)
                if (wasActive && table.open === undefined) openEdit(table, entry, column)
            },
            onDoubleClick: opens ? () => openEdit(table, entry, column) : undefined,
            className: cn(
                // The open editor covers the whole cell; a pinned cell is already placed for it.
                column.edit !== undefined && !pinned && 'relative',
                opens && 'cursor-text',
                // The active cell is marked while the table has the focus, by a press as well as a key.
                CELL_FOCUS[table.cellFocus],
                edit?.error != null && 'bg-critical/8 shadow-[inset_0_-2px_0_var(--critical)]',
            ),
        }
    },

    content: (table, entry, column) => contentOf(table, entry, column, 'cell'),

    line(table, entry, column, listed, indent, label = column.stackLabel !== false) {
        const edit = table.edits.get(cellId(entry.key, column.id))
        const opens = canEdit(column, entry.row)
        return (
            <div
                key={column.id}
                role={listed ? 'gridcell' : undefined}
                data-column={column.id}
                className={cn('flex min-w-0 items-center gap-2 text-xs', !listed && 'h-9')}
                style={indent}
            >
                {label && (
                    <span
                        title={table.labelCut.has(column.id) ? columnName(column) : undefined}
                        className="w-(--stack-label) shrink-0 truncate text-muted-foreground"
                    >
                        {columnName(column)}
                    </span>
                )}
                {isOpen(table, entry, column) ? (
                    // The open editor takes the field's place at the field's size, so the card does not move.
                    <span
                        className="relative flex h-(--density-control) min-w-0 flex-1 text-sm"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {contentOf(table, entry, column, 'field')}
                    </span>
                ) : (
                    <span
                        role={opens ? 'button' : undefined}
                        tabIndex={-1}
                        aria-label={opens ? columnName(column) : undefined}
                        aria-invalid={edit?.error != null || undefined}
                        aria-busy={edit?.saving === true || undefined}
                        onClick={(event) => {
                            event.stopPropagation()
                            openEdit(table, entry, column)
                        }}
                        className={cn(
                            'flex h-(--density-control) min-w-0 flex-1 items-center rounded-control border px-2.5 text-sm',
                            opens ? 'cursor-text border-input bg-field' : 'border-transparent',
                            column.align === 'end' && 'justify-end tabular-nums',
                            edit?.error != null && 'border-critical/80 bg-critical/8',
                        )}
                    >
                        <span className="min-w-0 truncate">{contentOf(table, entry, column, 'field')}</span>
                    </span>
                )}
            </div>
        )
    },

    value(table, entry, column) {
        const edit = table.edits.get(cellId(entry.key, column.id))
        if (!canEdit(column, entry.row)) return contentOf(table, entry, column, 'field')
        return (
            <span
                role="button"
                tabIndex={-1}
                aria-invalid={edit?.error != null || undefined}
                aria-busy={edit?.saving === true || undefined}
                onClick={(event) => {
                    event.stopPropagation()
                    openEdit(table, entry, column)
                }}
                className="min-w-0 cursor-text truncate"
            >
                {contentOf(table, entry, column, 'field')}
            </span>
        )
    },

    isOpen,

    settle(table, grid, box) {
        if (grid === null || box === null) return
        // Closed by a key or a choice, the table takes the focus back once the editor, and a select's list, have
        // gone, unless the focus has moved on elsewhere meanwhile.
        if (table.open === undefined && table.held.current.refocus) {
            table.held.current.refocus = false
            const now = document.activeElement
            if (now === null || now === document.body || grid.contains(now)) grid.focus({ preventScroll: true })
        }
        // The active cell scrolled into view sideways, clear of the pinned first column.
        if (table.active === undefined || table.activeColumn === undefined) return
        const cell = box.querySelector<HTMLElement>(
            `[data-row="${CSS.escape(table.active)}"] [data-column="${CSS.escape(table.activeColumn)}"]`,
        )
        if (cell === null || cell.dataset.pinned !== undefined) return
        const pinnedRight = cell.parentElement?.querySelector<HTMLElement>('[data-pinned]')?.getBoundingClientRect().right
        const frame = box.getBoundingClientRect()
        const rect = cell.getBoundingClientRect()
        const left = pinnedRight ?? frame.left + box.clientLeft
        const right = frame.left + box.clientLeft + box.clientWidth
        if (rect.left < left) box.scrollLeft -= left - rect.left
        else if (rect.right > right) box.scrollLeft += Math.min(rect.right - right, rect.left - left)
    },
}
