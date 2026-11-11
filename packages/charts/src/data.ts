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

/** The value at a fraction of the way through sorted numbers, interpolated between neighbors. */
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
    /** How each group's values are combined, or one way for each `y` field in order. */
    aggregate?: Aggregate | readonly Aggregate[]
    /** Categories in this order first, then any others as the rows give them. */
    order?: readonly string[]
    /** Series in this order first, then any others. */
    seriesOrder?: readonly string[]
}

/** How the `index`th `y` field is combined: its own way where `how` lists one per field, the sum where none is given. */
export function aggregateAt(how: Aggregate | readonly Aggregate[] | undefined, index: number): Aggregate {
    if (how === undefined) return 'sum'
    if (typeof how === 'string') return how
    return (how as readonly Aggregate[])[index] ?? 'sum'
}

/**
 * The rows grouped by category, and by series where `series` names a field, each group's `y`
 * combined by `aggregate`: the sum where a `y` is given and the count where none is. Several `y`
 * fields make one series each, each combined its own way where `aggregate` lists one per field.
 */
export function pivot({ rows, x, y, series, aggregate: how, order, seriesOrder }: PivotSpec): Pivot {
    const categories = distinct(rows, x, order)
    const fields = y === undefined ? [] : typeof y === 'string' ? [y] : [...y]
    // A category the order names more than once has a place for each: its nth row goes to its nth place, and any past the last join that one.
    const places = new Map<string, number[]>()
    categories.forEach((name, index) => {
        const held = places.get(name)
        if (held === undefined) places.set(name, [index])
        else held.push(index)
    })
    const collect = (pick: (row: Row) => boolean, field: string | undefined, combine: Aggregate = 'sum'): (number | null)[] => {
        const buckets: number[][] = categories.map(() => [])
        const seen = new Map<string, number>()
        for (const row of rows) {
            if (!pick(row)) continue
            const name = labelOf(row[x])
            const at = places.get(name)
            if (at === undefined) continue
            const times = seen.get(name) ?? 0
            seen.set(name, times + 1)
            const index = at[Math.min(times, at.length - 1)]
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
                values: collect((row) => labelOf(row[series]) === name, field, aggregateAt(how, 0)),
            })),
        }
    }
    if (fields.length === 0) return { categories, series: [{ name: 'Count', values: collect(() => true, undefined) }] }
    return {
        categories,
        series: fields.map((field, index) => ({ name: field, values: collect(() => true, field, aggregateAt(how, index)) })),
    }
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

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** A figure written short for an axis' ticks: `1.2K` for 1,200. */
export const formatCompact = (value: number): string => compact.format(value)

/**
 * A figure written for a value axis' tick: short from ten up, `1.2K` for 1,200, and with up to two
 * decimals below, so the ticks of a small range (0.05 apart) never read the same.
 */
export const formatTick = (value: number): string => (Math.abs(value) < 10 ? formatNumber(value) : formatCompact(value))
