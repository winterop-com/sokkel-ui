import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { HighlightRange } from '../components/Highlight'

/** One thing a search found: a job, a person, a run, a file. */
export interface SearchResult {
    id: string
    title: string
    /** The line under the title: where it lives, what it is, when it last changed. */
    detail?: string
    /** A quiet fact at the row's end, such as a state or a time. */
    meta?: string
    /** The address of a small picture drawn before the title. */
    thumbnail?: string
    /** A picture drawn in the thumbnail's place, such as a drawn cover or a placeholder made from the record. */
    artwork?: ReactNode
    /** Draws the thumbnail or the artwork round, as a person's picture. */
    round?: boolean
    /** An icon before the title where there is no thumbnail. */
    icon?: LucideIcon
    /** The spans of the title to mark; the query's words wherever they occur in it otherwise. */
    matches?: readonly HighlightRange[]
    /** The result's value for each of the app's facets, such as `{ project: 'harbor' }`. */
    facets?: Readonly<Record<string, string>>
}

/** The results of one kind, under that kind's heading. */
export interface SearchGroup {
    /** The kind's key, the value the kind facet filters on: `jobs`, `people`. */
    kind: string
    /** The kind's heading: Jobs, People. */
    title: string
    results: readonly SearchResult[]
    /** How many of this kind match in all, when more match than are listed. */
    total?: number
}

/**
 * Answers a query with its results grouped by kind, at once or as a promise. The signal aborts
 * when a newer query replaces this one, so an app can cancel its own request.
 */
export type SearchSource = (query: string, signal: AbortSignal) => readonly SearchGroup[] | Promise<readonly SearchGroup[]>

/**
 * Where a search for `query` stands: not asked, waiting, answered, or failed. Groups belong to the
 * query they answer: `done` holds the query's own and `failed` none, while `loading` holds only an
 * earlier query's, kept so the list does not jump while the answer comes, to be drawn as stale and
 * never opened.
 */
export type SearchState =
    | { state: 'idle'; query: string; groups: readonly SearchGroup[] }
    | { state: 'loading'; query: string; groups: readonly SearchGroup[] }
    | { state: 'done'; query: string; groups: readonly SearchGroup[] }
    | { state: 'failed'; query: string; groups: readonly SearchGroup[]; reason: string }

/** A search not asked yet. */
export const SEARCH_IDLE: SearchState = { state: 'idle', query: '', groups: [] }

/**
 * What a search held so far stands as for `query`: itself when it is about that query, or else the
 * query loading with the held groups kept as stale. So an older query's results, or a failure's,
 * never stand as the query's own, not even while the next ask waits out the pause in typing.
 * `asking` is the step as the query is asked: it keeps only an answer the query already has.
 */
export function searchFor(held: SearchState, query: string, asking = false): SearchState {
    return held.query === query && (!asking || held.state === 'done') ? held : { state: 'loading', query, groups: held.groups }
}

/**
 * What a search keeps while it is asked (`asking`), and nothing once it is not: its query emptied
 * or shorter than its shortest, or its list closed. So results stand as stale only while a query is
 * refined in one open list, never after it was cleared or the list was opened again.
 */
export const searchKept = (held: SearchState, asking: boolean): SearchState => (asking ? held : SEARCH_IDLE)

/** A result in the order the keyboard moves through them, with its group and its place in the list. */
export interface SearchEntry {
    group: SearchGroup
    result: SearchResult
    index: number
}

/** The groups' results in one list, in the order they are drawn, skipping empty groups. */
export function searchEntries(groups: readonly SearchGroup[]): SearchEntry[] {
    const entries: SearchEntry[] = []
    for (const group of groups) {
        for (const result of group.results) entries.push({ group, result, index: entries.length })
    }
    return entries
}

/** The words of a query, lower-cased, without repeats; a word inside another is dropped. */
export function queryWords(query: string): string[] {
    const words = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))]
    return words.filter((word) => !words.some((other) => other !== word && other.includes(word)))
}

/** Where a term occurs in a text, every time and in any case, for `Highlight`; a blank term occurs nowhere. */
export function literalRanges(text: string, term: string): HighlightRange[] {
    const needle = term.trim().toLowerCase()
    if (needle === '') return []
    const lower = text.toLowerCase()
    const ranges: HighlightRange[] = []
    for (let from = lower.indexOf(needle); from !== -1; from = lower.indexOf(needle, from + needle.length))
        ranges.push({ start: from, end: from + needle.length })
    return ranges
}

