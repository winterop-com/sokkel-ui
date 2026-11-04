import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Kbd, KbdGroup } from './ui/kbd'
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
    /** A quiet fact after the label: a code, where it leads. */
    hint?: string
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

/** Opens the palette on ⌘K or Ctrl+K, wherever focus is. */
export function usePaletteShortcut(onOpen: () => void, key = 'k') {
    useEffect(() => {
        const listen = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === key && (event.metaKey || event.ctrlKey) && !event.altKey) {
                event.preventDefault()
                onOpen()
            }
        }
        window.addEventListener('keydown', listen)
        return () => window.removeEventListener('keydown', listen)
    }, [onOpen, key])
}

/**
 * The command palette: one search over everything an app can do, grouped, each row with its
 * icon, a hint and the keys that run it directly. Choosing a row closes the palette and runs it.
 */
export function CommandPalette({
    open,
    onOpenChange,
    groups,
    defaultQuery = '',
    words = { placeholder: 'Search or run a command', empty: 'No command matches.', title: 'Command palette' },
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly PaletteGroup[]
    /** What the search holds when the palette opens. */
    defaultQuery?: string
    words?: { placeholder: string; empty: string; title: string }
}) {
    const [query, setQuery] = useState(defaultQuery)
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title={words.title} description={words.placeholder}>
            <Command>
                <CommandInput placeholder={words.placeholder} value={query} onValueChange={setQuery} />
                <CommandList className="max-h-[min(24rem,60svh)] scroll-fade-b pb-1.5">
                    <CommandEmpty>{words.empty}</CommandEmpty>
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
                                                <span className="truncate font-mono text-xs text-muted-foreground">{command.hint}</span>
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
                </CommandList>
            </Command>
        </CommandDialog>
    )
}
