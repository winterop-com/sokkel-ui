import { useState } from 'react'

import { moveItem } from '../lib/reorder'

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
    /** Moves the row at `from` to `to`, as `RepeatedGroup`'s `onMove` says. */
    move: (from: number, to: number) => void
    set: (key: string, value: T) => void
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
        move: (from, to) => setState((current) => ({ ...current, rows: moveItem(current.rows, from, to) })),
        set: (key, value) =>
            setState((current) => ({ ...current, rows: current.rows.map((row) => (row.key === key ? { ...row, value } : row)) })),
    }
}
