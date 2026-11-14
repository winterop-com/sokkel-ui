import { Combobox } from '@base-ui/react'
import { Check, ChevronsUpDown, Plus, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'

import { useBusyRelease } from '../hooks/use-busy-release'
import { cn } from '../lib/cn'
import { WAIT_SHOWN } from '../lib/durations'
import { INVALID_EDGE, ISSUE_WITHIN_EDGE } from '../lib/issue-edge'
import { Spinner } from './ui/spinner'

export interface AsyncSelectWords {
    placeholder: string
    search: string
    loading: string
    empty: string
    /** Says what to type when nothing is asked until a few characters are in. */
    typeMore: (characters: number) => string
    failed: string
    retry: string
    /** The line under the list while the next page loads. */
    loadingMore: string
    /** The row that makes an option of the typed text. */
    create: (text: string) => string
    /** Said when the app could not make the option. */
    createFailed: string
    /** A chosen value's remove button, with several values. */
    remove: (label: string) => string
}

const WORDS: AsyncSelectWords = {
    placeholder: 'Choose',
    search: 'Search',
    loading: 'Searching',
    empty: 'Nothing matches.',
    typeMore: (characters) => `Type ${String(characters)} or more characters to search.`,
    failed: 'The search did not answer.',
    retry: 'Try again',
    loadingMore: 'Loading more',
    create: (text) => `Create "${text}"`,
    createFailed: 'It could not be created.',
    remove: (label) => `Remove ${label}`,
}

/** Where the next page of options starts, as the app's loader names it: a page number, an offset, a token. */
export type AsyncCursor = string | number

/** One page of options, and where the next one starts. */
export interface AsyncPage<T> {
    items: readonly T[]
    /** Handed back to `load` for the next page; none when this page is the last. */
    next?: AsyncCursor | null
}

/**
 * Answers a query with its options: all of them, or a page and where the next starts. `cursor` is
 * absent for the first page. The signal aborts when a newer query replaces this one.
 */
export type AsyncLoad<T> = (query: string, signal: AbortSignal, cursor?: AsyncCursor) => Promise<readonly T[] | AsyncPage<T>>

/** Where the options for a query stand: those loaded, where the next page starts, and what runs or failed. */
export interface AsyncAnswer<T> {
    items: readonly T[]
    next: AsyncCursor | undefined
    /** What is loading now: the first page, the next one, or nothing. */
    loading: 'first' | 'more' | null
    /** What failed and why. */
    failed: { at: 'first' | 'more'; reason: string } | null
    /** Whether the first page has answered. */
    answered: boolean
}

export const NO_ANSWER: AsyncAnswer<never> = { items: [], next: undefined, loading: null, failed: null, answered: false }

/** A loader's answer as a page: a plain list is the one and last page. */
export function pageOf<T>(answer: readonly T[] | AsyncPage<T>): AsyncPage<T> {
    return Array.isArray(answer) ? { items: answer as readonly T[] } : (answer as AsyncPage<T>)
}

/** A page landed: the first replaces the options, a later one adds those not listed yet. */
export function withPage<T>(answer: AsyncAnswer<T>, page: AsyncPage<T>, at: 'first' | 'more', key: (item: T) => string): AsyncAnswer<T> {
    const known = new Set(at === 'more' ? answer.items.map(key) : [])
    const added = page.items.filter((item) => {
        const id = key(item)
        if (known.has(id)) return false
        known.add(id)
        return true
    })
    return {
        items: at === 'more' ? [...answer.items, ...added] : added,
        next: page.next ?? undefined,
        loading: null,
        failed: null,
        answered: true,
    }
}

/** Whether the next page should load: there is one, nothing runs, and the first page did not fail. */
export function wantsMore(answer: AsyncAnswer<unknown>): boolean {
    return answer.answered && answer.next !== undefined && answer.loading === null && answer.failed === null
}

/**
 * Whether the list waits for its query's options: no answer yet, asked or still in the pause in
 * typing, or a first page on its way in place of the options listed. A query too short to ask
 * waits for nothing.
 */
export function waitsForFirst(answer: AsyncAnswer<unknown>, short: boolean): boolean {
    return !short && (answer.loading === 'first' || !answer.answered)
}

/**
 * What the line under the list says, `waiting` for the Searching line's room kept unseen, or null
 * for no line. Searching shows only once the wait is slow, having run `wait-shown`: before that an
 * earlier answer of nothing still says nothing matches, and with no answer the line keeps its room
 * unseen, so an answer that comes sooner draws no Searching and the list does not jump.
 */
export function noteOf(
    answer: AsyncAnswer<unknown>,
    { short, empty, creating, slow }: { short: boolean; empty: boolean; creating: 'busy' | 'failed' | null; slow: boolean },
): 'typeMore' | 'createFailed' | 'failed' | 'loadingMore' | 'searching' | 'waiting' | 'empty' | null {
    if (short) return 'typeMore'
    if (creating === 'failed') return 'createFailed'
    if (answer.failed !== null) return 'failed'
    if (answer.loading === 'more') return 'loadingMore'
    if (!empty) return null
    if (slow && waitsForFirst(answer, short)) return 'searching'
    return answer.answered ? 'empty' : 'waiting'
}

/** Whether a list is scrolled within `margin` pixels of its end, or is too short to scroll at all. */
export function nearEnd(list: { scrollTop: number; clientHeight: number; scrollHeight: number }, margin = 48): boolean {
    return list.scrollTop + list.clientHeight >= list.scrollHeight - margin
}

/** Whether to offer making an option of the typed text: there is text, and no option is called that. */
export function offersCreate<T>(text: string, items: readonly T[], label: (item: T) => string): boolean {
    const wanted = text.trim().toLocaleLowerCase('en-US')
    return wanted !== '' && !items.some((item) => label(item).trim().toLocaleLowerCase('en-US') === wanted)
}

/**
 * The options whose label, or whose detail when it is text, holds every word typed, in any case,
 * in their order; all of them for an empty query.
 */
export function filterLocal<T>(items: readonly T[], query: string, label: (item: T) => string, detail?: (item: T) => ReactNode): T[] {
    const words = query.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean)
    if (words.length === 0) return [...items]
    return items.filter((item) => {
        const shown = detail?.(item)
        const text = `${label(item)} ${typeof shown === 'string' || typeof shown === 'number' ? String(shown) : ''}`.toLocaleLowerCase(
            'en-US',
        )
        return words.every((word) => text.includes(word))
    })
}

