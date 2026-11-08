/**
 * The edit cycle `InlineEdit` and `DataTable`'s editable cells share: a value shown, an editor
 * holding the typed text, a save the app runs, and the error it refuses with. Pure, so the cycle
 * and the keys are tested without a page.
 */

/** Which control edits a value: a line of text, several lines, a number, a date, a time of day, or one of a list. */
export type EditorKind = 'text' | 'multiline' | 'number' | 'date' | 'time' | 'select'

/** One choice a select editor offers. */
export interface EditOption {
    value: string
    /** Said in the list and in place of the value; the value itself when absent. */
    label?: string
}

/** A value an editor edits: text, a number, or null for none. */
export type EditValue = string | number | null

/**
 * The value an editor of a kind gives: a number from `number`, a day (`YYYY-MM-DD`) from `date` and
 * a time of day (`HH:mm`) from `time`, each null for none; text from the rest.
 */
export type EditedValue<K extends EditorKind> = K extends 'number' ? number | null : K extends 'date' | 'time' ? string | null : string

/** The words an editor says, in English unless an app passes its own. */
export interface EditWords {
    /** The spinner's name while a save runs. */
    saving: string
    /** What a refused save says when the app's error carries no message. */
    failed: string
    /** What a number editor says of text that is not a number. */
    notNumber: string
    /** The multi-line editor's buttons. */
    save: string
    cancel: string
}

export const EDIT_WORDS: EditWords = {
    saving: 'Saving',
    failed: 'Could not save',
    notNumber: 'Enter a number',
    save: 'Save',
    cancel: 'Cancel',
}

/** The text an editor starts from for a value. */
export function draftOf(value: EditValue | undefined): string {
    return value === null || value === undefined ? '' : String(value)
}

/**
 * A number typed in figures, the thousands commas, spaces and underscores dropped: null when
 * nothing is typed, undefined when the text is not a number.
 */
export function parseNumber(text: string): number | null | undefined {
    const plain = text.trim().replaceAll(/[\s,_]/g, '')
    if (plain === '') return null
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(plain)) return undefined
    const value = Number(plain)
    return Number.isFinite(value) ? value : undefined
}

/** The value a draft stands for, or why it cannot be one. A date's or a time's draft is what its field read, or empty. */
export function readDraft(
    draft: string,
    kind: EditorKind,
    words: Pick<EditWords, 'notNumber'> = EDIT_WORDS,
): { value: EditValue } | { error: string } {
    if (kind === 'date' || kind === 'time') return { value: draft === '' ? null : draft }
    if (kind !== 'number') return { value: draft }
    const value = parseNumber(draft)
    return value === undefined ? { error: words.notNumber } : { value }
}

/** A value as an editor draws it at rest: a number in figures, a choice by its label, text as typed. */
export function shownValue(value: EditValue | undefined, kind: EditorKind, options?: readonly EditOption[]): string {
    if (value === null || value === undefined) return ''
    if (kind === 'number' && typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 20 })
    if (kind === 'select') {
        const option = options?.find((one) => one.value === value)
        return option?.label ?? String(value)
    }
    return String(value)
}

/** What a refused save says: the app's error's own message, or the words for a refusal with none. */
export function failureOf(error: unknown, words: Pick<EditWords, 'failed'> = EDIT_WORDS): string {
    if (error instanceof Error && error.message !== '') return error.message
    if (typeof error === 'string' && error !== '') return error
    return words.failed
}

/** What a key does in an open editor: save it, drop it, or save it and move to another cell. */
export type EditMove = 'save' | 'cancel' | 'next' | 'previous' | 'down' | 'up'

/** A key press as an editor reads it. */
export interface EditKeyPress {
    key: string
    shiftKey?: boolean
    metaKey?: boolean
    ctrlKey?: boolean
    altKey?: boolean
    /** An input method is composing a character, so Enter picks it rather than saving. */
    isComposing?: boolean
}

/**
 * What a key does in an open editor, or undefined for a key the editor keeps. Escape drops the
 * edit. Enter saves a one-line editor, and in a cell moves down after it (up with Shift); a
 * multi-line editor keeps Enter for a new line and saves on ⌘ or Ctrl with Enter. A select keeps
 * Enter for its list. In a cell, Tab saves and moves to the next editable cell (back with Shift).
 */
