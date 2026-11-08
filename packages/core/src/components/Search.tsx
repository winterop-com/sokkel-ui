import { ArrowRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { useSearch } from '../hooks/use-search'
import { cn } from '../lib/cn'
import { queryRanges, searchEntries, searchKey, type SearchGroup, type SearchResult, type SearchSource } from '../lib/search'
import { GroupLabel } from './GroupLabel'
import { Highlight } from './Highlight'
import { SearchField } from './SearchField'
import { Popover, PopoverContent } from './ui/popover'
import { Spinner } from './ui/spinner'

export type { SearchGroup, SearchResult, SearchSource } from '../lib/search'

export interface SearchWords {
    placeholder: string
    /** What the list of results is called to a screen reader. */
    results: string
    searching: string
    /** Says that nothing matches the query. */
    empty: (query: string) => string
    failed: string
    /** The way to the results page for the query. */
    seeAll: (query: string) => string
    clear: string
}

const WORDS: SearchWords = {
    placeholder: 'Search',
    results: 'Results',
    searching: 'Searching',
    empty: (query) => `Nothing matches “${query}”.`,
    failed: 'The search did not answer.',
    seeAll: (query) => `See all results for “${query}”`,
    clear: 'Clear the search',
}

const THUMB = {
    sm: 'size-8',
    md: 'size-10',
} as const

/**
 * One result as a row draws it: its thumbnail or icon, its title with the query's words marked,
 * the line under it and a quiet fact at the end. The row around it (an option in a list, a link
 * on a results page, a palette's item) is the caller's; this is what it holds.
 */
export function SearchResultBody({
    result,
    query,
    size = 'sm',
    className,
}: {
    result: SearchResult
    /** The words marked in the title and the line under it, unless the result gives its own `matches`. */
    query: string
    size?: keyof typeof THUMB
    className?: string
}) {
    const Icon = result.icon
    return (
        <span className={cn('flex min-w-0 flex-1 items-center gap-2.5', className)}>
            {result.thumbnail !== undefined ? (
                <img
                    src={result.thumbnail}
                    alt=""
                    className={cn('shrink-0 bg-muted object-cover', THUMB[size], result.round === true ? 'rounded-full' : 'rounded-md')}
                />
            ) : (
                Icon !== undefined && (
                    <span
                        className={cn(
                            'flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
                            THUMB[size],
                            result.round === true && 'rounded-full',
                        )}
                    >
                        <Icon className="size-4" aria-hidden />
                    </span>
                )
            )}
            <span className="flex min-w-0 flex-1 flex-col">
                <Highlight
                    className={cn('block truncate', size === 'md' && 'font-medium')}
                    text={result.title}
                    ranges={result.matches ?? queryRanges(result.title, query)}
                />
                {result.detail !== undefined && (
                    <Highlight
                        className="block truncate text-xs text-muted-foreground"
                        text={result.detail}
                        ranges={result.matches === undefined ? queryRanges(result.detail, query) : []}
                    />
                )}
            </span>
            {result.meta !== undefined && <span className="shrink-0 text-xs text-faint">{result.meta}</span>}
        </span>
    )
}

/**
 * What the preview pane beside a search's results holds for one result: its picture across the
 * pane, its title and the line under it, then whatever the app shows of it, such as a
 * `DescriptionList` of its facts.
 */
export function SearchPreview({
    title,
    detail,
    picture,
    children,
    className,
}: {
    title: ReactNode
    detail?: ReactNode
    /** The address of a picture drawn across the top of the pane. */
    picture?: string
    children?: ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-3', className)}>
            {picture !== undefined && <img src={picture} alt="" className="aspect-video w-full rounded-md bg-muted object-cover" />}
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate font-medium">{title}</p>
                {detail !== undefined && <p className="text-xs text-muted-foreground">{detail}</p>}
            </div>
            {children}
        </div>
    )
}

/** A group's heading with how many of its kind match, when more match than are listed. */
export function SearchGroupHeading({ group, className }: { group: SearchGroup; className?: string }) {
    const total = group.total ?? group.results.length
    return (
        <GroupLabel as="div" className={cn('flex items-baseline justify-between gap-2', className)}>
            <span className="truncate">{group.title}</span>
            {total > group.results.length && <span className="tabular-nums">{total}</span>}
        </GroupLabel>
    )
}

/**
 * The one search for a page, built on `SearchField`: as words are typed the app's `search` is
 * asked, and its results open in a popover under the field, grouped by kind, each with its
 * thumbnail or icon, its title with the query's words marked and a line under it. Where the
 * popover has room, a pane beside the list previews the highlighted result through
 * `renderPreview`. The arrows move through the results, Enter opens the highlighted one through
 * `onOpen`, and Escape closes the list (a second Escape clears the field). With `onSeeAll` the
 * list ends in a way to the full results page, which Enter also takes when nothing is highlighted.
 *
 * The search is the app's: it answers at once or with a promise, and the component never fetches.
 * The first query is asked at once and each change after a pause in typing; while an answer is
 * awaited the last results stay, and with none yet the list says it is searching.
 */
export function Search({
    search,
    onOpen,
    onSeeAll,
    renderPreview,
    query: given,
    onQueryChange,
    defaultQuery = '',
    open: openGiven,
    onOpenChange,
    defaultOpen = false,
    debounce,
    minQuery = 1,
    shortcut = true,
    className,
    words: wordsGiven,
}: {
    search: SearchSource
    /** Opens a result the person chose. The list closes after. */
    onOpen: (result: SearchResult, group: SearchGroup) => void
    /** Goes to the full results page for the query; the list ends in a way to it when given. */
    onSeeAll?: (query: string) => void
    /** What the pane beside the list shows for the highlighted result, where the popover has room; none for null. */
    renderPreview?: (result: SearchResult, group: SearchGroup) => ReactNode
    /** The text in the field, held by the app with `onQueryChange`; held here from `defaultQuery` otherwise. */
    query?: string
    onQueryChange?: (query: string) => void
    defaultQuery?: string
    /** Whether the results are open, held by the app with `onOpenChange`; held here from `defaultOpen` otherwise. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
    /** Milliseconds of quiet typing before the search is asked again. */
    debounce?: number
    /** Characters needed before the search is asked. */
    minQuery?: number
    /** Whether `/` focuses the field. Only one field on a page should take it. */
    shortcut?: boolean
    className?: string
    words?: Partial<SearchWords>
}) {
    const words = { ...WORDS, ...wordsGiven }
    const [queryHeld, setQueryHeld] = useState(defaultQuery)
    const query = given ?? queryHeld
    const setQuery = (next: string) => {
        if (given === undefined) setQueryHeld(next)
        onQueryChange?.(next)
    }
    const [openHeld, setOpenHeld] = useState(defaultOpen)
    const open = openGiven ?? openHeld
    const setOpen = (next: boolean) => {
        if (openGiven === undefined) setOpenHeld(next)
        onOpenChange?.(next)
    }

    const anchor = useRef<HTMLDivElement | null>(null)
    const popup = useRef<HTMLDivElement | null>(null)
    const id = useId()
    const listId = `${id}-results`
    const optionId = (index: number) => `${id}-option-${String(index)}`

    const answer = useSearch(search, query, { debounce, minQuery, enabled: open })
    const entries = searchEntries(answer.groups)
    const trimmed = query.trim()
    const seeAll = onSeeAll !== undefined && trimmed !== ''
    const count = entries.length + (seeAll ? 1 : 0)

    // The highlight starts on the first result of each answer, so Enter opens the top match.
    const [highlight, setHighlight] = useState<{ groups: readonly SearchGroup[]; index: number }>({ groups: answer.groups, index: 0 })
    const highlighted = highlight.groups === answer.groups ? Math.min(highlight.index, count - 1) : count > 0 ? 0 : -1
    const move = (index: number) => setHighlight({ groups: answer.groups, index })

    const shown = open && trimmed.length >= minQuery

    useEffect(() => {
        if (!shown || highlighted < 0) return
        document.getElementById(optionId(highlighted))?.scrollIntoView({ block: 'nearest' })
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the id is stable for the component's life
    }, [shown, highlighted])

    const choose = (index: number) => {
        const entry = entries.at(index)
        if (index < entries.length && entry !== undefined) {
            setOpen(false)
            onOpen(entry.result, entry.group)
        } else if (seeAll) {
            setOpen(false)
            onSeeAll(trimmed)
        }
    }

    const previewed = entries.at(highlighted >= 0 && highlighted < entries.length ? highlighted : 0)
    const preview = renderPreview !== undefined && previewed !== undefined ? renderPreview(previewed.result, previewed.group) : null
    const hasPreview = preview !== null && preview !== undefined

    return (
        <Popover
            open={shown}
            onOpenChange={(next, details) => {
                if (next) return
                const target = details.event?.target
                if (details.reason === 'outside-press' && target instanceof Node && anchor.current?.contains(target)) return
                setOpen(false)
            }}
        >
            <div ref={anchor} data-slot="search" className={cn('min-w-0', className)}>
                <SearchField
                    value={query}
                    onChange={(next) => {
                        setQuery(next)
                        setOpen(true)
                    }}
                    placeholder={words.placeholder}
                    shortcut={shortcut}
                    words={{ clear: words.clear }}
                    inputProps={{
                        role: 'combobox',
                        autoComplete: 'off',
                        'aria-autocomplete': 'list',
                        'aria-expanded': shown,
                        'aria-controls': shown ? listId : undefined,
                        'aria-activedescendant': shown && highlighted >= 0 ? optionId(highlighted) : undefined,
                        onFocus: () => setOpen(true),
                        onBlur: (event) => {
                            if (event.relatedTarget instanceof Node && popup.current?.contains(event.relatedTarget)) return
                            setOpen(false)
                        },
                        onKeyDown: (event) => {
                            if (event.nativeEvent.isComposing) return
                            const action = searchKey(event.key, highlighted, count, shown)
                            if (action === null) {
                                if (!shown && event.key === 'ArrowDown') setOpen(true)
                                return
                            }
                            event.preventDefault()
                            if (action.type === 'close') setOpen(false)
                            else if (action.type === 'move') move(action.index)
                            else choose(action.index)
                        },
                    }}
                />
            </div>
            <PopoverContent
                ref={popup}
                anchor={anchor}
                align="start"
                sideOffset={6}
                initialFocus={false}
                finalFocus={false}
                className={cn(
                    '@container max-h-[min(30rem,var(--available-height))] min-w-(--anchor-width) gap-0 overflow-hidden p-0',
                    renderPreview === undefined ? 'w-[min(32rem,calc(100vw-2rem))]' : 'w-[min(46rem,calc(100vw-2rem))]',
                )}
            >
                <div className="flex min-h-0 flex-1">
                    <div
                        id={listId}
                        role="listbox"
                        aria-label={words.results}
                        className="flex min-w-0 flex-1 scroll-fade-b flex-col gap-1 overflow-y-auto p-1.5"
                    >
                        {answer.groups
                            .filter((group) => group.results.length > 0)
                            .map((group) => (
                                <div key={group.kind} role="group" aria-label={group.title} className="flex flex-col">
                                    <SearchGroupHeading group={group} className="px-2 pt-1.5 pb-1" />
                                    {group.results.map((result) => {
                                        const index = entries.findIndex((entry) => entry.result === result)
                                        return (
                                            <div
                                                key={result.id}
                                                id={optionId(index)}
                                                role="option"
                                                aria-selected={index === highlighted}
                                                className="flex cursor-default items-center rounded-md px-2 py-1.5 text-sm select-none aria-selected:bg-muted"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onMouseMove={() => {
                                                    if (index !== highlighted) move(index)
                                                }}
                                                onClick={() => choose(index)}
                                            >
                                                <SearchResultBody result={result} query={trimmed} />
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        {entries.length === 0 && (
                            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                                {answer.state === 'loading' || answer.state === 'idle' ? (
                                    <>
                                        <Spinner className="text-faint" />
                                        {words.searching}
                                    </>
                                ) : answer.state === 'failed' ? (
                                    words.failed
                                ) : (
                                    words.empty(trimmed)
                                )}
                            </div>
                        )}
                    </div>
                    {hasPreview && (
                        <aside className="hidden w-[45%] shrink-0 overflow-y-auto border-l border-border p-3 @xl:block">{preview}</aside>
                    )}
                </div>
                {seeAll && (
                    <div className="border-t border-border p-1.5">
                        <div
                            id={optionId(entries.length)}
                            role="option"
                            aria-selected={highlighted === entries.length}
                            className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground select-none aria-selected:bg-muted aria-selected:text-foreground"
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseMove={() => {
                                if (highlighted !== entries.length) move(entries.length)
                            }}
                            onClick={() => choose(entries.length)}
                        >
                            <span className="min-w-0 flex-1 truncate">{words.seeAll(trimmed)}</span>
                            {answer.state === 'loading' && entries.length > 0 && <Spinner className="text-faint" />}
                            <ArrowRight className="size-4 shrink-0" aria-hidden />
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
