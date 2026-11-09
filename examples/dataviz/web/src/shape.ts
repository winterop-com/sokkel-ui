import { aggregate as combine, pivot, quantile, type Row } from '@winterop-com/sokkel-ui-charts/data'
import type { Filter, FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'

import { AGGREGATES, type Column, type Dataset, type DateBin, type Preferences, type ViewKind, type ViewSpec } from './model'
import { dayOf, numberOf } from './parse'

/** A value read by its column's type: a number, a day as `YYYY-MM-DD`, text, or null for none. */
export type Cell = string | number | null

/** A row's values read by type, keyed by column id. */
export type TypedRow = Readonly<Record<string, Cell>>

/** A cell's text read as its column's type. */
export function typed(text: string | undefined, column: Column): Cell {
    if (text === undefined || text.trim() === '') return null
    if (column.type === 'number') return numberOf(text)
    if (column.type === 'date') return dayOf(text)
    return text
}

/** Every row of a dataset with its values read by type. */
export function typedRows(dataset: Dataset): TypedRow[] {
    return dataset.rows.map((row) => ({
        id: row.id,
        ...Object.fromEntries(dataset.columns.map((column) => [column.id, typed(row[column.id], column)])),
    }))
}

/** A column by its id, or undefined where the dataset has none. */
export const columnOf = (dataset: Dataset, id: string | undefined): Column | undefined =>
    id === undefined ? undefined : dataset.columns.find((column) => column.id === id)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The key a day falls under in a bin: the day, the Monday starting its week, or its month. */
export function binKey(day: string, bin: DateBin): string {
    if (bin === 'month') return day.slice(0, 7)
    if (bin === 'day') return day
    const date = new Date(`${day}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
    return date.toISOString().slice(0, 10)
}

/** How a bin is written along an axis: `Mar`, or `Mar 3` for a day or the week starting on it, with the year where the data spans several. */
export function binLabel(key: string, bin: DateBin, withYear: boolean): string {
    const [year, month, day] = key.split('-')
    const name = MONTHS[Number(month) - 1] ?? month
    if (bin === 'month') return withYear ? `${name} ${year}` : name
    return withYear ? `${name} ${String(Number(day))}, ${year}` : `${name} ${String(Number(day))}`
}

/** The figure written for a reader as the settings say: grouped, compact or plain, with their decimals. */
export function formatter(prefs: Pick<Preferences, 'numbers' | 'decimals'>): (value: number) => string {
    const fixed = prefs.decimals === 'auto' ? undefined : Number(prefs.decimals)
    const options: Intl.NumberFormatOptions = {
        maximumFractionDigits: fixed ?? (prefs.numbers === 'compact' ? 1 : 2),
        minimumFractionDigits: fixed ?? 0,
        useGrouping: prefs.numbers !== 'plain',
        notation: prefs.numbers === 'compact' ? 'compact' : 'standard',
    }
    const format = new Intl.NumberFormat('en-US', options)
    return (value) => format.format(value)
}

/** How the measure is named: `Sum of Rainfall`, or `Rows` where rows are counted. */
export function measureName(dataset: Dataset, spec: ViewSpec): string {
    const y = columnOf(dataset, spec.y)
    if (spec.view === 'scatter') return y?.name ?? 'Rows'
    if (y === undefined || spec.aggregate === 'count') return 'Rows'
    return `${AGGREGATES.find((one) => one.value === spec.aggregate)?.label ?? spec.aggregate} of ${y.name}`
}

/** What each view needs to be drawn, said when it is missing. */
function problemOf(dataset: Dataset, spec: ViewSpec): string | undefined {
    const x = columnOf(dataset, spec.x)
    const y = columnOf(dataset, spec.y)
    switch (spec.view) {
        case 'scatter':
            if (x?.type !== 'number' || y?.type !== 'number')
                return 'A scatter plots one number against another: pick a number column for each axis.'
            return undefined
        case 'map':
            if (x?.type !== 'region') return 'A map colors regions: pick a column of region names, typed Region, for Region.'
            return undefined
        case 'stat':
            return undefined
        case 'heatmap':
            if (x === undefined || columnOf(dataset, spec.series) === undefined) return 'A heatmap needs a column along it and one down it.'
            return undefined
        default:
            if (x === undefined) return 'Pick the column the chart runs along.'
            return undefined
    }
}

/** What a view draws, read from its dataset: the chart's rows and fields, the same figures as a table, and a single reading. */
export interface Shaped {
    /** The rows for `Chart`, keyed by column names, dates binned. */
    rows: Row[]
    x?: string
    y?: string
    series?: string
    value?: string
    /** The categories in the order picked, after the limit. */
    order?: string[]
    aggregate: 'sum' | 'avg' | 'count' | 'min' | 'max'
    /** The figures as a table: its column names and its rows, for the table view and a CSV. */
    table: { names: string[]; rows: (string | number | null)[][] }
    /** Each region's figure, for the map. */
    regions: Map<string, number | null>
    /** One reading of the measure over every row, with its course over the dates. */
    stat: { value: number | null; sparkline?: number[]; delta?: string }
    /** How many rows were read, after the filters. */
    read: number
    /** Why the view cannot be drawn from these columns. */
    problem?: string
    empty: boolean
}

const blank = (problem?: string): Shaped => ({
    rows: [],
    aggregate: 'sum',
    table: { names: [], rows: [] },
    regions: new Map(),
    stat: { value: null },
    read: 0,
    problem,
    empty: true,
})

/** A category's own order: dates and numbers ascending, names alphabetically. */
function naturally(a: string, b: string): number {
    return a.localeCompare(b, 'en-US', { numeric: true })
}

/** The figures a view draws from its dataset, after the filters, with dates binned, categories sorted and cut to the limit. */
export function shape(dataset: Dataset, spec: ViewSpec, filters: readonly Filter[] = []): Shaped {
    const problem = problemOf(dataset, spec)
    if (problem !== undefined) return blank(problem)
    const all = typedRows(dataset)
    const rows = filters.length === 0 ? all : filterRows(all, filters, filterFields(dataset, all))
    const x = columnOf(dataset, spec.x)
    const y = spec.aggregate === 'count' ? undefined : columnOf(dataset, spec.y)
    const how = y === undefined ? 'count' : spec.aggregate
    const ofY = (row: TypedRow) => (y === undefined ? null : (row[y.id] as number | null))

    if (spec.view === 'scatter') {
        const yy = columnOf(dataset, spec.y) as Column
        const color = columnOf(dataset, spec.color)
        const size = columnOf(dataset, spec.size)
        const xx = x as Column
        const points = rows.filter((row) => row[xx.id] !== null && row[yy.id] !== null)
        const chartRows = points.map((row) => ({
            [xx.name]: row[xx.id],
            [yy.name]: row[yy.id],
            ...(color === undefined ? {} : { [color.name]: row[color.id] ?? '' }),
            ...(size === undefined ? {} : { [size.name]: row[size.id] }),
        }))
        const names = [xx.name, yy.name, ...(color === undefined ? [] : [color.name]), ...(size === undefined ? [] : [size.name])]
        return {
            rows: chartRows,
            x: xx.name,
            y: yy.name,
            series: color?.name,
            value: size?.name,
            aggregate: 'sum',
            table: { names, rows: chartRows.map((row) => names.map((name) => (row[name] ?? null) as string | number | null)) },
            regions: new Map(),
            stat: { value: null },
            read: rows.length,
            empty: chartRows.length === 0,
        }
    }

    // A reading of the measure over every row, and its course over the dates where a date column leads.
    const values = rows.map(ofY).filter((value): value is number => value !== null)
    const reading = how === 'count' ? rows.length : combine(values, how)
    let sparkline: number[] | undefined
    let delta: string | undefined
    if (x?.type === 'date') {
        const buckets = new Map<string, number[]>()
        for (const row of rows) {
            const day = row[x.id]
            if (typeof day !== 'string') continue
            const key = binKey(day, spec.bin)
            const bucket = buckets.get(key) ?? []
            bucket.push(how === 'count' ? 1 : (ofY(row) ?? Number.NaN))
            buckets.set(key, bucket)
        }
        sparkline = [...buckets.keys()]
            .sort()
            .map((key) => combine((buckets.get(key) ?? []).filter(Number.isFinite), how === 'count' ? 'sum' : how) ?? 0)
        const [before, last] = sparkline.slice(-2)
        if (sparkline.length > 1 && before !== 0) {
            const change = ((last - before) / Math.abs(before)) * 100
            delta = `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}% on the ${spec.bin} before`
        }
    }
    if (spec.view === 'stat') {
        const name = measureName(dataset, spec)
        return {
            ...blank(),
            table: { names: [name], rows: [[reading]] },
            stat: { value: reading, sparkline, delta },
            read: rows.length,
            empty: rows.length === 0,
        }
    }

    const xx = x as Column
    const series = spec.view === 'pie' || spec.view === 'map' ? undefined : columnOf(dataset, spec.series)
    const years = new Set(
        rows.map((row) => (xx.type === 'date' && typeof row[xx.id] === 'string' ? (row[xx.id] as string).slice(0, 4) : '')),
    )
    const withYear = years.size > 1
    const keyOf = new Map<string, string>()
    const chartRows: Row[] = []
    for (const row of rows) {
        const raw = row[xx.id]
        if (raw === null) continue
        let label: string
        if (xx.type === 'date') {
            const key = binKey(raw as string, spec.bin)
            label = binLabel(key, spec.bin, withYear)
            keyOf.set(label, key)
        } else label = String(raw)
        chartRows.push({
            [xx.name]: label,
            ...(y === undefined ? {} : { [y.name]: ofY(row) }),
            ...(series === undefined ? {} : { [series.name]: row[series.id] === null ? '(none)' : String(row[series.id]) }),
        })
    }
    const totals = pivot({ rows: chartRows, x: xx.name, y: y?.name, aggregate: how })
    const figure = new Map(totals.categories.map((name, at) => [name, totals.series[0]?.values[at] ?? null]))
    const sortKey = (label: string) => keyOf.get(label) ?? label
    const sorted = [...totals.categories].sort((a, b) => {
        if (spec.sort === 'natural') return naturally(sortKey(a), sortKey(b))
        const diff = (figure.get(a) ?? -Infinity) - (figure.get(b) ?? -Infinity)
        return spec.sort === 'desc' ? -diff : diff
    })
    const kept = spec.limit > 0 ? sorted.slice(0, spec.limit) : sorted
    const keep = new Set(kept)
    const shown = kept.length === sorted.length ? chartRows : chartRows.filter((row) => keep.has(row[xx.name] as string))
    const split = pivot({ rows: shown, x: xx.name, y: y?.name, series: series?.name, aggregate: how, order: kept })
    const measure = measureName(dataset, spec)
    const names = [xx.name, ...(series === undefined ? [measure] : split.series.map((entry) => entry.name))]
    return {
        rows: shown,
        x: xx.name,
        y: y?.name,
        series: series?.name,
        order: kept,
        aggregate: how,
        table: { names, rows: split.categories.map((name, at) => [name, ...split.series.map((entry) => entry.values[at] ?? null)]) },
        regions: new Map(kept.map((name) => [name, figure.get(name) ?? null])),
        stat: { value: reading, sparkline, delta },
        read: rows.length,
        empty: shown.length === 0,
    }
}

/** The filter fields of a dataset's columns: numbers and dates by range, a short list of names as a set to tick, long ones as text. */
export function filterFields(dataset: Dataset, rows: readonly TypedRow[] = typedRows(dataset)): FilterField<TypedRow>[] {
    return dataset.columns.map((column): FilterField<TypedRow> => {
        if (column.type === 'number')
            return { id: column.id, label: column.name, type: 'number', value: (row) => row[column.id] as number | null }
        if (column.type === 'date')
            return { id: column.id, label: column.name, type: 'date', value: (row) => row[column.id] as string | null }
        const names = [...new Set(rows.map((row) => row[column.id]).filter((value): value is string => typeof value === 'string'))].sort(
            naturally,
        )
        if (names.length > 60)
            return { id: column.id, label: column.name, type: 'text', value: (row) => (row[column.id] as string | null) ?? '' }
        return {
            id: column.id,
            label: column.name,
            type: 'set',
            options: names.map((value) => ({ value })),
            value: (row) => (row[column.id] === null ? [] : [row[column.id] as string]),
        }
    })
}

/** A board's filters, which name columns, as filters on one dataset's columns by id; a filter on a column it lacks is left out. */
export function filtersFor(dataset: Dataset, filters: readonly Filter[]): Filter[] {
    return filters.flatMap((filter) => {
        const column = dataset.columns.find((one) => one.name.toLowerCase() === filter.field.toLowerCase())
        return column === undefined ? [] : [{ ...filter, field: column.id }]
    })
}

/** A view's starting point for a dataset: a line over its dates, a map of its regions, bars of its names, or its rows as a table. */
export function startingSpec(dataset: Dataset, prefs: Preferences): ViewSpec {
    const of = (type: Column['type']) => dataset.columns.find((column) => column.type === type)
    const date = of('date')
    const region = of('region')
    const text = of('text')
    const number = of('number')
    const base: ViewSpec = {
        view: 'table',
        aggregate: number === undefined ? 'count' : prefs.aggregate,
        bin: 'month',
        sort: 'natural',
        limit: 0,
        stack: false,
        horizontal: false,
        palette: 'default',
        y: number?.id,
    }
    if (date !== undefined) return { ...base, view: 'line', x: date.id }
    if (region !== undefined) return { ...base, view: 'map', x: region.id }
    if (text !== undefined) return { ...base, view: 'bar', x: text.id, sort: 'desc', limit: 10 }
    return { ...base, x: dataset.columns[0]?.id }
}

/** A view suggested for the columns picked, with what it shows. */
export interface Suggestion {
    id: string
    title: string
    reason: string
    spec: ViewSpec
}

/** Up to four views that suit the columns picked now, none the view already shown. */
export function suggest(dataset: Dataset, spec: ViewSpec): Suggestion[] {
    const x = columnOf(dataset, spec.x)
    const y = columnOf(dataset, spec.y)
    const series = columnOf(dataset, spec.series)
    const numbers = dataset.columns.filter((column) => column.type === 'number')
    const dates = dataset.columns.filter((column) => column.type === 'date')
    const regions = dataset.columns.filter((column) => column.type === 'region')
    const texts = dataset.columns.filter((column) => column.type === 'text' || column.type === 'region')
    const measure = y?.type === 'number' && spec.aggregate !== 'count' ? y : undefined
    const what = measure === undefined ? 'rows' : measure.name.toLowerCase()
    const out: Suggestion[] = []
    const add = (view: ViewKind, title: string, reason: string, patch: Partial<ViewSpec>) => {
        if (view === spec.view || out.some((one) => one.spec.view === view)) return
        out.push({ id: view, title, reason, spec: { ...spec, ...patch, view } })
    }
    const distinct = (column: Column) => new Set(dataset.rows.map((row) => row[column.id])).size
    if (x?.type === 'date') {
        add('line', 'Line', `${capital(what)} over ${spec.bin}s`, {})
        add(
            'area',
            'Area',
            series === undefined ? `The ${what} filled under its line` : `${capital(what)} stacked by ${series.name.toLowerCase()}`,
            { stack: series !== undefined },
        )
        add('bar', 'Bars', `A bar for each ${spec.bin}`, {})
        const other = texts.find((column) => column.id !== series?.id) ?? series
        if (other !== undefined)
            add('heatmap', 'Heatmap', `${capital(spec.bin)}s against ${other.name.toLowerCase()}`, { series: other.id })
    }
    if (x?.type === 'region') add('map', 'Map', `${capital(what)} shaded by region`, {})
    if (x !== undefined && (x.type === 'text' || x.type === 'region')) {
        add('bar', 'Bars', `${capital(what)} by ${x.name.toLowerCase()}, largest first`, { sort: 'desc' })
        if (distinct(x) <= 8 && series === undefined) add('pie', 'Pie', `Each ${x.name.toLowerCase()}’s share`, {})
        const across = texts.find((column) => column.id !== x.id)
        if (across !== undefined)
            add('heatmap', 'Heatmap', `${x.name} against ${across.name.toLowerCase()}`, { series: series?.id ?? across.id })
    }
    if (regions.length > 0 && x?.type !== 'region')
        add('map', 'Map', `${capital(what)} by ${regions[0].name.toLowerCase()}`, { x: regions[0].id })
    if (numbers.length >= 2) {
        const [first, second] = x?.type === 'number' && y?.type === 'number' && x.id !== y.id ? [x, y] : [numbers[0], numbers[1]]
        add('scatter', 'Scatter', `${first.name} against ${second.name.toLowerCase()}`, { x: first.id, y: second.id, color: texts[0]?.id })
    }
    if (measure !== undefined || spec.aggregate === 'count')
        add('stat', 'Figure', `The ${what} as one figure`, { x: dates[0]?.id ?? spec.x })
    add('table', 'Table', 'The same figures as rows', {})
    return out.slice(0, 4)
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** A figure rounded to two significant digits, so a scale's breaks read as round numbers: 2,474 is 2,500. */
function roundly(value: number): number {
    if (value === 0) return 0
    const step = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1)
    return Math.round(value / step) * step
}

/** Quantile breaks for a map's scale: four round steps through the figures, each once. */
export function breaksOf(values: readonly number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b)
    const breaks = [0.2, 0.4, 0.6, 0.8].map((at) => quantile(sorted, at)).filter((value): value is number => value !== null)
    return [...new Set(breaks.map(roundly))]
}
