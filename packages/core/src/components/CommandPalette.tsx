import { ArrowRight, SearchIcon, type LucideIcon } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useSearch } from '../hooks/use-search'
import { activeRow, filterCommands, mergeCommands, termScore } from '../lib/commands'
import { keyLabels } from '../lib/keys'
import { cn } from '../lib/utils'
import type { SearchGroup, SearchResult, SearchSource } from '../lib/search'
import { SearchResultBody } from './Search'
import { Button } from './ui/button'
import { Kbd, KbdGroup } from './ui/kbd'
import { Spinner } from './ui/spinner'

export { usePaletteShortcut } from '../hooks/use-palette-shortcut'
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from './ui/command'

/** One thing the palette can do: go somewhere, run an action, open a record. */
export interface PaletteCommand {
    id: string
    label: string
    icon?: LucideIcon
    /** A quiet fact after the label, in words: what the place holds, where it leads. */
    hint?: string
    /** An addressable code after the label, in the code face, such as a record's or a job's id. */
    code?: string
    /**
     * The keys that run it outside the palette, shown at the row's end, as `keyLabels` writes them;
     * `bindingKeys` from `lib/keys` gives them, `next` with them, from the binding that runs it.
     */
    keys?: readonly string[]
    /** The keys of a sequence's second press, drawn after `keys` with the word `sequence` between: G then D. */
    next?: readonly string[]
    /** More words it is found by, beyond its label; never drawn. */
    keywords?: readonly string[]
    /** A second line under the label, such as who made it or where it lives; it is found by these words too. */
    detail?: string
    /**
     * A picture at the row's start in the icon's place: an image's address, or a node that fills
     * the box, such as a drawn cover. With it or a `detail` the row is two lines tall.
     */
    artwork?: ReactNode
    /** Draws the artwork round, as a person's picture. */
    round?: boolean
    /** Lists the command dimmed and never runs it, so a list need not be built around it; words say why, in the hint's place. */
    disabled?: boolean | string
    /**
     * The foot's word for what choosing this row does (Open, Switch, Run), said beside Enter while
     * the row is chosen; its group's `verb`, then the palette's `open` word, when not given.
     */
    verb?: string
    /**
     * What the row is, said at its end (Page, Form, Receipt), so a group of mixed things tells them
     * apart; left out where its group's `kind` already says it.
     */
    kind?: string
    onSelect: () => void
}

/** Commands under a heading: Go to, Create, Recent. */
export interface PaletteGroup {
    title: string
    commands: readonly PaletteCommand[]
    /**
     * Where the group stands among the others: lower first, 0 when not given. At equal rank the
     * groups keep their order, and in a `Shell` a screen's groups (`useCommands`) come before the
     * app's own. Groups of one title are listed as one.
     */
    rank?: number
    /** The foot's word for every row of the group that names no `verb` of its own. */
    verb?: string
    /** What every row of the group is; a row of this `kind` does not say it again. */
    kind?: string
}

/**
 * The app's own search in the palette: what it finds for the query is listed under the commands,
 * grouped by kind as `Search` lists it, so one box finds both what to do and what there is.
 */
export interface PaletteSearch {
    search: SearchSource
    /** Opens a result the person chose; the palette closes first. */
    onOpen: (result: SearchResult, group: SearchGroup) => void
    /** Goes to the full results page for the query; the list ends in a row to it when given. The palette closes first. */
    onSeeAll?: (query: string) => void
    /** Characters needed before the search is asked. */
    minQuery?: number
    /** Milliseconds of quiet typing before the search is asked again. */
    debounce?: number
    words?: Partial<PaletteSearchWords>
}

/** The words the palette's search says. */
export interface PaletteSearchWords {
    searching: string
    /** Says the search failed, given the message the app's search threw or rejected with. */
    failed: (reason: string) => string
    /** The row that asks a failed search again. */
    retry: string
    /** The row that goes to the full results page for the query. */
    seeAll: (query: string) => string
}

/**
 * How the palette matches its commands to what is typed. `fuzzy` finds a command by the letters
 * typed in their order, best match first. `terms` wants every word typed in the command's label,
 * keywords, hint, code, second line or group title, and lists a label starting with what is typed
 * first, then a label holding it, then a label holding every word, then the rest; each group keeps
 * its best first. A function scores a command itself: 0 leaves it out, higher comes first.
 */
