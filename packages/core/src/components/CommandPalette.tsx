import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { useSearch } from '../hooks/use-search'
import type { SearchGroup, SearchResult, SearchSource } from '../lib/search'
import { SearchResultBody } from './Search'
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
    /** More words it is found by, beyond its label. */
    keywords?: readonly string[]
    onSelect: () => void
}

/** Commands under a heading: Go to, Create, Recent. */
export interface PaletteGroup {
    title: string
    commands: readonly PaletteCommand[]
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
    words?: { searching: string }
}

/** The words the command palette says. */
export interface CommandPaletteWords {
    placeholder: string
    empty: string
    title: string
}

const WORDS: CommandPaletteWords = {
    placeholder: 'Search or run a command',
    empty: 'No command matches.',
    title: 'Command palette',
}

/**
 * The command palette: one search over everything an app can do, grouped, each row with its
 * icon, a hint in words or a code, and the keys that run it directly. Choosing a row closes the palette and runs it.
 * With `search` the app's own results for the query follow the commands, each with its thumbnail
 * or icon and the query's words marked.
 */
export function CommandPalette({
    open,
    onOpenChange,
    groups,
    search,
    defaultQuery = '',
    words: given,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly PaletteGroup[]
    /** The app's search, whose results are listed under the commands. */
    search?: PaletteSearch
    /** What the search holds when the palette opens. */
    defaultQuery?: string
    words?: Partial<CommandPaletteWords>
}) {
    const words = { ...WORDS, ...given }
    const [query, setQuery] = useState(defaultQuery)
    const answer = useSearch(search?.search, query, { enabled: open, minQuery: search?.minQuery })
    const found = answer.groups.filter((group) => group.results.length > 0)
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title={words.title} description={words.placeholder}>
            <Command>
                <CommandInput placeholder={words.placeholder} value={query} onValueChange={setQuery} />
                <CommandList className="max-h-[min(24rem,60svh)] scroll-fade-b pb-1.5">
                    {found.length === 0 && answer.state !== 'loading' && <CommandEmpty>{words.empty}</CommandEmpty>}
                    {groups.map((group, index) => (
                        <div key={group.title}>
                            {index > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.title}>
                                {group.commands.map((command) => {
                                    const Icon = command.icon
                                    return (
                                        <CommandItem
                                            key={command.id}
                                            value={`${command.label} ${command.id}`}
                                            keywords={command.keywords === undefined ? undefined : [...command.keywords]}
                                            onSelect={() => {
                                                onOpenChange(false)
                                                command.onSelect()
                                            }}
                                        >
                                            {Icon !== undefined && <Icon className="text-muted-foreground" aria-hidden />}
                                            <span className="truncate">{command.label}</span>
                                            {command.hint !== undefined && (
                                                <span className="truncate text-xs text-muted-foreground">{command.hint}</span>
                                            )}
                                            {command.code !== undefined && (
                                                <span className="truncate font-mono text-xs text-muted-foreground">{command.code}</span>
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
                                <CommandGroup heading={group.title} forceMount>
                                    {group.results.map((result) => (
                                        <CommandItem
                                            key={result.id}
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
            </Command>
        </CommandDialog>
    )
}