const said = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason))

/** The row that makes an option of the typed text. */
class Creation {
    constructor(readonly text: string) {}
}

interface AsyncSelectBase<T> {
    id?: string
    itemKey: (item: T) => string
    itemLabel: (item: T) => string
    /** How an option is drawn in the list; its label alone otherwise. */
    renderItem?: (item: T) => ReactNode
    /**
     * A second word for an option, such as its code, beside its label, or under it where the list is
     * narrow; in the code face, in the list and beside the chosen value.
     */
    itemDetail?: (item: T) => ReactNode
    /** A mark before an option's label, such as its kind's icon, in the list, the chosen value and its chip. */
    itemMark?: (item: T) => ReactNode
    /** A figure at the option's end, such as how many rows it holds. */
    itemMeta?: (item: T) => ReactNode
    /** Sets `itemMeta` in the code face, for a code at the row's end rather than a figure. */
    monoMeta?: boolean
    /** Shows `itemMeta` at the end of the chosen value too, with one value. */
    metaInValue?: boolean
    /** Sets the options' labels in the code face, in the list, the chosen value and its chips: names that are codes. */
    mono?: boolean
    /** Shows the value and takes no input: no list opens, and a chip has no remove button. */
    disabled?: boolean
    /** Shows the value, focusable, but takes no change: no list opens, and a chip has no remove button. */
    readOnly?: boolean
    /**
     * Makes an option of the typed text, given when the app allows it: the list then ends in a row
     * that offers it while no option is called that, and the option made is chosen.
     */
    onCreate?: (text: string) => T | Promise<T>
    /** Milliseconds of quiet typing before a load. */
    debounce?: number
    /** Characters needed before anything is loaded. */
    minQuery?: number
    defaultOpen?: boolean
    defaultQuery?: string
    invalid?: boolean
    className?: string
    words?: Partial<AsyncSelectWords>
}

export interface AsyncSelectOneProps<T> extends AsyncSelectBase<T> {
    multiple?: false
    value: T | null
    onValueChange: (value: T | null) => void
}

export interface AsyncSelectManyProps<T> extends AsyncSelectBase<T> {
    /** Chooses several values, each shown as a chip in the field with its remove button. */
    multiple: true
    value: readonly T[]
    onValueChange: (value: T[]) => void
}