export type PaletteFilter = 'fuzzy' | 'terms' | ((command: PaletteCommand, query: string, group: string) => number)

/** The words the command palette says. */
export interface CommandPaletteWords {
    placeholder: string
    empty: string
    title: string
    /** The button that closes the palette on a touch screen, which has no Escape to press. */
    close: string
    /** The foot's word before the key that runs the chosen row, when neither the row nor its group names a `verb`. */
    open: string
    /** The foot's word before the keys that open and close the palette. */
    palette: string
    /** Between the two presses of a row's sequence, as G then D. */
    /** The word between the keys of a sequence; "then" when absent. */
    sequence?: string
}

const WORDS: CommandPaletteWords = {
    placeholder: 'Search or run a command',
    empty: 'No command matches.',
    title: 'Command palette',
    close: 'Close',
    open: 'Open',
    palette: 'Command palette',
    sequence: 'then',
}

/** The strip along the palette's foot: the app's mark and name at its start, the keys at its end. */
export interface PaletteFoot {
    /** The app's mark, drawn at the size of an icon. */
    mark?: ReactNode
    /** The app's name beside its mark. */
    name?: string
    /** The keys that open the palette, as `keyLabels` writes them; ⌘K or Ctrl K when not given. */
    keys?: readonly string[]
}

/** A group's title, inset as its rows are, from the palette's row tokens. */
const GROUP = '**:[[cmdk-group-heading]]:px-(--palette-row-inset-x)'

/** A row's room at its ends and over and under its text, from the palette's row tokens. */
const ROW = 'px-(--palette-row-inset-x) py-(--palette-row-inset-y)'

export interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly PaletteGroup[]
    /** The app's search, whose results are listed under the commands. */
    search?: PaletteSearch
    /** What the search holds each time the palette opens. */
    defaultQuery?: string
    /** How the commands are matched to what is typed; `fuzzy` when not given. */
    filter?: PaletteFilter
    /**
     * A strip at the palette's foot with the app's mark and name and the keys it answers: Enter to
     * open the chosen row and the keys that open the palette. A touch screen, which has no keys,
     * shows its Close button there instead.
     */
    foot?: PaletteFoot
    words?: Partial<CommandPaletteWords>
}

/**
 * The command palette: one search over everything an app can do, grouped, each row with its
 * icon, a hint in words or a code, and the keys that run it directly, a sequence's two presses with
 * the word `sequence` between them as the shortcuts dialog draws them. Choosing a row closes the
 * palette and runs it. A row with a `detail` or `artwork` is two lines tall, a picture or its icon
 * on a tile at its start and its hint or code at its end, as a record found by a search is. The
 * groups are listed by their `rank`, one group to a title. With `search` the app's own results for
 * the query follow the commands, each with its thumbnail, artwork or icon and the query's words
 * marked; an earlier query's results stay dimmed and passed over until the query's own come, a
 * failed search says so above a Retry row, and while the search waits or has failed the palette
 * never says that no command matches. On a touch screen, which has no Escape, a Close button stands at its foot. `filter`
 * chooses how the commands are matched: by their letters (`fuzzy`), by every word typed (`terms`),
 * or by the app's own score. `foot` adds a strip with the app's mark and the keys it answers, its
 * verb beside Enter following the chosen row (`verb` on a row or its group: Open, Switch, Run). A
 * row's `kind` (Page, Form, Receipt) ends it where its group's `kind` does not already say it. A
 * command that cannot run now is listed `disabled`, dimmed and passed over, with why in its hint.
 * The first row is active whenever the rows change and the active one is gone, the search's results
 * arriving on their own included, so Enter opens it without an arrow pressed first.
 */
