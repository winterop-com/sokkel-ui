import type { PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import type { Filter } from '@winterop-com/sokkel-ui/FilterBar'

/** What a column holds, which decides how its values are read, edited, filtered and charted. */
export type ColumnType = 'text' | 'number' | 'date' | 'region'

export const COLUMN_TYPES: readonly { value: ColumnType; label: string; description: string }[] = [
    { value: 'text', label: 'Text', description: 'Names and labels, charted as categories' },
    { value: 'number', label: 'Number', description: 'Figures that are added up, averaged and plotted' },
    { value: 'date', label: 'Date', description: 'Days as YYYY-MM-DD, binned by day, week or month' },
    { value: 'region', label: 'Region', description: 'Region names, drawn on the map' },
]

export interface Column {
    id: string
    name: string
    type: ColumnType
}

/** A row: its id and each column's value as text by the column's id, empty for none. */
export type DataRow = Readonly<Record<string, string>> & { readonly id: string }

export type DatasetSource = 'seed' | 'file' | 'paste' | 'link'

export interface Dataset {
    id: string
    name: string
    description: string
    source: DatasetSource
    columns: Column[]
    rows: DataRow[]
    /** When it last changed, as an ISO time. */
    updatedAt: string
}

/** The views a chart is drawn as. */
export type ViewKind = 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'heatmap' | 'map' | 'table' | 'stat'

export type Aggregate = 'sum' | 'avg' | 'count' | 'min' | 'max'

export const AGGREGATES: readonly { value: Aggregate; label: string }[] = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Mean' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
]

/** How dates along a chart are grouped. */
export type DateBin = 'day' | 'week' | 'month'

export const BINS: readonly { value: DateBin; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
]

/** The categories in their own order (dates in time, names A to Z), or by their figure. */
export type SortOrder = 'natural' | 'desc' | 'asc'

export const SORTS: readonly { value: SortOrder; label: string }[] = [
    { value: 'natural', label: 'A to Z' },
    { value: 'desc', label: 'Largest' },
    { value: 'asc', label: 'Smallest' },
]

/** How many categories a chart keeps; 0 keeps them all. */
export const LIMITS: readonly { value: string; label: string }[] = [
    { value: '0', label: 'All' },
    { value: '5', label: 'Top 5' },
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
]

/** What a chart reads from its dataset and how it draws it; fields name columns by id. */
export interface ViewSpec {
    view: ViewKind
    x?: string
    /** The measure; none counts the rows. */
    y?: string
    series?: string
    size?: string
    color?: string
    aggregate: Aggregate
    bin: DateBin
    sort: SortOrder
    limit: number
    stack: boolean
    horizontal: boolean
    /** A palette's id, or `default` for the one in the settings. */
    palette: string
}

export interface SavedChart {
    id: string
    name: string
    datasetId: string
    spec: ViewSpec
    updatedAt: string
}

/** A chart placed on a board, as wide as its span. */
export interface BoardItem {
    id: string
    chartId: string
    span: PanelSpan
}

export interface Board {
    id: string
    name: string
    description: string
    items: BoardItem[]
    /** Filters over every chart on the board whose dataset has the column, by the column's name. */
    filters: Filter[]
    updatedAt: string
}

export type NumberStyle = 'grouped' | 'compact' | 'plain'

export interface Preferences {
    id: string
    /** The palette a chart takes when it names none of its own. */
    palette: string
    numbers: NumberStyle
    /** Decimals in figures: `auto` writes up to two. */
    decimals: 'auto' | '0' | '1' | '2'
    /** How a new chart combines its figures at first. */
    aggregate: Aggregate
    /** Whether the builder suggests views for the columns picked. */
    suggestions: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
    id: 'prefs',
    palette: 'theme',
    numbers: 'grouped',
    decimals: 'auto',
    aggregate: 'sum',
    suggestions: true,
}

/** Palettes of color tokens; the theme's own order has none. */
export const PALETTES: readonly { id: string; label: string; tokens: readonly string[] | undefined }[] = [
    { id: 'theme', label: 'Theme', tokens: undefined },
    { id: 'cool', label: 'Cool', tokens: ['kind-teal', 'kind-blue', 'kind-violet', 'kind-jade', 'chart-2'] },
    { id: 'warm', label: 'Warm', tokens: ['kind-pink', 'chart-5', 'chart-4', 'chart-3', 'kind-violet'] },
    { id: 'earth', label: 'Earth', tokens: ['kind-green', 'kind-jade', 'chart-4', 'kind-teal', 'chart-3'] },
]

/** The tokens the theme gives series in turn, for a swatch of its palette. */
export const THEME_TOKENS = ['chart-2', 'chart-3', 'chart-4', 'kind-teal', 'kind-pink']

/** A palette's tokens: the chart's own, or the settings' where it says `default`; undefined for the theme's order. */
export function paletteOf(id: string, prefs: Preferences): readonly string[] | undefined {
    const chosen = id === 'default' ? prefs.palette : id
    return PALETTES.find((palette) => palette.id === chosen)?.tokens
}

let made = 0

/** A fresh id with a prefix, unique in this session. */
export function freshId(prefix: string): string {
    made += 1
    return `${prefix}-${Date.now().toString(36)}-${String(made)}`
}

/** Now, as an ISO time. */
export const now = (): string => new Date().toISOString()

/** A count with its noun: `1 row`, `12 rows`. */
export function counted(count: number, noun: string, plural = `${noun}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? noun : plural}`
}