/** Where the options come from: a search the app answers, or a list held here. */
export type AsyncSelectSource<T> =
    | {
          /** Answers a query with its options, or a page of them; scrolling near the list's end loads the next. */
          load: AsyncLoad<T>
          items?: never
          filter?: never
      }
    | {
          load?: never
          /** Every option, held here and narrowed as the search is typed, at once: no pause, no load and no searching line. */
          items: readonly T[]
          /** Whether an option answers the query; its label, or its detail when that is text, holding every word typed otherwise. */
          filter?: (item: T, query: string) => boolean
      }

export type AsyncSelectProps<T> = (AsyncSelectOneProps<T> | AsyncSelectManyProps<T>) & AsyncSelectSource<T>

/**
 * A select whose options come from a search: its text is sent to `load` after a pause in typing.
 * Older answers are dropped, a request still in flight is aborted, and the last options stay listed
 * while the next load runs. A failed load says so with a way to try again.
 *
 * One value reads like a select whose popover holds the search box. With `multiple`, the chosen
 * values are chips in the field, each with its remove button (Backspace takes the last), the search
 * is typed in the field itself, and the list stays open while values are picked.
 *
 * A loader that answers a page at a time (`{ items, next }`) gets the next page as the list is
 * scrolled near its end, the line under it saying so. With `onCreate`, typed text that names no
 * option is offered as a new one at the list's end.
 *
 * Given `items` in place of `load`, it is a searchable select over a list it holds: what is typed
 * narrows the options at once, by `filter` or by every word in an option's label or text detail,
 * with no pause, no load and no searching line. `itemMeta` puts a quiet figure at a row's end, or a
 * code with `monoMeta`, and at the chosen value's end too with `metaInValue`. `mono` sets labels
 * that are codes in the code face, chips included. `disabled` and `readOnly` show the value without
 * a list or remove buttons.
 *
 * The list is as wide as its longest row, from the field's width up to the window's less a margin.
 * Escape closes the list and goes no further, so a dialog around the field stays open.
 */
