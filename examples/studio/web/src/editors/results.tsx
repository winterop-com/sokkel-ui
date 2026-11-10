import type { DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { InlineCode } from '@winterop-com/sokkel-ui/InlineCode'

import type { Value } from '../sql'

/** A row of a result, with the key the table holds it by. */
export interface ResultRow {
    key: string
    values: readonly Value[]
}

/** The rows of a result, each keyed by where it stands. */
export const resultRows = (rows: readonly (readonly Value[])[]): ResultRow[] => rows.map((values, index) => ({ key: String(index), values }))

/** A cell's value as the results show it: null quiet, a number in figures. */
export function sayValue(value: Value) {
    if (value === null)
        return (
            <InlineCode value="null" tone="muted" bare />
        )
    if (typeof value === 'number')
        return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { maximumFractionDigits: 3 })
    return String(value)
}

/** The columns of a result, one per name, each sorting by its value. */
export function resultColumns(names: readonly string[], rows: readonly ResultRow[]): DataColumn<ResultRow>[] {
    return names.map((name, index) => {
        const numeric = rows.length > 0 && rows.every((row) => row.values[index] === null || typeof row.values[index] === 'number')
        return {
            id: `c${String(index)}`,
            header: name,
            width: numeric ? 'minmax(7rem,0.6fr)' : 'minmax(9rem,1fr)',
            align: numeric ? 'end' : 'start',
            cell: (row) => sayValue(row.values[index] ?? null),
            sortValue: (row) => {
                const value = row.values[index] ?? null
                return typeof value === 'number' ? value : value === null ? '' : String(value)
            },
        }
    })
}
