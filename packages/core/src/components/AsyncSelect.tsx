import { Combobox } from '@base-ui/react'
import { Check, ChevronsUpDown, RotateCw, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
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
}

const WORDS: AsyncSelectWords = {
    placeholder: 'Choose',
    search: 'Search',
    loading: 'Searching',
    empty: 'Nothing matches.',
    typeMore: (characters) => `Type ${String(characters)} or more characters to search.`,
    failed: 'The search did not answer.',
    retry: 'Try again',
}

type Answer<T> =
    | { state: 'idle' }
    | { state: 'loading'; items: T[] }
    | { state: 'done'; items: T[] }
    | { state: 'failed'; reason: string; items: T[] }

/**
 * A select whose options come from a search: it reads like a select, and its popover holds a
 * search box whose text is sent to `load`, after a pause in typing. Older answers are dropped,
 * a request still in flight is aborted, and the last options stay listed while the next load
 * runs. A failed load says so with a way to try again.
 */
export function AsyncSelect<T>({
    id,
    value,
    onChange,
    load,
    itemKey,
    itemLabel,
    renderItem,
    debounce = 250,
    minQuery = 0,
    defaultOpen = false,
    defaultQuery = '',
    invalid = false,
    className,
    words: given,
}: {
    id?: string
    value: T | null
    onChange: (value: T | null) => void
    /** Answers a query with the options for it; the signal aborts when a newer query replaces it. */
    load: (query: string, signal: AbortSignal) => Promise<T[]>
    itemKey: (item: T) => string
    itemLabel: (item: T) => string
    /** How an option is drawn in the list; its label alone otherwise. */
    renderItem?: (item: T) => ReactNode
    /** Milliseconds of quiet typing before a load. */
    debounce?: number
    /** Characters needed before anything is loaded. */
    minQuery?: number
    defaultOpen?: boolean
    defaultQuery?: string
    invalid?: boolean
    className?: string
    words?: Partial<AsyncSelectWords>
}) {
    const words = { ...WORDS, ...given }
    const [open, setOpen] = useState(defaultOpen)
    const [query, setQuery] = useState(defaultQuery)
    const [answer, setAnswer] = useState<Answer<T>>({ state: 'idle' })
    const [attempt, setAttempt] = useState(0)
    const loadRef = useRef(load)
    const inputRef = useRef<HTMLInputElement | null>(null)
    useEffect(() => {
        loadRef.current = load
    }, [load])

    const short = query.trim().length < minQuery

    useEffect(() => {
        if (!open || short) return
        const controller = new AbortController()
        const timer = setTimeout(
            () => {
                setAnswer((last) => ({ state: 'loading', items: 'items' in last ? last.items : [] }))
                loadRef.current(query.trim(), controller.signal).then(
                    (items) => {
                        if (!controller.signal.aborted) setAnswer({ state: 'done', items })
                    },
                    (reason: unknown) => {
                        if (controller.signal.aborted) return
                        setAnswer((last) => ({
                            state: 'failed',
                            reason: reason instanceof Error ? reason.message : String(reason),
                            items: 'items' in last ? last.items : [],
                        }))
                    },
                )
            },
            attempt === 0 ? debounce : 0,
        )
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [open, query, short, debounce, attempt])

    const items = short || answer.state === 'idle' ? [] : answer.items

    return (
        <Combobox.Root
            items={items}
            filter={null}
            autoHighlight
            value={value}
            onValueChange={(next) => onChange(next as T | null)}
            inputValue={query}
            onInputValueChange={(next) => {
                setQuery(next)
                setAttempt(0)
            }}
            open={open}
            onOpenChange={setOpen}
            itemToStringLabel={(item) => itemLabel(item as T)}
            isItemEqualToValue={(item, other) => itemKey(item as T) === itemKey(other as T)}
        >
            <Combobox.Trigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(
                    'flex h-8 w-full min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive',
                    className,
                )}
            >
                <span className={cn('min-w-0 flex-1 truncate', value === null && 'text-muted-foreground')}>
                    {value === null ? words.placeholder : itemLabel(value)}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Combobox.Trigger>
            <Combobox.Portal>
                <Combobox.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-50">
                    <Combobox.Popup
                        initialFocus={inputRef}
                        className="flex max-h-(--available-height) w-(--anchor-width) min-w-72 origin-(--transform-origin) flex-col overflow-hidden rounded-lg border border-border-strong bg-popover text-popover-foreground shadow-pop"
                    >
                        <div className="flex items-center gap-2 border-b border-border px-2.5">
                            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <Combobox.Input
                                ref={inputRef}
                                placeholder={words.search}
                                aria-label={words.search}
                                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            {answer.state === 'loading' && !short && <Spinner className="size-3.5 text-muted-foreground" />}
                        </div>
                        <Combobox.List className="max-h-80 overflow-y-auto p-1 empty:hidden">
                            {(item: T) => (
                                <Combobox.Item
                                    key={itemKey(item)}
                                    value={item}
                                    className="relative flex min-h-8 w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-hover"
                                >
                                    <span className="min-w-0 flex-1">{renderItem === undefined ? itemLabel(item) : renderItem(item)}</span>
                                    <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                                        <Check className="size-4" aria-hidden />
                                    </Combobox.ItemIndicator>
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                        <Combobox.Status className="empty:hidden">
                            <Note
                                answer={answer}
                                short={short}
                                empty={items.length === 0}
                                minQuery={minQuery}
                                words={words}
                                onRetry={() => setAttempt((count) => count + 1)}
                            />
                        </Combobox.Status>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    )
}

/** The line under the list: what to type, that a search runs, that nothing matched, or that it failed. */
function Note<T>({
    answer,
    short,
    empty,
    minQuery,
    words,
    onRetry,
}: {
    answer: Answer<T>
    short: boolean
    empty: boolean
    minQuery: number
    words: AsyncSelectWords
    onRetry: () => void
}) {
    const line = 'flex min-h-9 items-center gap-2 px-3 py-2 text-sm text-muted-foreground'
    if (short) return <p className={line}>{words.typeMore(minQuery)}</p>
    if (answer.state === 'failed')
        return (
            <div className={cn(line, 'border-t border-border')}>
                <span className="min-w-0 flex-1 text-critical">{words.failed}</span>
                <button
                    type="button"
                    onClick={onRetry}
                    className="flex shrink-0 items-center gap-1 rounded-sm text-xs text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <RotateCw className="size-3.5" aria-hidden />
                    {words.retry}
                </button>
            </div>
        )
    if (answer.state === 'loading' && empty) return <p className={line}>{words.loading}</p>
    if (answer.state === 'done' && empty) return <p className={line}>{words.empty}</p>
    return null
}
