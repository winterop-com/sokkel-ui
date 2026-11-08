import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'

import { cn } from '../lib/cn'
import { handleOf, insertMention, matchPeople, mentionQuery, mentionsIn, type MentionPerson } from '../lib/mentions'
import { PersonAvatar } from './PersonAvatar'
import { Spinner } from './ui/spinner'

export type { MentionPerson } from '../lib/mentions'

/** The app's search for people to mention, run for each query typed after an `@`. */
export type MentionSearch = (query: string, context: { signal: AbortSignal }) => Promise<readonly MentionPerson[]>

/** How a composer suggests people as an `@` is typed. */
export interface ComposerMentions {
    /** The people to suggest: a list matched by name and handle as it is typed, or the app's own search. */
    people: readonly MentionPerson[] | MentionSearch
    /** Hears the ids of the people the text mentions, each once, as they change. */
    onChange?: (ids: string[]) => void
    /** How many suggestions show at once; 8 by default. */
    limit?: number
    /** Opens the suggestions for a mention the text ends with on the first render, for a still view of them. */
    defaultOpen?: boolean
}

/** The words the suggestions say. */
export interface MentionWords {
    /** The list's name for a screen reader. */
    label: string
    /** Said when no one matches what is typed. */
    empty: string
    /** Said while the app's search answers. */
    searching: string
}

export const MENTION_WORDS: MentionWords = {
    label: 'People to mention',
    empty: 'No one by that name',
    searching: 'Searching',
}

/** The width of the suggestions, in pixels; `w-64` below. */
const LIST_WIDTH = 256
/** The most the suggestions grow to, in pixels; `max-h-64` below. */
const LIST_HEIGHT = 256
/** The room between the caret's line and the suggestions, in pixels. */
const OFFSET = 4

/** What a mirror of a text area copies to lay its text out the same way. */
const MIRRORED = [
    'boxSizing',
    'width',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'fontStretch',
    'fontVariant',
    'fontSizeAdjust',
    'lineHeight',
    'letterSpacing',
    'wordSpacing',
    'textIndent',
    'textTransform',
    'tabSize',
] as const

/** Where a place in a text area's text is drawn, from the area's top left corner, and its line's height. */
function caretPoint(area: HTMLTextAreaElement, index: number): { left: number; top: number; height: number } {
    const style = getComputedStyle(area)
    const mirror = document.createElement('div')
    for (const key of MIRRORED) mirror.style[key] = style[key]
    Object.assign(mirror.style, {
        position: 'absolute',
        top: '0',
        left: '-9999px',
        visibility: 'hidden',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
    })
    mirror.textContent = area.value.slice(0, index)
    const mark = document.createElement('span')
    mark.textContent = area.value.slice(index) || '.'
    mirror.append(mark)
    document.body.append(mirror)
    const line = Number.parseFloat(style.lineHeight)
    const point = {
        left: mark.offsetLeft - area.scrollLeft,
        top: mark.offsetTop - area.scrollTop,
        height: Number.isFinite(line) ? line : mark.offsetHeight,
    }
    mirror.remove()
    return point
}

/** What `useMentions` gives a composer: handlers for its text area and the suggestions to draw. */
export interface Mentions {
    /** Call from the text area's change, after the composer's own. */
    onInput: (text: string, caret: number) => void
    /** Call from the text area's selection change. */
    onSelect: (text: string, caret: number) => void
    /** Call first in the text area's key handler; true when the key was the suggestions'. */
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean
    /** Puts an `@` in at the caret and opens the suggestions, as a mention button does. */
    start: () => void
    /** The text area's attributes that tie it to the suggestions. */
    areaProps: {
        'aria-autocomplete': 'list' | undefined
        'aria-controls': string | undefined
        'aria-activedescendant': string | undefined
    }
    /** The suggestions, placed at the caret inside the composer's root. */
    list: MentionListProps | null
}

