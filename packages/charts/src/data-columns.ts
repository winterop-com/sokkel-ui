import { formatNumber, labelOf, numberOf, type Row } from './data'
import type { ChartKind } from './kinds'
import { fieldsOf, unitAt, type ChartSpec } from './kinds/spec'

/** One column of a chart's data view: a field of its rows, named as the chart names it. */
export interface DataViewColumn {
    field: string
    header: string
    /** A field of figures, written as the chart writes them and aligned to the end. */
    numeric: boolean
    /** Which `y` field's unit its figures take. */
    unit: number
}

/** Kinds whose `x` is a number of its own rather than a category. */
const NUMERIC_X: readonly ChartKind[] = ['scatter', 'parallel', 'histogram']

/**
 * The columns a chart's rows are shown in: the fields its spec reads, from the outermost in (the
 * grid's facet, a nesting path, `x`, `series`), then its figures (`y`, `value`, a fan's bands,
 * `history` and `points`), each once and headed by its name in `fieldNames`. A spec that names no
 * field shows every field of its rows.
 */
export function dataColumns(kind: ChartKind, spec: ChartSpec, facet?: string): DataViewColumn[] {
    const columns: DataViewColumn[] = []
    const add = (field: string | undefined, numeric: boolean, unit = 0) => {
        if (field === undefined || columns.some((column) => column.field === field)) return
        columns.push({ field, header: spec.fieldNames?.[field] ?? field, numeric, unit })
    }
    add(facet, false)
    for (const field of spec.path ?? []) add(field, false)
    add(spec.x, NUMERIC_X.includes(kind))
    add(spec.series, false)
    fieldsOf(spec).forEach((field, index) => add(field, true, index))
    add(spec.value, true)
    for (const band of spec.bands ?? []) {
        add(band.low, true)
        add(band.high, true)
    }
    add(spec.history, true)
    add(spec.points, true)
    if (columns.length > 0) return columns
    for (const row of spec.rows) for (const field of Object.keys(row)) add(field, typeof row[field] === 'number')
    return columns
}

/** A cell of the data view as the chart writes it: a figure in the spec's format and unit, `-` where it is missing, a label as it is. */
export function dataCell(column: DataViewColumn, row: Row, spec: ChartSpec): string {
    const value = row[column.field]
    if (!column.numeric) return labelOf(value)
    const figure = numberOf(value)
    if (figure === null) return value === null || value === undefined || value === '' ? '-' : labelOf(value)
    return `${(spec.format ?? formatNumber)(figure)}${unitAt(spec, column.unit)}`
}
