import { Apple, Car, Clock, Flag, Hand, Heart, Lightbulb, PawPrint, Smile, Volleyball, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'

import { useStored } from '../hooks/use-stored'
import { cn } from '../lib/cn'
import { useWords, type WordsPart } from '../lib/words'
import {
    EMOJI_GROUPS,
    inTone,
    loadEmojiData,
    searchEmoji,
    type EmojiData,
    type EmojiGroup,
    type EmojiItem,
    type SkinTone,
} from './emoji-data'
import { Pending } from './Loading'
import { SearchField } from './SearchField'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger, type PopoverContentProps } from './ui/popover'

export { loadEmojiData, searchEmoji, EMOJI_GROUPS, type EmojiData, type EmojiGroup, type EmojiItem, type SkinTone } from './emoji-data'

/** A place in the picker's grid: Recent, or a group of the full list. */
export type EmojiSection = 'recent' | EmojiGroup

/** The words an emoji picker says. */
export interface EmojiPickerWords {
    /** The search field's hint. */
    search: string
    /** The search field's name for assistive technology. */
    searchLabel: string
    /** Each group's heading and its tab's name. */
    groups: Record<EmojiSection, string>
    /** The heading over what a search found. */
    results: string
    /** Said when a search finds nothing. */
    empty: string
    loading: string
    failed: string
    retry: string
    /** The skin tone button's name. */
    skinTone: string
    /** The tones by name: the default, then light to dark. */
    tones: readonly [string, string, string, string, string, string]
    /** The name of the row of group tabs. */
    tabs: string
    /** The picker's own name, as a popover says it. */
    label: string
}

export const EMOJI_PICKER_WORDS: EmojiPickerWords = {
    search: 'Search',
    searchLabel: 'Search emoji',
    groups: {
        recent: 'Recent',
        smileys: 'Smileys and emotion',
        people: 'People and body',
        animals: 'Animals and nature',
        food: 'Food and drink',
        activities: 'Activities',
        travel: 'Travel and places',
        objects: 'Objects',
        symbols: 'Symbols',
        flags: 'Flags',
    },
    results: 'Search results',
    empty: 'No emoji found',
    loading: 'Loading emoji',
    failed: 'The emoji could not be loaded',
    retry: 'Try again',
    skinTone: 'Skin tone',
    tones: ['Default', 'Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'],
    tabs: 'Emoji groups',
    label: 'Emoji',
}

/** Where a catalog holds an emoji picker's words: `emojiPicker.groups.recent`, `emojiPicker.tones.0`. */
export const EMOJI_PICKER_PART: WordsPart<EmojiPickerWords> = { id: 'emojiPicker', words: EMOJI_PICKER_WORDS }

const ICONS: Record<EmojiSection, LucideIcon> = {
    recent: Clock,
    smileys: Smile,
    people: Hand,
    animals: PawPrint,
    food: Apple,
    activities: Volleyball,
    travel: Car,
    objects: Lightbulb,
    symbols: Heart,
    flags: Flag,
}

/** The emoji in a row of the grid. */
const COLUMNS = 8
/** How many emoji the first paint draws; the rest follow a frame later, so the picker opens at once. */
const FIRST_PAINT = 400
/** The raised hand the skin tone button shows, in each tone. */
const TONE_HANDS = ['✋', '✋\u{1F3FB}', '✋\u{1F3FC}', '✋\u{1F3FD}', '✋\u{1F3FE}', '✋\u{1F3FF}'] as const

const isEmojiList = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string')
const isTone = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5

/** Loads the data set once the picker is drawn. */
function useEmojiData(): { data: EmojiData | undefined; failed: boolean; retry: () => void } {
    const [data, setData] = useState<EmojiData>()
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)
    useEffect(() => {
        let live = true
        loadEmojiData().then(
            (loaded) => live && setData(loaded),
            () => live && setFailed(true),
        )
        return () => {
            live = false
        }
    }, [attempt])
    return {
        data,
        failed,
        retry: () => {
            setFailed(false)
            setAttempt((count) => count + 1)
        },
    }
}

