import { useState } from 'react'

/** One row of a repeated group: a key that stays with it as rows are added, removed and moved, and its value. */
export interface RepeatedRow<T> {
    key: string
    value: T
}

/** What a repeated group's rows can be told to do. */
export interface Repeated<T> {
    rows: readonly RepeatedRow<T>[]
    /** The values alone, in order, to save. */
    values: readonly T[]
    /** Adds a row at the end, `make`'s value unless given one. */
    add: (value?: T) => void
    remove: (key: string) => void
    /** Moves a row by `by` places, up for a negative number. */
    move: (key: string, by: number) => void
    set: (key: string, value: T) => void
}

/** The rows of a repeated group, each with its key, kept in order and moved to place. */
export function rowsMoved<T>(rows: readonly RepeatedRow<T>[], key: string, by: number): RepeatedRow<T>[] {
    const from = rows.findIndex((row) => row.key === key)
    const to = from + by
    if (from < 0 || to < 0 || to >= rows.length) return [...rows]
    const next = [...rows]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
}

/**
 * The rows of a repeated group in a hand-composed form, such as a run's steps or a household's
 * people: each keeps its key as rows are added, removed and moved, so a field's own state, its
 * issues and its focus stay with its row. `make` gives a new row's value. Draw them with
 * `RepeatedGroup`.
 */
export function useRepeated<T>(initial: readonly T[], make: () => T): Repeated<T> {
    const [state, setState] = useState(() => ({
        count: initial.length,
        rows: initial.map((value, index) => ({ key: `row-${String(index + 1)}`, value })),
    }))
    return {
        rows: state.rows,
        values: state.rows.map((row) => row.value),
        add: (value) =>
            setState((current) => ({
                count: current.count + 1,
                rows: [...current.rows, { key: `row-${String(current.count + 1)}`, value: value ?? make() }],
            })),
        remove: (key) => setState((current) => ({ ...current, rows: current.rows.filter((row) => row.key !== key) })),
        move: (key, by) => setState((current) => ({ ...current, rows: rowsMoved(current.rows, key, by) })),
        set: (key, value) =>
            setState((current) => ({ ...current, rows: current.rows.map((row) => (row.key === key ? { ...row, value } : row)) })),
    }
}