export function AsyncSelect<T>(props: AsyncSelectProps<T>) {
    const {
        id,
        load,
        items: local,
        filter: matches,
        itemKey,
        itemLabel,
        renderItem,
        itemDetail,
        itemMark,
        itemMeta,
        monoMeta = false,
        metaInValue = false,
        mono = false,
        disabled = false,
        readOnly = false,
        onCreate,
        debounce = 250,
        minQuery = 0,
        defaultOpen = false,
        defaultQuery = '',
        invalid = false,
        className,
        words: given,
    } = props
    const words = { ...WORDS, ...given }
    const [open, setOpen] = useState(defaultOpen)
    const [query, setQuery] = useState(defaultQuery)
    const [answer, setAnswer] = useState<AsyncAnswer<T>>(NO_ANSWER)
    const [attempt, setAttempt] = useState(0)
    const [creating, setCreating] = useState<'busy' | 'failed' | null>(null)
    const loadRef = useRef(load)
    const answerRef = useRef(answer)
    const asked = useRef('')
    const more = useRef<AbortController | null>(null)
    const listRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const anchorRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        loadRef.current = load
    }, [load])
    useLayoutEffect(() => {
        answerRef.current = answer
    }, [answer])

    const short = query.trim().length < minQuery
    const held = local !== undefined

    useEffect(() => {
        const run = loadRef.current
        if (!open || short || run === undefined) return
        const controller = new AbortController()
        const timer = setTimeout(
            () => {
                more.current?.abort()
                asked.current = query.trim()
                setAnswer((last) => ({ ...last, loading: 'first', failed: null }))
                run(query.trim(), controller.signal).then(
                    (page) => {
                        if (!controller.signal.aborted) setAnswer((last) => withPage(last, pageOf(page), 'first', itemKey))
                    },
                    (reason: unknown) => {
                        if (controller.signal.aborted) return
                        setAnswer((last) => ({ ...last, loading: null, failed: { at: 'first', reason: said(reason) } }))
                    },
                )
            },
            attempt === 0 ? debounce : 0,
        )
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the key is read as a page lands; a new key function must not search again
    }, [open, query, short, debounce, attempt, held])

    const loadMore = () => {
        const now = answerRef.current
        const run = loadRef.current
        if (!wantsMore(now) || now.next === undefined || run === undefined) return
        const controller = new AbortController()
        more.current?.abort()
        more.current = controller
        const cursor = now.next
        setAnswer((last) => ({ ...last, loading: 'more', failed: null }))
        run(asked.current, controller.signal, cursor).then(
            (page) => {
                if (!controller.signal.aborted) setAnswer((last) => withPage(last, pageOf(page), 'more', itemKey))
            },
            (reason: unknown) => {
                if (controller.signal.aborted) return
                setAnswer((last) => ({ ...last, loading: null, failed: { at: 'more', reason: said(reason) } }))
            },
        )
    }

    // A page too short to scroll asks for the next at once, so a long list is never stuck at its first page.
    useEffect(() => {
        const list = listRef.current
        if (open && list !== null && wantsMore(answer) && nearEnd(list)) loadMore()
    })

    const known: AsyncAnswer<T> =
        local === undefined
            ? answer
            : {
                  ...NO_ANSWER,
                  answered: true,
                  items:
                      matches === undefined
                          ? filterLocal(local, query, itemLabel, itemDetail)
                          : local.filter((item) => matches(item, query.trim())),
              }
    const options = short || !known.answered ? [] : known.items
    const offered =
        onCreate !== undefined && !short && known.answered && known.loading !== 'first' && offersCreate(query, options, itemLabel)
    const items: (T | Creation)[] = offered ? [...options, new Creation(query.trim())] : [...options]
    const keyOf = (item: T | Creation) => (item instanceof Creation ? `create:${item.text}` : itemKey(item))
    const labelOf = (item: T | Creation) => (item instanceof Creation ? item.text : itemLabel(item))

    /** Makes the typed option through the app and hands it on, or says it could not. */
    const create = (text: string, then: (made: T) => void) => {
        if (onCreate === undefined) return
        setCreating('busy')
        Promise.resolve()
            .then(() => onCreate(text))
            .then(
                (made) => {
                    setCreating(null)
                    setQuery('')
                    then(made)
                },
                () => setCreating('failed'),
            )
    }

    const retry = () => {
        if (answer.failed?.at === 'more') {
            setAnswer((last) => ({ ...last, failed: null }))
            loadMore()
        } else setAttempt((count) => count + 1)
    }

    const list = (
        <Combobox.List
            ref={listRef}
            onScroll={(event: UIEvent<HTMLDivElement>) => {
                if (nearEnd(event.currentTarget)) loadMore()
            }}
            className="max-h-80 overflow-y-auto overscroll-contain p-1 empty:hidden"
        >
            {(item: T | Creation) => (
                <Combobox.Item
                    key={keyOf(item)}
                    value={item}
                    className="group/option relative flex min-h-(--density-control) w-full cursor-default items-center gap-2 rounded-md py-0.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground pointer-coarse:min-h-finger"
                >
                    {item instanceof Creation ? (
                        <>
                            <Plus
                                className="size-4 shrink-0 text-muted-foreground group-data-highlighted/option:text-accent-foreground"
                                aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">{words.create(item.text)}</span>
                        </>
                    ) : (
                        <>
                            {renderItem !== undefined ? (
                                <span className="min-w-0 flex-1">{renderItem(item)}</span>
                            ) : (
                                <>
                                    {itemMark !== undefined && <Mark>{itemMark(item)}</Mark>}
                                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                                        <span className={cn('min-w-0 truncate', mono && 'font-mono')}>{itemLabel(item)}</span>
                                        {itemDetail !== undefined && (
                                            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground group-data-highlighted/option:text-accent-foreground">
                                                {itemDetail(item)}
                                            </span>
                                        )}
                                    </span>
                                    {itemMeta !== undefined && <Meta mono={monoMeta}>{itemMeta(item)}</Meta>}
                                </>
                            )}
                            <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                                <Check className="size-4" aria-hidden />
                            </Combobox.ItemIndicator>
                        </>
                    )}
                </Combobox.Item>
            )}
        </Combobox.List>
    )
    // The wait for a query's options shows once it has run `wait-shown`, timed from the first moment
    // without an answer across keys typed meanwhile, so an answer that comes sooner draws no wait.
    const slow = useBusyRelease(open && waitsForFirst(known, short), WAIT_SHOWN)
    const line = (
        <Note
            note={noteOf(known, { short, empty: items.length === 0, creating, slow })}
            minQuery={minQuery}
            words={words}
            onRetry={retry}
        />
    )
    // The line under an empty list is the combobox's own `Empty`, so Escape there closes the list
    // and stops; without it Base UI lets the key on to a dialog around the field, which then closes.
    const note = (
        <>
            <Combobox.Empty className="empty:hidden">{line}</Combobox.Empty>
            <Combobox.Status className="empty:hidden">{items.length > 0 && line}</Combobox.Status>
        </>
    )
    // As wide as its longest row, never narrower than the field nor wider than the window.
    const popup =
        'flex max-h-(--available-height) w-max max-w-[calc(100vw-2rem)] min-w-[max(var(--anchor-width),--spacing(72))] origin-(--transform-origin) flex-col overflow-hidden rounded-surface border border-border-strong bg-popover text-popover-foreground shadow-pop'
    const locked = disabled || readOnly
    const spinning = (slow && known.loading === 'first') || creating === 'busy'

    const shared = {
        items,
        filter: null,
        autoHighlight: true,
        inputValue: query,
        onInputValueChange: (next: string) => {
            setQuery(next)
            setAttempt(0)
            setCreating(null)
        },
        open,
        disabled,
        readOnly,
        itemToStringLabel: (item: unknown) => labelOf(item as T | Creation),
        isItemEqualToValue: (item: unknown, other: unknown) => keyOf(item as T | Creation) === keyOf(other as T | Creation),
    }

    if (props.multiple === true) {
        const chosen = props.value
        const onChange = props.onValueChange
        return (
            <Combobox.Root
                {...shared}
                multiple
                openOnInputClick
                value={[...chosen]}
                onValueChange={(next, details) => {
                    // Escape in a shut field would drop every chosen value at once; each chip's remove button and Backspace take them one by one.
                    if (details.reason === 'escape-key') return details.cancel()
                    const picked = next as (T | Creation)[]
                    const made = picked.find((item): item is Creation => item instanceof Creation)
                    const kept = picked.filter((item): item is T => !(item instanceof Creation))
                    if (made === undefined) return onChange(kept)
                    create(made.text, (option) => onChange([...kept, option]))
                }}
                onOpenChange={(next, details) => {
                    // Picking keeps the list open, so several values are picked in a row.
                    if (!next && details.reason === 'item-press') return details.cancel()
                    setOpen(next)
                }}
            >
                <Combobox.InputGroup
                    ref={anchorRef}
                    aria-invalid={invalid || undefined}
                    className={cn(
                        'flex min-h-(--density-control) w-full min-w-0 flex-wrap items-center gap-1 rounded-control border border-input bg-field py-0.5 pr-1 pl-1 text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring max-md:min-h-finger',
                        invalid && ISSUE_WITHIN_EDGE.critical,
                        disabled && 'cursor-not-allowed bg-input/50 opacity-disabled',
                        className,
                    )}
                >
                    <Combobox.Chips className="contents">
                        {chosen.map((item) => (
                            <Combobox.Chip
                                key={itemKey(item)}
                                aria-label={itemLabel(item)}
                                className={cn(
                                    'flex h-(--density-control-xs) max-w-full min-w-0 items-center gap-0.5 rounded-sm bg-muted pl-2 outline-none focus-within:bg-accent data-highlighted:bg-accent',
                                    locked ? 'pr-2' : 'pr-0.5',
                                )}
                            >
                                {itemMark !== undefined && <Mark>{itemMark(item)}</Mark>}
                                <span className={cn('min-w-0 truncate', mono && 'font-mono text-xs')}>{itemLabel(item)}</span>
                                {!locked && (
                                    <Combobox.ChipRemove
                                        aria-label={words.remove(itemLabel(item))}
                                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-hover hover:text-foreground"
                                    >
                                        <X className="size-3.5" aria-hidden />
                                    </Combobox.ChipRemove>
                                )}
                            </Combobox.Chip>
                        ))}
                        {/* Inside the chips, so Backspace in the empty field takes the last of them. */}
                        <Combobox.Input
                            id={id}
                            ref={inputRef}
                            placeholder={chosen.length === 0 ? words.placeholder : undefined}
                            aria-label={chosen.length === 0 ? undefined : words.search}
                            className={cn(
                                'h-(--density-control-xs) flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm',
                                locked && chosen.length > 0 ? 'w-0 min-w-0' : 'min-w-24',
                            )}
                        />
                    </Combobox.Chips>
                    {spinning && <Spinner className="size-3.5 shrink-0 text-muted-foreground" />}
                    {!locked && (
                        <Combobox.Trigger
                            aria-label={words.search}
                            className="flex size-(--density-control-xs) shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-hover"
                        >
                            <ChevronsUpDown className="size-4" aria-hidden />
                        </Combobox.Trigger>
                    )}
                </Combobox.InputGroup>
                <Combobox.Portal>
                    <Combobox.Positioner anchor={anchorRef} side="bottom" align="start" sideOffset={6} className="isolate z-popover">
                        <Combobox.Popup initialFocus={false} className={popup}>
                            {list}
                            {note}
                        </Combobox.Popup>
                    </Combobox.Positioner>
                </Combobox.Portal>
            </Combobox.Root>
        )
    }

    const value = props.value
    const onChange = props.onValueChange
    return (
        <Combobox.Root
            {...shared}
            value={value}
            onValueChange={(next) => {
                const picked = next as T | Creation | null
                if (picked instanceof Creation) return create(picked.text, (option) => onChange(option))
                onChange(picked)
            }}
            onOpenChange={setOpen}
        >
            <Combobox.Trigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(
                    'flex h-(--density-control) w-full min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring max-md:min-h-finger',
                    INVALID_EDGE,
                    disabled && 'cursor-not-allowed bg-input/50 opacity-disabled',
                    className,
                )}
            >
                {value === null ? (
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{words.placeholder}</span>
                ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                        {itemMark !== undefined && <Mark>{itemMark(value)}</Mark>}
                        <span className={cn('min-w-0 shrink truncate', mono && 'font-mono')}>{itemLabel(value)}</span>
                        {itemDetail !== undefined && (
                            <span className="min-w-0 shrink-[2] truncate font-mono text-xs text-muted-foreground">{itemDetail(value)}</span>
                        )}
                        {metaInValue && itemMeta !== undefined && (
                            <Meta mono={monoMeta} className="ml-auto">
                                {itemMeta(value)}
                            </Meta>
                        )}
                    </span>
                )}
                {!locked && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
            </Combobox.Trigger>
            <Combobox.Portal>
                <Combobox.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-popover">
                    <Combobox.Popup initialFocus={inputRef} className={popup}>
                        <div className="flex items-center gap-2 border-b border-border px-2.5">
                            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <Combobox.Input
                                ref={inputRef}
                                placeholder={words.search}
                                aria-label={words.search}
                                className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground max-md:min-h-finger md:text-sm"
                            />
                            {spinning && <Spinner className="size-3.5 text-muted-foreground" />}
                        </div>
                        {list}
                        {note}
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    )
}