interface Shown {
    id: EmojiSection | 'results'
    label: string
    cells: { emoji: string; name: string; index: number }[]
}

export interface EmojiPickerProps {
    /** Called with the emoji picked, in the chosen skin tone, and its English name. */
    onPick: (emoji: string, name: string) => void
    /** The emoji picked lately, newest first, when the app holds them; otherwise the picker keeps them per person under `storeKey`. */
    recent?: readonly string[]
    /** Hears the new list of recent emoji after each pick. */
    onRecentChange?: (recent: string[]) => void
    /** How many recent emoji are kept. */
    recentLimit?: number
    /** The skin tone, when the app holds it; otherwise the picker keeps it per person under `storeKey`. */
    skinTone?: SkinTone
    onSkinToneChange?: (tone: SkinTone) => void
    /** Offers the skin tone button beside the search. */
    skinTones?: boolean
    /** The key the recent emoji and the skin tone are kept under, through `useStored`: `<key>.recent` and `<key>.tone`. */
    storeKey?: string
    /** Focuses the search field when the picker is drawn. */
    autoFocus?: boolean
    /** Called by Escape, for a picker drawn inline. */
    onClose?: () => void
    /** The search the picker opens with. */
    defaultQuery?: string
    className?: string
    words?: Partial<EmojiPickerWords>
}

/**
 * The full list of emoji to pick one from: a search on top (names and keywords), a grid grouped
 * by kind under headings that stay at the top as it scrolls, Recent first, and a tab per group
 * along the bottom that scrolls to it and shows which group is in view. The data set loads the
 * first time a picker is drawn (`loadEmojiData` loads it ahead), a spinner meanwhile, and keeps
 * only the emoji the page's fonts draw.
 *
 * The arrow keys move through the grid, Enter or Space picks, Home and End go to the first and
 * the last; Down from the search enters the grid and Enter there picks the first found. Escape
 * clears the search, then calls `onClose`. The recent emoji and the skin tone are kept per person
 * through `useStored`, or held by the app through `recent` and `skinTone`.
 */