export function editKey(press: EditKeyPress, kind: EditorKind, cell: boolean): EditMove | undefined {
    if (press.isComposing === true) return undefined
    if (press.key === 'Escape') return 'cancel'
    if (press.key === 'Tab' && cell) return press.shiftKey === true ? 'previous' : 'next'
    if (press.key !== 'Enter' || kind === 'select') return undefined
    const mod = press.metaKey === true || press.ctrlKey === true
    if (kind === 'multiline') return mod ? 'save' : undefined
    if (!cell || mod) return 'save'
    return press.shiftKey === true ? 'up' : 'down'
}

/**
 * Whether a key pressed on a cell at rest starts its editor with what the key types, as in a
 * spreadsheet: one printable character, held with no ⌘, Ctrl or Option, and never Space, which
 * selects a row.
 */
export function typesInto(press: EditKeyPress): boolean {
    return (
        press.key.length === 1 &&
        press.key !== ' ' &&
        press.metaKey !== true &&
        press.ctrlKey !== true &&
        press.altKey !== true &&
        press.isComposing !== true
    )
}

/** One editor's state: whether it is open, what is typed, whether a save runs, and why the last was refused. */
export interface EditState {
    editing: boolean
    draft: string
    saving: boolean
    error: string | null
}

export const AT_REST: EditState = { editing: false, draft: '', saving: false, error: null }

export type EditAction =
    | { type: 'start'; draft: string }
    | { type: 'change'; draft: string }
    | { type: 'save' }
    | { type: 'saved' }
    | { type: 'failed'; error: string }
    | { type: 'cancel' }

/**
 * The cycle: `start` opens the editor on a draft, `change` types into it (and clears a refusal,
 * as a field changed after a server's refusal is no longer refused), `save` holds it while the app
 * saves, `saved` closes it, `failed` keeps it open on the typed text with the reason, and `cancel`
 * drops the draft. Nothing changes a draft while it saves.
 */
export function editCycle(state: EditState, action: EditAction): EditState {
    switch (action.type) {
        case 'start':
            return state.saving ? state : { editing: true, draft: action.draft, saving: false, error: null }
        case 'change':
            return state.saving || !state.editing ? state : { ...state, draft: action.draft, error: null }
        case 'save':
            return state.editing ? { ...state, saving: true, error: null } : state
        case 'saved':
            return AT_REST
        case 'failed':
            return { ...state, editing: true, saving: false, error: action.error }
        case 'cancel':
            return state.saving ? state : AT_REST
    }
}

/** A cell by its row's key and its column's id. */
export interface CellAt {
    row: string
    column: string
}

/**
 * The cell an edit moves to with Tab: across the row's editable columns, then onto the next row's
 * first, skipping cells `editable` refuses; backward with `step` -1. Undefined past either end.
 */
export function nextEditableCell(
    rows: readonly string[],
    columns: readonly string[],
    from: CellAt,
    step: 1 | -1,
    editable: (row: string, column: string) => boolean = () => true,
): CellAt | undefined {
    const width = columns.length
    if (width === 0) return undefined
    const row = rows.indexOf(from.row)
    if (row < 0) return undefined
    const column = columns.indexOf(from.column)
    // A start outside the editable columns steps from just before the first, or just after the last.
    let at = row * width + (column >= 0 ? column : step === 1 ? -1 : width)
    for (at += step; at >= 0 && at < rows.length * width; at += step) {
        const cell = { row: rows[Math.floor(at / width)], column: columns[at % width] }
        if (editable(cell.row, cell.column)) return cell
    }
    return undefined
}

/** The column an arrow moves the active cell to, kept within the row. */
export function nextColumn(columns: readonly string[], from: string | undefined, step: 1 | -1): string | undefined {
    if (columns.length === 0) return undefined
    const at = from === undefined ? -1 : columns.indexOf(from)
    if (at < 0) return columns[0]
    return columns[Math.max(0, Math.min(columns.length - 1, at + step))]
}