/**
 * Suggests people at the caret as an `@` is typed in a composer's text area: from the app's list,
 * matched by name and handle, or from its search, the last answer winning. The arrow keys move
 * through them, Enter or Tab puts the one chosen in as `@handle` with a space after it, and Escape
 * closes them until the next `@`.
 */
export function useMentions({
    options,
    value,
    onChange,
    area,
    root,
    words,
}: {
    options: ComposerMentions | undefined
    value: string
    onChange: (value: string) => void
    area: RefObject<HTMLTextAreaElement | null>
    root: RefObject<HTMLElement | null>
    words: MentionWords
}): Mentions {
    const id = useId()
    const [query, setQuery] = useState<{ start: number; query: string } | null>(null)
    const [active, setActive] = useState(0)
    const [answer, setAnswer] = useState<{ query: string; people: readonly MentionPerson[] } | null>(null)
    const [place, setPlace] = useState<CSSProperties>({})
    const dismissed = useRef<number | null>(null)
    const known = useRef(new Map<string, MentionPerson>())
    const said = useRef('')
    const people = options?.people
    const limit = options?.limit ?? 8
    const search = typeof people === 'function' ? people : undefined

    const update = (text: string, caret: number) => {
        if (options === undefined) return
        const next = mentionQuery(text, caret)
        if (next === null || next.start !== dismissed.current) dismissed.current = null
        const shown = next !== null && dismissed.current === null ? next : null
        setQuery((current) => (current?.start === shown?.start && current?.query === shown?.query ? current : shown))
        if (shown?.query !== query?.query) setActive(0)
    }

    // A still view opens on the mention the text ends with.
    const opened = useRef(false)
    useLayoutEffect(() => {
        if (opened.current || options?.defaultOpen !== true) return
        opened.current = true
        update(value, value.length)
    })

    // The app's search answers each query; an answer to an older one is dropped.
    useEffect(() => {
        if (search === undefined || query === null) return
        const controller = new AbortController()
        search(query.query, { signal: controller.signal }).then(
            (found) => {
                if (!controller.signal.aborted) setAnswer({ query: query.query, people: found })
            },
            () => {
                if (!controller.signal.aborted) setAnswer({ query: query.query, people: [] })
            },
        )
        return () => controller.abort()
    }, [search, query])

    const found: readonly MentionPerson[] =
        query === null
            ? []
            : search === undefined
              ? matchPeople(people === undefined || typeof people === 'function' ? [] : people, query.query, limit)
              : (answer?.people ?? []).slice(0, limit)
    const searching = search !== undefined && query !== null && answer?.query !== query.query

    // The ids the text mentions, said whenever they change.
    const listed = people === undefined || typeof people === 'function' ? undefined : people
    const hear = options?.onChange
    useEffect(() => {
        if (hear === undefined) return
        const ids = mentionsIn(value, [...(listed ?? []), ...known.current.values()])
        const key = ids.join('\n')
        if (key === said.current) return
        said.current = key
        hear(ids)
    }, [value, listed, hear])

    // The suggestions stand above the caret's line, or under it where the window has no room above.
    useLayoutEffect(() => {
        const element = area.current
        const box = root.current
        if (query === null || element === null || box === null) return
        const caret = caretPoint(element, query.start)
        const outer = box.getBoundingClientRect()
        const inner = element.getBoundingClientRect()
        const top = inner.top - outer.top + caret.top
        const width = Math.min(LIST_WIDTH, outer.width - OFFSET * 2)
        const left = Math.min(Math.max(OFFSET, inner.left - outer.left + caret.left - OFFSET * 2), outer.width - width - OFFSET)
        const above = inner.top + caret.top > LIST_HEIGHT + OFFSET * 4
        setPlace(above ? { left, width, bottom: outer.height - top + OFFSET } : { left, width, top: top + caret.height + OFFSET })
    }, [query, area, root])

    const pick = (person: MentionPerson) => {
        const element = area.current
        if (query === null || element === null) return
        known.current.set(person.id, person)
        const next = insertMention(value, query.start, element.selectionEnd, handleOf(person))
        onChange(next.value)
        setQuery(null)
        requestAnimationFrame(() => {
            element.focus()
            element.setSelectionRange(next.caret, next.caret)
        })
    }

    const open = query !== null
    const listId = `${id}-mentions`
    const activeId = open && found.length > 0 ? `${listId}-${String(Math.min(active, found.length - 1))}` : undefined
    return {
        onInput: update,
        onSelect: update,
        onKeyDown: (event) => {
            if (!open || event.nativeEvent.isComposing) return false
            if (event.key === 'Escape') {
                dismissed.current = query.start
                setQuery(null)
            } else if (found.length === 0) {
                return false
            } else if (event.key === 'ArrowDown') {
                setActive((current) => (current + 1) % found.length)
            } else if (event.key === 'ArrowUp') {
                setActive((current) => (current - 1 + found.length) % found.length)
            } else if (event.key === 'Enter' || event.key === 'Tab') {
                pick(found[Math.min(active, found.length - 1)])
            } else {
                return false
            }
            event.preventDefault()
            event.stopPropagation()
            return true
        },
        start: () => {
            const element = area.current
            if (options === undefined || element === null) return
            const { selectionStart: from, selectionEnd: to } = element
            const before = value.slice(0, from)
            const lead = before === '' || /\s$/.test(before) ? '' : ' '
            const next = `${before}${lead}@${value.slice(to)}`
            const caret = from + lead.length + 1
            onChange(next)
            dismissed.current = null
            update(next, caret)
            requestAnimationFrame(() => {
                element.focus()
                element.setSelectionRange(caret, caret)
            })
        },
        areaProps: {
            'aria-autocomplete': options === undefined ? undefined : 'list',
            'aria-controls': open ? listId : undefined,
            'aria-activedescendant': activeId,
        },
        list: open
            ? {
                  id: listId,
                  people: found,
                  active: Math.min(active, Math.max(0, found.length - 1)),
                  searching,
                  style: place,
                  words,
                  onActiveChange: setActive,
                  onPick: pick,
              }
            : null,
    }
}