/** An option's mark before its label, an icon sized as the rest of the field's. */
function Mark({ children }: { children: ReactNode }) {
    return (
        <span className="flex shrink-0 items-center text-muted-foreground group-data-highlighted/option:text-accent-foreground [&_svg]:size-4">
            {children}
        </span>
    )
}

/** A quiet figure or code at a row's end. */
function Meta({ mono, className, children }: { mono: boolean; className?: string; children: ReactNode }) {
    return (
        <span
            className={cn(
                'shrink-0 text-xs text-muted-foreground group-data-highlighted/option:text-accent-foreground',
                mono ? 'font-mono' : 'tabular-nums',
                className,
            )}
        >
            {children}
        </span>
    )
}

/** The line under the list (`noteOf`): what to type, that a search runs, that nothing matched, that more load, or that it failed. */
function Note({
    note,
    minQuery,
    words,
    onRetry,
}: {
    note: ReturnType<typeof noteOf>
    minQuery: number
    words: AsyncSelectWords
    onRetry: () => void
}) {
    const line = 'flex min-h-9 items-center gap-2 px-3 py-2 text-sm text-muted-foreground'
    if (note === 'typeMore') return <p className={line}>{words.typeMore(minQuery)}</p>
    if (note === 'createFailed') return <p className={cn(line, 'border-t border-border text-critical')}>{words.createFailed}</p>
    if (note === 'failed')
        return (
            <div className={cn(line, 'border-t border-border')}>
                <span className="min-w-0 flex-1 text-critical">{words.failed}</span>
                <button
                    type="button"
                    onClick={onRetry}
                    className="flex shrink-0 items-center gap-1 rounded-sm text-xs text-foreground hover:underline focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <RotateCw className="size-3.5" aria-hidden />
                    {words.retry}
                </button>
            </div>
        )
    if (note === 'loadingMore')
        return (
            <p className={cn(line, 'border-t border-border')}>
                <Spinner className="size-3.5" />
                {words.loadingMore}
            </p>
        )
    // Until the wait is slow the Searching line keeps its room unseen, so the list does not jump when it shows.
    if (note === 'searching' || note === 'waiting') return <p className={cn(line, note === 'waiting' && 'invisible')}>{words.loading}</p>
    if (note === 'empty') return <p className={line}>{words.empty}</p>
    return null
}