export function CommandPalette({
    open,
    onOpenChange,
    groups,
    search,
    defaultQuery = '',
    filter = 'fuzzy',
    foot,
    words: given,
}: CommandPaletteProps) {
    const words = { ...WORDS, ...given }
    const merged = useMemo(() => mergeCommands(groups), [groups])
    const [query, setQuery] = useState(defaultQuery)
    // Each opening starts from `defaultQuery`, not from what was typed the last time it was open.
    const [shown, setShown] = useState(open)
    // The chosen row, held so the foot can say its verb; each opening starts at the first row.
    const [chosen, setChosen] = useState('')
    if (open !== shown) {
        setShown(open)
        if (open) {
            setQuery(defaultQuery)
            setChosen('')
        }
    }
    const score = filter === 'fuzzy' ? undefined : filter === 'terms' ? termScore : filter
    const listed = useMemo(() => (score === undefined ? merged : filterCommands(merged, query, score)), [merged, query, score])
    const answer = useSearch(search?.search, query, { enabled: open, minQuery: search?.minQuery, debounce: search?.debounce })
    const found = answer.groups.filter((group) => group.results.length > 0)
    // An earlier query's results stay while the next answer comes, dimmed and passed over.
    const stale = answer.state === 'loading'
    const said = search?.words
    const trimmed = query.trim()
    // The row to the full results page stays in sight under the scrolling rows.
    const seeAll = search?.onSeeAll !== undefined && trimmed !== ''
    const verbs = useMemo(() => {
        const byValue = new Map<string, string>()
        for (const group of merged)
            for (const command of group.commands) {
                const verb = command.verb ?? group.verb
                if (verb !== undefined) byValue.set(rowValue(command), verb)
            }
        return byValue
    }, [merged])
    const verb = verbs.get(chosen) ?? words.open
    // cmdk leaves rows it does not filter (the search's results) out of its own choosing, so a list of
    // results alone would have no active row for Enter: the first row drawn is chosen whenever the
    // chosen one is not drawn.
    const list = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
        const rows = Array.from(list.current?.querySelectorAll('[cmdk-item]:not([aria-disabled="true"])') ?? [], (row) =>
            row.getAttribute('data-value'),
        ).filter((value): value is string => value !== null)
        const next = activeRow(chosen, rows)
        if (next !== chosen) setChosen(next)
    })
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title={words.title} description={words.placeholder}>
            <Command shouldFilter={score === undefined} className="p-(--palette-inset)" value={chosen} onValueChange={setChosen}>
                <CommandInput placeholder={words.placeholder} value={query} onValueChange={setQuery} />
                <CommandList ref={list} className={cn('max-h-[min(24rem,60svh)]', seeAll ? 'scroll-pb-12' : 'scroll-fade-b pb-1.5')}>
                    {found.length === 0 && (answer.state === 'idle' || answer.state === 'done') && (
                        <CommandEmpty>{words.empty}</CommandEmpty>
                    )}
                    {listed.map((group, index) => (
                        <div key={group.title}>
                            {index > 0 && <CommandSeparator className="-mx-(--palette-inset)" />}
                            <CommandGroup heading={group.title} className={GROUP}>
                                {group.commands.map((command) => {
                                    const Icon = command.icon
                                    const hint = hintOf(command)
                                    const kind = command.kind === group.kind ? undefined : command.kind
                                    return (
                                        <CommandItem
                                            key={command.id}
                                            className={ROW}
                                            value={rowValue(command)}
                                            keywords={findBy(command)}
                                            disabled={Boolean(command.disabled)}
                                            onSelect={() => {
                                                onOpenChange(false)
                                                command.onSelect()
                                            }}
                                        >
                                            {twoLines(command) ? (
                                                <SearchResultBody result={asResult(command)} query="" />
                                            ) : (
                                                <>
                                                    {Icon !== undefined && <Icon className="text-muted-foreground" aria-hidden />}
                                                    <span className="truncate">{command.label}</span>
                                                    {hint !== undefined && (
                                                        <span className="truncate text-xs text-muted-foreground">{hint}</span>
                                                    )}
                                                    {command.code !== undefined && (
                                                        <span className="truncate font-mono text-xs text-muted-foreground">
                                                            {command.code}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {(kind !== undefined || command.keys !== undefined) && (
                                                <CommandShortcut className="flex shrink-0 items-center gap-2">
                                                    {kind !== undefined && <span className="text-faint">{kind}</span>}
                                                    {command.keys !== undefined && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Keys keys={command.keys} />
                                                            {command.next !== undefined && (
                                                                <>
                                                                    {words.sequence}
                                                                    <Keys keys={command.next} />
                                                                </>
                                                            )}
                                                        </span>
                                                    )}
                                                </CommandShortcut>
                                            )}
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </div>
                    ))}
                    {search !== undefined &&
                        found.map((group) => (
                            <div key={`search-${group.kind}`}>
                                <CommandGroup heading={group.title} forceMount className={GROUP}>
                                    {group.results.map((result) => (
                                        <CommandItem
                                            key={result.id}
                                            className={ROW}
                                            value={`search ${group.kind} ${result.id}`}
                                            forceMount
                                            disabled={stale}
                                            onSelect={() => {
                                                onOpenChange(false)
                                                search.onOpen(result, group)
                                            }}
                                        >
                                            <SearchResultBody result={result} query={trimmed} />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </div>
                        ))}
                    {((found.length === 0 && stale) || answer.state === 'failed') && (
                        <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            {answer.state === 'failed' ? (
                                (said?.failed?.(answer.reason) ?? 'The search did not answer.')
                            ) : (
                                <>
                                    <Spinner className="text-faint" />
                                    {said?.searching ?? 'Searching'}
                                </>
                            )}
                        </div>
                    )}
                    {answer.state === 'failed' && (
                        <CommandItem className={ROW} value="search retry" forceMount onSelect={answer.retry}>
                            <SearchIcon className="text-muted-foreground" aria-hidden />
                            {said?.retry ?? 'Retry'}
                        </CommandItem>
                    )}
                    {seeAll && (
                        <CommandItem
                            className={cn(
                                ROW,
                                'sticky bottom-0 mt-1.5 bg-popover before:absolute before:inset-x-0 before:-top-1.5 before:h-1.5 before:border-b before:border-border before:bg-popover',
                            )}
                            value="search see-all"
                            forceMount
                            onSelect={() => {
                                onOpenChange(false)
                                search.onSeeAll?.(trimmed)
                            }}
                        >
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                {said?.seeAll?.(trimmed) ?? `See all results for “${trimmed}”`}
                            </span>
                            <ArrowRight className="text-muted-foreground" aria-hidden />
                        </CommandItem>
                    )}
                </CommandList>
                {foot === undefined ? (
                    <div className="hidden justify-end border-t border-border p-1.5 pointer-coarse:flex">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            {words.close}
                        </Button>
                    </div>
                ) : (
                    <div className="-mx-(--palette-inset) flex items-center gap-3 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
                        {foot.mark !== undefined && <span className="flex size-4 shrink-0 items-center justify-center">{foot.mark}</span>}
                        {foot.name !== undefined && <span className="min-w-0 truncate">{foot.name}</span>}
                        <span className="ml-auto flex shrink-0 items-center gap-1.5 pointer-coarse:hidden">
                            {verb}
                            <Kbd>{keyLabels({ key: 'Enter' })[0]}</Kbd>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 max-sm:hidden pointer-coarse:hidden">
                            {words.palette}
                            <Keys keys={foot.keys ?? keyLabels({ key: 'k', mod: true })} />
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto hidden pointer-coarse:flex"
                            onClick={() => onOpenChange(false)}
                        >
                            {words.close}
                        </Button>
                    </div>
                )}
            </Command>
        </CommandDialog>
    )
}

/** The keys of one press, held together. */
function Keys({ keys }: { keys: readonly string[] }) {
    return (
        <KbdGroup>
            {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
            ))}
        </KbdGroup>
    )
}

/** The value cmdk holds a command's row by, which the chosen row is known by. */
function rowValue(command: PaletteCommand): string {
    return `${command.label} ${command.id}`
}

/** Whether a command is drawn as a two-line row. */
function twoLines(command: PaletteCommand): boolean {
    return command.detail !== undefined || (command.artwork !== undefined && command.artwork !== null)
}

/** The words a command is found by beyond its label: its keywords and its second line. */
function findBy(command: PaletteCommand): string[] | undefined {
    const words = [...(command.keywords ?? []), ...(command.detail === undefined ? [] : [command.detail])]
    return words.length === 0 ? undefined : words
}

/** A command's quiet words after its label: why it cannot run now, or its hint. */
function hintOf(command: PaletteCommand): string | undefined {
    return typeof command.disabled === 'string' ? command.disabled : command.hint
}

/** A two-line command as the row a search result is drawn as, its hint or code the quiet fact at the end. */
function asResult(command: PaletteCommand): SearchResult {
    const picture = command.artwork
    return {
        id: command.id,
        title: command.label,
        detail: command.detail,
        meta: hintOf(command) ?? command.code,
        icon: command.icon,
        round: command.round,
        ...(typeof picture === 'string' ? { thumbnail: picture } : { artwork: picture }),
    }
}
