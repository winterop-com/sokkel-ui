import { sameFilters, type Filter } from './filters'
import { columnOrder } from './table'

export { columnOrder }

/** A table's sort: the column and its direction, the shape `DataTable` holds. */
export interface ViewSort {
    column: string
    direction: 'asc' | 'desc'
}

/**
 * How a listing is set up: its filters, its sort and its columns (which are hidden, their order
 * and the widths dragged to), as `FilterBar` and `DataTable` hold them. `extra` carries what else
 * an app keeps in a view, such as how rows are grouped, compared as data.
 */
export interface ListViewState {
    filters: readonly Filter[]
    sort: ViewSort | null
    /** The hidden columns' ids. */
    hidden: readonly string[]
    /** The columns' ids in order; a column not named follows in its own order, and the first stays first. */
    order: readonly string[]
    /** Widths in pixels by column id, for the columns dragged to a width. */
    widths: Readonly<Record<string, number>>
    extra?: Readonly<Record<string, unknown>>
}

/** A listing's setup with nothing set: no filters, no sort, every column as given. */
export const EMPTY_VIEW: ListViewState = { filters: [], sort: null, hidden: [], order: [], widths: {} }

/** What can differ between a saved view and the listing now. */
export type ViewChange = 'filters' | 'sort' | 'columns' | 'extra'

/** Data written with its keys in one order, so two equal objects write alike. */
function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).filter(([, one]) => one !== undefined)
        return `{${entries
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, one]) => `${JSON.stringify(key)}:${stable(one)}`)
            .join(',')}}`
    }
    return JSON.stringify(value) ?? 'null'
}

/**
 * What differs between a saved view and the listing now: its filters (complete ones, in any
 * order), its sort, its columns (hidden ones in any order, the order, widths to the pixel), and its
 * `extra`. Given the table's column ids, an order is compared as the table draws it, so a view
 * that names no order and one that names the columns as given are alike.
 */
export function viewChanges(saved: ListViewState, now: ListViewState, columns?: readonly string[]): ViewChange[] {
    const changes: ViewChange[] = []
    if (!sameFilters(saved.filters, now.filters)) changes.push('filters')
    const sortOf = (state: ListViewState) => (state.sort === null ? 'none' : `${state.sort.column}:${state.sort.direction}`)
    if (sortOf(saved) !== sortOf(now)) changes.push('sort')
    const hidden = (state: ListViewState) => [...new Set(state.hidden)].sort().join('\n')
    const order = (state: ListViewState) => (columns === undefined ? [...state.order] : columnOrder(state.order, columns)).join('\n')
    const widths = (state: ListViewState) =>
        stable(Object.fromEntries(Object.entries(state.widths).map(([id, width]) => [id, Math.round(width)])))
    if (hidden(saved) !== hidden(now) || order(saved) !== order(now) || widths(saved) !== widths(now)) changes.push('columns')
    if (stable(saved.extra ?? {}) !== stable(now.extra ?? {})) changes.push('extra')
    return changes
}
