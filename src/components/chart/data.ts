/** One row of the data a chart draws: a record of named fields, as a table's rows are. */
export type Row = Readonly<Record<string, unknown>>

/** How the values that fall in one place are combined into one figure. */
export type Aggregate = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'p90'

/** A field's value as a number, or null where it is missing or not a number. */
export function numberOf(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

/** A field's value as a label: what a category, a series or a slice is called. */
export function labelOf(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return String(value)
}

/** The value at a fraction of the way through sorted numbers, interpolated between neighbours. */
export function quantile(sorted: readonly number[], at: number): number | null {
    if (sorted.length === 0) return null
    const index = (sorted.length - 1) * at
    const low = Math.floor(index)
    const high = Math.ceil(index)
    return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

/** The values combined into one figure; `count` counts them, the rest need at least one. */
export function aggregate(values: readonly number[], how: Aggregate): number | null {
    if (how === 'count') return values.length
    if (values.length === 0) return null
    if (how === 'sum') return values.reduce((sum, value) => sum + value, 0)
    if (how === 'avg') return values.reduce((sum, value) => sum + value, 0) / values.length
    if (how === 'min') return Math.min(...values)
    if (how === 'max') return Math.max(...values)
    const sorted = [...values].sort((a, b) => a - b)
    return quantile(sorted, how === 'median' ? 0.5 : 0.9)
}

/** The distinct labels of a field, in the order the rows first give them, or in `order` where it names them. */
export function distinct(rows: readonly Row[], field: string, order?: readonly string[]): string[] {
    const seen = new Set<string>()
    for (const row of rows) seen.add(labelOf(row[field]))
    const found = [...seen]
    if (order === undefined) return found
    return [...order.filter((name) => seen.has(name)), ...found.filter((name) => !order.includes(name))]
}

/** One named run of figures, one per category. */
export interface Series {
    name: string
    values: (number | null)[]
}

/** What a chart of categories draws: the categories along one axis and a series of figures for each. */
export interface Pivot {
    categories: string[]
    series: Series[]
}

/** How rows become categories and series. */
export interface PivotSpec {
    rows: readonly Row[]
    /** The field whose labels are the categories. */
    x: string
    /** The field, or fields, whose numbers are drawn; without one the rows are counted. */
    y?: string | readonly string[]
    /** The field whose labels split the rows into series. */
    series?: string
    aggregate?: Aggregate
    /** Categories in this order first, then any others as the rows give them. */
    order?: readonly string[]
    /** Series in this order first, then any others. */
    seriesOrder?: readonly string[]
}

/**
 * The rows grouped by category, and by series where `series` names a field, each group's `y`
 * combined by `aggregate`: the sum where a `y` is given and the count where none is. Several `y`
 * fields make one series each.
 */
export function pivot({ rows, x, y, series, aggregate: how, order, seriesOrder }: PivotSpec): Pivot {
    const categories = distinct(rows, x, order)
    const fields = y === undefined ? [] : typeof y === 'string' ? [y] : [...y]
    const combine: Aggregate = how ?? (fields.length === 0 ? 'count' : 'sum')
    const at = new Map(categories.map((name, index) => [name, index]))
    const collect = (pick: (row: Row) => boolean, field: string | undefined): (number | null)[] => {
        const buckets: number[][] = categories.map(() => [])
        for (const row of rows) {
            if (!pick(row)) continue
            const index = at.get(labelOf(row[x]))
            if (index === undefined) continue
            if (field === undefined) buckets[index].push(1)
            else {
                const value = numberOf(row[field])
                if (value !== null) buckets[index].push(value)
            }
        }
        return buckets.map((bucket) => aggregate(bucket, field === undefined ? 'count' : combine))
    }
    if (series !== undefined) {
        const field = fields[0]
        return {
            categories,
            series: distinct(rows, series, seriesOrder).map((name) => ({
                name,
                values: collect((row) => labelOf(row[series]) === name, field),
            })),
        }
    }
    if (fields.length === 0) return { categories, series: [{ name: 'Count', values: collect(() => true, undefined) }] }
    return { categories, series: fields.map((field) => ({ name: field, values: collect(() => true, field) })) }
}

/** Each category's figures as shares of that category's total, in percent. */
export function asShares(series: readonly Series[]): Series[] {
    const totals = series[0]?.values.map((_, index) => series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0)) ?? []
    return series.map((entry) => ({
        name: entry.name,
        values: entry.values.map((value, index) => (value === null || totals[index] === 0 ? null : (value / totals[index]) * 100)),
    }))
}

/** A figure written for a tooltip or a label: grouped thousands, at most two decimals. */
export const formatNumber = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
