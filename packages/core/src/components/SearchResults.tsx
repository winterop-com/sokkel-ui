import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { toggleChosen, type SearchChosen, type SearchFacet, type SearchGroup, type SearchResult } from '../lib/search'
import { GroupLabel } from './GroupLabel'
import { ListSkeleton } from './Loading'
import { SearchGroupHeading, SearchResultBody } from './Search'
import { SearchField } from './SearchField'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Spinner } from './ui/spinner'

export type { SearchChosen, SearchFacet, SearchFacetValue } from '../lib/search'

export interface SearchResultsWords {
    placeholder: string
    /** How many results match in all. */
    count: (total: number) => string
    /** What the column of facets is called to a screen reader. */
    facets: string
    more: string
    loading: string
    empty: (query: string) => string
    failed: string
    clear: string
}

const WORDS: SearchResultsWords = {
    placeholder: 'Search',
    count: (total) => (total === 1 ? '1 result' : `${total.toLocaleString('en-US')} results`),
    facets: 'Filters',
    more: 'More',
    loading: 'Searching',
    empty: (query) => `Nothing matches “${query}”.`,
    failed: 'The search did not answer.',
    clear: 'Clear the search',
}

/**
 * One facet as a titled list of its values, each a checkbox with its count at the row's end. Where
 * the page is narrow the values wrap side by side as framed chips, so the facets take few lines.
 */
function FacetList({ facet, chosen, onToggle }: { facet: SearchFacet; chosen: readonly string[]; onToggle: (value: string) => void }) {
    if (facet.values.length === 0) return null
    return (
        <fieldset className="flex min-w-0 flex-wrap items-center gap-1.5 @3xl:flex-col @3xl:flex-nowrap @3xl:items-stretch @3xl:gap-0.5">
            <legend className="contents">
                <GroupLabel as="span" className="w-full pb-0.5 @3xl:px-2">
                    {facet.title}
                </GroupLabel>
            </legend>
            {facet.values.map((value) => {
                const on = chosen.includes(value.value)
                return (
                    <label
                        key={value.value}
                        className={cn(
                            'flex min-w-0 cursor-pointer items-center gap-2 rounded-control border border-border px-2 py-1 text-sm hover:bg-hover @3xl:gap-2.5 @3xl:border-transparent',
                            value.count === 0 && !on && 'text-faint',
                        )}
                    >
                        <Checkbox checked={on} onCheckedChange={() => onToggle(value.value)} />
                        <span className="min-w-0 truncate @3xl:flex-1">{value.label ?? value.value}</span>
                        <span className="shrink-0 text-xs text-faint tabular-nums">{value.count}</span>
                    </label>
                )
            })}
        </fieldset>
    )
}

export interface SearchResultsProps {
    query: string
    onQueryChange: (query: string) => void
    /** The results to list, already narrowed by the chosen values. */
    groups: readonly SearchGroup[]
    /** The facets with their values' counts; the kind facet's id is `KIND_FACET`. */
    facets?: readonly SearchFacet[]
    /** The values chosen in each facet. */
    chosen?: SearchChosen
    onChosenChange?: (chosen: SearchChosen) => void
    /** How many results match in all; the listed ones are counted otherwise. */
    total?: number
    onOpen: (result: SearchResult, group: SearchGroup) => void
    /** Asks for the next page of results; a button under the list calls it while given. */
    onMore?: () => void
    /** `loading` with no results yet draws their shape; `failed` says the search did not answer. */
    state?: 'loading' | 'done' | 'failed'
    /** The next page is on its way: the more button waits. */
    loadingMore?: boolean
    /** Controls at a result row's end, such as a menu. */
    renderActions?: (result: SearchResult, group: SearchGroup) => ReactNode
    /** Whether `/` focuses the query field. */
    shortcut?: boolean
    className?: string
    words?: Partial<SearchResultsWords>
}

/**
 * The page of a search's results: the query in a `SearchField` over everything that matches,
 * grouped by kind under headings with their counts, and the facets beside them (the kind and the
 * app's own, such as the project) as checkboxes with how many results each keeps. Where the page
 * is narrow the facets sit above the results. A result opens through `onOpen`, and `onMore` adds
 * a button under the list that asks for the next page.
 *
 * The page draws what it is given and never fetches: the app asks its search for the query and
 * the chosen values and passes the results and the facets' counts back, from its server or from
 * `countFacets` and `filterGroups` over results it holds.
 */
export function SearchResults({
    query,
    onQueryChange,
    groups,
    facets = [],
    chosen = {},
    onChosenChange,
    total,
    onOpen,
    onMore,
    state = 'done',
    loadingMore = false,
    renderActions,
    shortcut = true,
    className,
    words: given,
}: SearchResultsProps) {
    const words = { ...WORDS, ...given }
    const listed = groups.reduce((sum, group) => sum + group.results.length, 0)
    const all = total ?? groups.reduce((sum, group) => sum + (group.total ?? group.results.length), 0)
    const trimmed = query.trim()
    const shown = facets.filter((facet) => facet.values.length > 0)

    return (
        <div data-slot="search-results" className={cn('@container flex min-w-0 flex-col gap-4', className)}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <SearchField
                    value={query}
                    onChange={onQueryChange}
                    placeholder={words.placeholder}
                    shortcut={shortcut}
                    words={{ clear: words.clear }}
                    className="w-full max-w-xl"
                />
                {state !== 'failed' && (listed > 0 || state === 'done') && (
                    <span className="text-sm text-muted-foreground tabular-nums">{words.count(all)}</span>
                )}
            </div>
            <div className={cn('grid min-w-0 gap-6', shown.length > 0 && '@3xl:grid-cols-[14rem_minmax(0,1fr)]')}>
                {shown.length > 0 && (
                    <aside aria-label={words.facets} className="flex min-w-0 flex-col gap-4">
                        {shown.map((facet) => (
                            <FacetList
                                key={facet.id}
                                facet={facet}
                                chosen={chosen[facet.id] ?? []}
                                onToggle={(value) => onChosenChange?.(toggleChosen(chosen, facet.id, value))}
                            />
                        ))}
                    </aside>
                )}
                <div className="flex min-w-0 flex-col gap-5">
                    {state === 'loading' && listed === 0 ? (
                        <ListSkeleton rows={6} label={words.loading} />
                    ) : state === 'failed' && listed === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">{words.failed}</p>
                    ) : listed === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">{words.empty(trimmed)}</p>
                    ) : (
                        groups
                            .filter((group) => group.results.length > 0)
                            .map((group) => (
                                <section key={group.kind} aria-label={group.title} className="flex min-w-0 flex-col gap-1">
                                    <SearchGroupHeading group={group} className="px-2" />
                                    <ul className="flex flex-col">
                                        {group.results.map((result) => (
                                            <li key={result.id} className="flex min-w-0 items-center gap-1 rounded-md hover:bg-hover">
                                                <button
                                                    type="button"
                                                    className="flex min-w-0 flex-1 items-center rounded-md px-2 py-2 text-left text-sm outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                                                    onClick={() => onOpen(result, group)}
                                                >
                                                    <SearchResultBody result={result} query={trimmed} size="md" />
                                                </button>
                                                {renderActions !== undefined && (
                                                    <span className="flex shrink-0 items-center pr-1">{renderActions(result, group)}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))
                    )}
                    {onMore !== undefined && listed > 0 && (
                        <Button variant="outline" className="self-center" disabled={loadingMore} onClick={onMore}>
                            {loadingMore && <Spinner />}
                            {words.more}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
