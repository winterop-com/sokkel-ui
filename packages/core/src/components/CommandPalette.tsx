import type { LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { useSearch } from '../hooks/use-search'
import { filterCommands, mergeCommands, termScore } from '../lib/commands'
import { keyLabels } from '../lib/keys'
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
    /** The keys that run it outside the palette, shown at the row's end. */
    keys?: readonly string[]
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
}

/**
 * The app's own search in the palette: what it finds for the query is listed under the commands,
 * grouped by kind as `Search` lists it, so one box finds both what to do and what there is.
 */
export interface PaletteSearch {
    search: SearchSource
    /** Opens a result the person chose; the palette closes first. */
    onOpen: (result: SearchResult, group: SearchGroup) => void
    /** Characters needed before the search is asked. */
    minQuery?: number
    /** Milliseconds of quiet typing before the search is asked again. */
    debounce?: number
    words?: { searching: string }
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
    /** The foot's word before the key that runs the chosen row. */
    open: string
    /** The foot's word before the keys that open and close the palette. */
    palette: string
}

const WORDS: CommandPaletteWords = {
    placeholder: 'Search or run a command',
    empty: 'No command matches.',
    title: 'Command palette',
    close: 'Close',
    open: 'Open',
    palette: 'Command palette',
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
    /** What the search holds when the palette opens. */
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
 * icon, a hint in words or a code, and the keys that run it directly. Choosing a row closes the
 * palette and runs it. A row with a `detail` or `artwork` is two lines tall, a picture or its icon
 * on a tile at its start and its hint or code at its end, as a record found by a search is. The
 * groups are listed by their `rank`, one group to a title. With `search` the app's own results for
 * the query follow the commands, each with its thumbnail, artwork or icon and the query's words
 * marked. On a touch screen, which has no Escape, a Close button stands at its foot. `filter`
 * chooses how the commands are matched: by their letters (`fuzzy`), by every word typed (`terms`),
 * or by the app's own score. `foot` adds a strip with the app's mark and the keys it answers.
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
    const score = filter === 'fuzzy' ? undefined : filter === 'terms' ? termScore : filter
    const listed = useMemo(() => (score === undefined ? merged : filterCommands(merged, query, score)), [merged, query, score])
    const answer = useSearch(search?.search, query, { enabled: open, minQuery: search?.minQuery, debounce: search?.debounce })
    const found = answer.groups.filter((group) => group.results.length > 0)
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title={words.title} description={words.placeholder}>
            <Command shouldFilter={score === undefined} className="p-(--palette-inset)">
                <CommandInput placeholder={words.placeholder} value={query} onValueChange={setQuery} />
                <CommandList className="max-h-[min(24rem,60svh)] scroll-fade-b pb-1.5">
                    {found.length === 0 && answer.state !== 'loading' && <CommandEmpty>{words.empty}</CommandEmpty>}
                    {listed.map((group, index) => (
                        <div key={group.title}>
                            {index > 0 && <CommandSeparator className="-mx-(--palette-inset)" />}
                            <CommandGroup heading={group.title} className={GROUP}>
                                {group.commands.map((command) => {
                                    const Icon = command.icon
                                    return (
                                        <CommandItem
                                            key={command.id}
                                            className={ROW}
                                            value={`${command.label} ${command.id}`}
                                            keywords={findBy(command)}
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
                                                    {command.hint !== undefined && (
                                                        <span className="truncate text-xs text-muted-foreground">{command.hint}</span>
                                                    )}
                                                    {command.code !== undefined && (
                                                        <span className="truncate font-mono text-xs text-muted-foreground">
                                                            {command.code}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {command.keys !== undefined && (
                                                <CommandShortcut className="tracking-normal">
                                                    <KbdGroup>
                                                        {command.keys.map((key) => (
                                                            <Kbd key={key}>{key}</Kbd>
                                                        ))}
                                                    </KbdGroup>
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
                                            onSelect={() => {
                                                onOpenChange(false)
                                                search.onOpen(result, group)
                                            }}
                                        >
                                            <SearchResultBody result={result} query={query.trim()} />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </div>
                        ))}
                    {search !== undefined && found.length === 0 && answer.state === 'loading' && (
                        <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            <Spinner className="text-faint" />
                            {search.words?.searching ?? 'Searching'}
                        </div>
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
                            {words.open}
                            <Kbd>{keyLabels({ key: 'Enter' })[0]}</Kbd>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 max-sm:hidden pointer-coarse:hidden">
                            {words.palette}
                            <KbdGroup>
                                {(foot.keys ?? keyLabels({ key: 'k', mod: true })).map((key) => (
                                    <Kbd key={key}>{key}</Kbd>
                                ))}
                            </KbdGroup>
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

/** Whether a command is drawn as a two-line row. */
function twoLines(command: PaletteCommand): boolean {
    return command.detail !== undefined || (command.artwork !== undefined && command.artwork !== null)
}

/** The words a command is found by beyond its label: its keywords and its second line. */
function findBy(command: PaletteCommand): string[] | undefined {
    const words = [...(command.keywords ?? []), ...(command.detail === undefined ? [] : [command.detail])]
    return words.length === 0 ? undefined : words
}

/** A two-line command as the row a search result is drawn as, its hint or code the quiet fact at the end. */
function asResult(command: PaletteCommand): SearchResult {
    const picture = command.artwork
    return {
        id: command.id,
        title: command.label,
        detail: command.detail,
        meta: command.hint ?? command.code,
        icon: command.icon,
        round: command.round,
        ...(typeof picture === 'string' ? { thumbnail: picture } : { artwork: picture }),
    }
}