export interface MentionListProps {
    id: string
    people: readonly MentionPerson[]
    active: number
    searching: boolean
    style: CSSProperties
    words: MentionWords
    onActiveChange: (index: number) => void
    onPick: (person: MentionPerson) => void
}

/**
 * The people a mention suggests, at the caret: each with their picture or initials, their name
 * and their handle. A press picks one without taking the focus from the text.
 */
export function MentionList({ id, people, active, searching, style, words, onActiveChange, onPick }: MentionListProps) {
    return (
        <div
            id={id}
            role="listbox"
            aria-label={words.label}
            data-slot="mention-list"
            style={style}
            onPointerDown={(event) => event.preventDefault()}
            className="absolute z-30 max-h-64 overflow-y-auto rounded-surface bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
            {people.length === 0 ? (
                <div role="status" className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    {searching && <Spinner aria-hidden role={undefined} aria-label={undefined} />}
                    {searching ? words.searching : words.empty}
                </div>
            ) : (
                people.map((person, index) => (
                    <div
                        key={person.id}
                        id={`${id}-${String(index)}`}
                        role="option"
                        aria-selected={index === active}
                        data-active={index === active || undefined}
                        onPointerMove={() => onActiveChange(index)}
                        onClick={() => onPick(person)}
                        className={cn(
                            'flex min-w-0 cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm select-none',
                            index === active && 'bg-accent text-accent-foreground',
                        )}
                    >
                        <PersonAvatar name={person.name} image={person.image} size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{person.name}</span>
                            {person.detail !== undefined && <span className="truncate text-xs text-muted-foreground">{person.detail}</span>}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">@{handleOf(person)}</span>
                    </div>
                ))
            )}
        </div>
    )
}