/** Where the query's words occur in a text, in any case, for `Highlight`. */
export function queryRanges(text: string, query: string): HighlightRange[] {
    return queryWords(query)
        .flatMap((word) => literalRanges(text, word))
        .sort((a, b) => a.start - b.start)
}

/** What a key does in a search's list: move the highlight, open the highlighted entry, or close the list. */
export type SearchKeyAction = { type: 'move'; index: number } | { type: 'open'; index: number } | { type: 'close' }

/**
 * What a key pressed in the search field does, given the highlighted entry (-1 for none) and the
 * number of entries. The arrows move and wrap around the ends, Home and End jump to them, Enter
 * opens the highlighted entry, and Escape closes the list. Any other key, or a move with nothing
 * listed, does nothing here.
 */
export function searchKey(key: string, highlighted: number, count: number, open: boolean): SearchKeyAction | null {
    if (key === 'Escape') return open ? { type: 'close' } : null
    if (!open || count === 0) return null
    switch (key) {
        case 'ArrowDown':
            return { type: 'move', index: highlighted < 0 || highlighted >= count - 1 ? 0 : highlighted + 1 }
        case 'ArrowUp':
            return { type: 'move', index: highlighted <= 0 ? count - 1 : highlighted - 1 }
        case 'Home':
            return { type: 'move', index: 0 }
        case 'End':
            return { type: 'move', index: count - 1 }
        case 'Enter':
            return highlighted >= 0 && highlighted < count ? { type: 'open', index: highlighted } : null
        default:
            return null
    }
}

/** One value of a facet with how many results carry it. */
export interface SearchFacetValue {
    value: string
    /** What the value is called; the value itself otherwise. */
    label?: string
    count: number
}

/** A facet the results page filters by: the kind, or one of the app's, such as the project. */
export interface SearchFacet {
    id: string
    title: string
    values: readonly SearchFacetValue[]
}

/** The facet a results page builds from the groups themselves: one value per kind, counted by its total. */
export const KIND_FACET = 'kind'

/** The values chosen in each facet, by the facet's id; a facet with none chosen keeps every result. */
export type SearchChosen = Readonly<Record<string, readonly string[]>>

/** Whether a result in a group is kept by the chosen facet values. */
function kept(group: SearchGroup, result: SearchResult, chosen: SearchChosen, skip?: string): boolean {
    return Object.entries(chosen).every(([facet, values]) => {
        if (facet === skip || values.length === 0) return true
        const value = facet === KIND_FACET ? group.kind : result.facets?.[facet]
        return value !== undefined && values.includes(value)
    })
}

/** The groups narrowed to the results the chosen facet values keep, dropping groups left empty. */
export function filterGroups(groups: readonly SearchGroup[], chosen: SearchChosen): SearchGroup[] {
    if (Object.values(chosen).every((values) => values.length === 0)) return groups.filter((group) => group.results.length > 0)
    return groups
        .map((group) => {
            const results = group.results.filter((result) => kept(group, result, chosen))
            return { ...group, results, total: results.length }
        })
        .filter((group) => group.results.length > 0)
}

/**
 * Counts the facets over results held in the browser: the kind, then each of `facets` (id and
 * title), each value counted under the choices made in the other facets, so a count says what
 * choosing that value would show. An app whose server counts gives its facets to the page instead.
 */
export function countFacets(
    groups: readonly SearchGroup[],
    facets: readonly { id: string; title: string; labels?: Readonly<Record<string, string>> }[],
    chosen: SearchChosen,
    kindTitle = 'Kind',
): SearchFacet[] {
    const kind: SearchFacet = {
        id: KIND_FACET,
        title: kindTitle,
        values: groups.map((group) => ({
            value: group.kind,
            label: group.title,
            count: group.results.filter((result) => kept(group, result, chosen, KIND_FACET)).length,
        })),
    }
    const own = facets.map((facet) => {
        const counts = new Map<string, number>()
        for (const group of groups) {
            for (const result of group.results) {
                const value = result.facets?.[facet.id]
                if (value === undefined || !kept(group, result, chosen, facet.id)) continue
                counts.set(value, (counts.get(value) ?? 0) + 1)
            }
        }
        const values = [...counts].map(([value, count]) => ({ value, label: facet.labels?.[value], count }))
        return { id: facet.id, title: facet.title, values: values.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)) }
    })
    return [kind, ...own]
}

/** The chosen values with one value of one facet turned on or off. */
export function toggleChosen(chosen: SearchChosen, facet: string, value: string): SearchChosen {
    const values = chosen[facet] ?? []
    return { ...chosen, [facet]: values.includes(value) ? values.filter((other) => other !== value) : [...values, value] }
}