export function EmojiPicker({
    onPick,
    recent: givenRecent,
    onRecentChange,
    recentLimit = 24,
    skinTone: givenTone,
    onSkinToneChange,
    skinTones = true,
    storeKey = 'emoji',
    autoFocus = true,
    onClose,
    defaultQuery = '',
    className,
    words: given,
}: EmojiPickerProps) {
    const own = useWords(EMOJI_PICKER_PART)
    const words = { ...own, ...given, groups: { ...own.groups, ...given?.groups } }
    const { data, failed, retry } = useEmojiData()
    const [storedRecent, setStoredRecent] = useStored<string[]>(`${storeKey}.recent`, [], { check: isEmojiList })
    const [storedTone, setStoredTone] = useStored<SkinTone>(`${storeKey}.tone`, 0, { check: isTone })
    const recent = givenRecent ?? storedRecent
    const tone = givenTone ?? storedTone
    const [query, setQuery] = useState(defaultQuery)
    const [full, setFull] = useState(false)
    const [focusAt, setFocusAt] = useState(0)
    const [inView, setInView] = useState<EmojiSection>()
    const [toneOpen, setToneOpen] = useState(false)
    const search = useRef<HTMLInputElement>(null)
    const grid = useRef<HTMLDivElement>(null)
    const toneButton = useRef<HTMLButtonElement>(null)
    const goTo = useRef<EmojiSection | null>(null)
    const searching = query.trim() !== ''

    useEffect(() => {
        if (autoFocus) search.current?.focus({ preventScroll: true })
    }, [autoFocus])

    useEffect(() => {
        if (data === undefined || full) return
        const frame = requestAnimationFrame(() => setFull(true))
        return () => cancelAnimationFrame(frame)
    }, [data, full])

    const shown = useMemo<Shown[]>(() => {
        if (data === undefined) return []
        let index = 0
        const cell = (emoji: string, name: string) => ({ emoji, name, index: index++ })
        if (searching)
            return [
                {
                    id: 'results',
                    label: words.results,
                    cells: searchEmoji(data.list, query).map((item) => cell(inTone(item, tone), item.name)),
                },
            ]
        const sections: Shown[] = []
        if (recent.length > 0)
            sections.push({
                id: 'recent',
                label: words.groups.recent,
                cells: recent.map((emoji) => cell(emoji, data.byEmoji.get(emoji)?.name ?? emoji)),
            })
        const byGroup = new Map<EmojiGroup, EmojiItem[]>(EMOJI_GROUPS.map((group) => [group, []]))
        for (const item of data.list) byGroup.get(item.group)?.push(item)
        for (const group of EMOJI_GROUPS)
            sections.push({
                id: group,
                label: words.groups[group],
                cells: (byGroup.get(group) ?? []).map((item) => cell(inTone(item, tone), item.name)),
            })
        return sections
        // The words are read fresh each render; the sections change with the data, the search, the recent emoji and the tone.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, searching, query, recent, tone, words.results, words.groups])

    const cells = useMemo(() => shown.flatMap((section) => section.cells), [shown])
    // The grid's rows across every section, each a list of indexes, for Up and Down.
    const rows = useMemo(
        () =>
            shown.flatMap((section) =>
                Array.from({ length: Math.ceil(section.cells.length / COLUMNS) }, (_, row) =>
                    section.cells.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((cell) => cell.index),
                ),
            ),
        [shown],
    )
    const drawnUpTo = full ? Infinity : FIRST_PAINT
    const focused = Math.min(focusAt, Math.max(cells.length - 1, 0))

    useEffect(() => setFocusAt(0), [query])

    const sectionsBox = () => grid.current?.querySelectorAll<HTMLElement>('[data-section]') ?? []

    const updateInView = () => {
        const box = grid.current
        if (box === null || searching) return setInView(undefined)
        let current: EmojiSection | undefined
        for (const section of sectionsBox()) if (section.offsetTop <= box.scrollTop + 4) current = section.dataset.section as EmojiSection
        setInView(current ?? (shown[0]?.id as EmojiSection | undefined))
    }

    useLayoutEffect(() => {
        const target = goTo.current
        if (target === null || !full) return
        goTo.current = null
        const section = [...sectionsBox()].find((element) => element.dataset.section === target)
        if (grid.current !== null && section !== undefined) grid.current.scrollTop = section.offsetTop
        updateInView()
    })

    useLayoutEffect(updateInView, [shown, searching])

    const pick = (emoji: string, name: string) => {
        onPick(emoji, name)
        const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, recentLimit)
        if (givenRecent === undefined) setStoredRecent(next)
        onRecentChange?.(next)
    }

    const setTone = (next: SkinTone) => {
        if (givenTone === undefined) setStoredTone(next)
        onSkinToneChange?.(next)
        setToneOpen(false)
        requestAnimationFrame(() => toneButton.current?.focus())
    }

    const moveTo = (index: number) => {
        const next = Math.max(0, Math.min(cells.length - 1, index))
        setFocusAt(next)
        grid.current?.querySelector<HTMLElement>(`[data-index="${String(next)}"]`)?.focus()
    }

    const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
        if (cells.length === 0) return
        const row = rows.findIndex((indexes) => indexes.includes(focused))
        const column = rows[row]?.indexOf(focused) ?? 0
        const inRow = (to: number) => {
            const target = rows[to]
            if (target === undefined) return focused
            return target[Math.min(column, target.length - 1)]
        }
        const moves: Record<string, () => number> = {
            ArrowLeft: () => focused - 1,
            ArrowRight: () => focused + 1,
            ArrowUp: () => inRow(row - 1),
            ArrowDown: () => inRow(row + 1),
            Home: () => 0,
            End: () => cells.length - 1,
        }
        const move = moves[event.key]
        if (move === undefined) return
        event.preventDefault()
        if (!full) setFull(true)
        if (event.key === 'ArrowUp' && row === 0) return search.current?.focus()
        moveTo(move())
    }

    const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && cells.length > 0) {
            event.preventDefault()
            moveTo(focused)
        } else if (event.key === 'Enter' && searching && cells.length > 0) {
            event.preventDefault()
            pick(cells[0].emoji, cells[0].name)
        } else if (event.key === 'Escape' && query !== '') {
            // The field clears itself; a popover around the picker stays open.
            event.stopPropagation()
        }
    }

    const showGroup = (group: EmojiSection) => {
        setQuery('')
        goTo.current = group
        if (!full) setFull(true)
        setInView(group)
    }

    const tabs: EmojiSection[] = [...(recent.length > 0 ? (['recent'] as const) : []), ...EMOJI_GROUPS]
    const currentTab = searching ? undefined : (inView ?? tabs[0])

    const onTabsKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
        const at = buttons.indexOf(event.target as HTMLButtonElement)
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (step === 0 || at < 0) return
        event.preventDefault()
        // Like every list of choices, the tabs stop at the first and the last.
        buttons[Math.min(Math.max(at + step, 0), buttons.length - 1)]?.focus()
    }

    return (
        <div
            data-slot="emoji-picker"
            className={cn(
                'flex h-96 w-80 max-w-full min-w-0 flex-col overflow-hidden rounded-[inherit] bg-popover text-sm text-popover-foreground',
                className,
            )}
            onKeyDown={(event) => {
                if (event.key !== 'Escape' || onClose === undefined || event.defaultPrevented) return
                event.preventDefault()
                onClose()
            }}
        >
            <div className="flex shrink-0 items-center gap-1.5 p-2 pb-1.5">
                {toneOpen ? (
                    <div
                        role="radiogroup"
                        aria-label={words.skinTone}
                        className="flex h-(--density-control) flex-1 items-center justify-between"
                    >
                        {TONE_HANDS.map((hand, index) => (
                            <button
                                key={hand}
                                type="button"
                                role="radio"
                                aria-checked={tone === index}
                                aria-label={words.tones[index]}
                                title={words.tones[index]}
                                autoFocus={tone === index}
                                onClick={() => setTone(index as SkinTone)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        event.stopPropagation()
                                        setToneOpen(false)
                                        requestAnimationFrame(() => toneButton.current?.focus())
                                    }
                                }}
                                className={cn(
                                    'flex size-(--density-control) items-center justify-center rounded-md font-emoji text-emoji outline-none hover:bg-hover focus-visible:ring-focus focus-visible:ring-ring/50',
                                    tone === index && 'bg-muted',
                                )}
                            >
                                {hand}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <SearchField
                            value={query}
                            onChange={setQuery}
                            placeholder={words.search}
                            label={words.searchLabel}
                            shortcut={false}
                            className="flex-1"
                            inputRef={search}
                            inputProps={{ onKeyDown: onSearchKey }}
                        />
                        {skinTones && (
                            <button
                                ref={toneButton}
                                type="button"
                                aria-label={words.skinTone}
                                title={words.skinTone}
                                aria-expanded={false}
                                onClick={() => setToneOpen(true)}
                                className="flex size-(--density-control) shrink-0 items-center justify-center rounded-md font-emoji text-emoji outline-none hover:bg-hover focus-visible:ring-focus focus-visible:ring-ring/50 max-md:size-finger"
                            >
                                {TONE_HANDS[tone]}
                            </button>
                        )}
                    </>
                )}
            </div>
            <div
                ref={grid}
                onScroll={updateInView}
                onKeyDown={onGridKey}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
            >
                {failed ? (
                    <div
                        role="alert"
                        className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground"
                    >
                        {words.failed}
                        <Button variant="outline" size="sm" onClick={retry}>
                            {words.retry}
                        </Button>
                    </div>
                ) : data === undefined ? (
                    <Pending label={words.loading} />
                ) : cells.length === 0 ? (
                    <p role="status" className="flex h-full items-center justify-center p-4 text-muted-foreground">
                        {words.empty}
                    </p>
                ) : (
                    shown.map((section) =>
                        section.cells.length === 0 || section.cells[0].index >= drawnUpTo ? null : (
                            <section key={section.id} data-section={section.id} aria-label={section.label}>
                                <h3 className="sticky top-0 z-10 bg-popover px-1 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                                    {section.label}
                                </h3>
                                <div className="grid grid-cols-8">
                                    {section.cells.map((cell) => (
                                        <button
                                            key={`${section.id}-${cell.emoji}`}
                                            type="button"
                                            data-index={cell.index}
                                            tabIndex={cell.index === focused ? 0 : -1}
                                            aria-label={cell.name}
                                            title={cell.name}
                                            onClick={() => pick(cell.emoji, cell.name)}
                                            onFocus={() => setFocusAt(cell.index)}
                                            className="flex aspect-square min-w-0 scroll-mt-8 items-center justify-center rounded-md font-emoji text-emoji outline-none select-none hover:bg-hover focus-visible:bg-hover focus-visible:ring-focus focus-visible:ring-ring/50"
                                        >
                                            {cell.emoji}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ),
                    )
                )}
            </div>
            <div
                role="toolbar"
                aria-label={words.tabs}
                onKeyDown={onTabsKey}
                className="flex shrink-0 items-center justify-between gap-0.5 border-t border-border px-1.5 py-1"
            >
                {tabs.map((tab) => {
                    const Icon = ICONS[tab]
                    const current = tab === currentTab
                    return (
                        <button
                            key={tab}
                            type="button"
                            aria-label={words.groups[tab]}
                            title={words.groups[tab]}
                            aria-current={current ? 'true' : undefined}
                            tabIndex={current || (currentTab === undefined && tab === tabs[0]) ? 0 : -1}
                            disabled={data === undefined}
                            onClick={() => showGroup(tab)}
                            className={cn(
                                'relative flex size-7 min-w-0 shrink items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-focus focus-visible:ring-ring/50 disabled:opacity-disabled [&_svg]:size-4',
                                current &&
                                    'text-primary-ink after:absolute after:inset-x-1.5 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary',
                            )}
                        >
                            <Icon aria-hidden />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export interface EmojiPickerPopoverProps extends Omit<EmojiPickerProps, 'onClose' | 'className' | 'autoFocus'> {
    /** The button that opens the picker; leave it out to open the picker at `anchor` from outside. */
    trigger?: ReactElement
    /** What the picker opens beside, when it is not the trigger. */
    anchor?: PopoverContentProps['anchor']
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    side?: PopoverContentProps['side']
    align?: PopoverContentProps['align']
    /** How far the picker stands from what it opens beside. */
    sideOffset?: PopoverContentProps['sideOffset']
    /** Closes the picker once an emoji is picked; off to pick several in a row. */
    closeOnPick?: boolean
    className?: string
}

/**
 * The emoji picker in a popover, opened by `trigger` or held open from outside at `anchor`. It
 * loads the data set as the pointer reaches the trigger or the trigger is focused, closes once an
 * emoji is picked (unless `closeOnPick` is off) and on Escape, and hands focus back to the trigger.
 */
export function EmojiPickerPopover({
    trigger,
    anchor,
    open,
    defaultOpen = false,
    onOpenChange,
    side = 'top',
    align = 'start',
    sideOffset,
    closeOnPick = true,
    onPick,
    className,
    ...picker
}: EmojiPickerPopoverProps) {
    const [own, setOwn] = useState(defaultOpen)
    const shown = open ?? own
    const setOpen = (next: boolean) => {
        if (open === undefined) setOwn(next)
        onOpenChange?.(next)
    }
    const preload = () => void loadEmojiData().catch(() => undefined)
    const label = useWords(EMOJI_PICKER_PART).label
    return (
        <Popover open={shown} onOpenChange={setOpen}>
            {trigger !== undefined && <PopoverTrigger render={trigger} onPointerEnter={preload} onFocus={preload} />}
            <PopoverContent
                anchor={anchor}
                side={side}
                align={align}
                sideOffset={sideOffset}
                initialFocus={false}
                collisionPadding={8}
                aria-label={picker.words?.label ?? label}
                className={cn('w-auto max-w-[calc(100vw-1rem)] gap-0 p-0', className)}
            >
                <EmojiPicker
                    {...picker}
                    onPick={(emoji, name) => {
                        onPick(emoji, name)
                        if (closeOnPick) setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
