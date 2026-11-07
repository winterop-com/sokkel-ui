import { Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command'
import { Input } from './ui/input'

/** One thing to pick: addressed by its code, titled by its name, and what it can do. */
export interface PickerItem {
    code: string
    name?: string
    description?: string
    /** The heading it is listed under. */
    group?: string
    /** The capability ids it has. */
    capabilities: readonly string[]
    icon?: ReactNode
}

export interface Capability {
    id: string
    label: string
}

export interface CapabilityPickerWords {
    search: string
    filters: string
    empty: string
    clear: string
    other: string
}

const WORDS: CapabilityPickerWords = {
    search: 'Search',
    filters: 'Filter by what it can do',
    empty: 'Nothing matches.',
    clear: 'Clear the filters',
    other: 'Other',
}

/** Whether an item has every chosen capability and matches the query in its code, name or description. */
function matches(item: PickerItem, chosen: ReadonlySet<string>, query: string): boolean {
    for (const id of chosen) if (!item.capabilities.includes(id)) return false
    if (query === '') return true
    const q = query.toLowerCase()
    return [item.code, item.name ?? '', item.description ?? ''].some((text) => text.toLowerCase().includes(q))
}

/**
 * A list to pick one thing from, narrowed two ways: a search over code, name and description, and
 * capability chips that keep only what has every chip chosen. Each chip counts what it would leave,
 * and one that would leave nothing is disabled. Rows are grouped, keep the identity rule (the name,
 * else the code in mono, and the code always shown), and carry their own capabilities. The arrow
 * keys move through the rows and Enter picks.
 */
export function CapabilityPicker({
    items,
    capabilities,
    onChoose,
    defaultQuery = '',
    defaultCapabilities = [],
    className,
    words: given,
}: {
    items: readonly PickerItem[]
    capabilities: readonly Capability[]
    onChoose: (code: string) => void
    defaultQuery?: string
    defaultCapabilities?: readonly string[]
    className?: string
    words?: Partial<CapabilityPickerWords>
}) {
    const words = { ...WORDS, ...given }
    const [query, setQuery] = useState(defaultQuery)
    const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(defaultCapabilities))
    const q = query.trim()
    const shown = useMemo(() => items.filter((item) => matches(item, chosen, q)), [items, chosen, q])
    const [highlight, setHighlight] = useState('')
    const current = shown.some((item) => item.code === highlight) ? highlight : (shown[0]?.code ?? '')
    const labels = useMemo(() => new Map(capabilities.map((capability) => [capability.id, capability.label])), [capabilities])
    const groups = useMemo(() => {
        const out = new Map<string, PickerItem[]>()
        for (const item of shown) {
            const group = item.group ?? words.other
            out.set(group, [...(out.get(group) ?? []), item])
        }
        return [...out]
    }, [shown, words.other])

    const toggle = (id: string) => {
        const next = new Set(chosen)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setChosen(next)
    }

    return (
        <Command
            shouldFilter={false}
            value={current}
            onValueChange={setHighlight}
            className={cn('flex min-h-0 flex-col rounded-none! bg-popover p-0 text-popover-foreground', className)}
        >
            <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Input
                    bare
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={words.search}
                    aria-label={words.search}
                    className="h-10 flex-1 text-sm"
                />
            </div>
            <div role="group" aria-label={words.filters} className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
                {capabilities.map((capability) => {
                    const on = chosen.has(capability.id)
                    const next = new Set(chosen)
                    next.add(capability.id)
                    const left = on ? shown.length : items.filter((item) => matches(item, next, q)).length
                    return (
                        <button
                            key={capability.id}
                            type="button"
                            aria-pressed={on}
                            disabled={!on && left === 0}
                            onClick={() => toggle(capability.id)}
                            className={cn(
                                'inline-flex h-6 items-center gap-1.5 rounded-control border px-2.5 text-xs transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-40',
                                on
                                    ? 'border-primary/40 bg-accent text-foreground'
                                    : 'border-border-strong text-muted-foreground hover:bg-secondary hover:text-foreground',
                            )}
                        >
                            {capability.label}
                            <span className="text-faint tabular-nums">{left}</span>
                        </button>
                    )
                })}
                {chosen.size > 0 && (
                    <button
                        type="button"
                        onClick={() => setChosen(new Set())}
                        className="ml-auto inline-flex h-6 items-center gap-1 rounded-sm px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
                    >
                        <X className="size-3.5" aria-hidden />
                        {words.clear}
                    </button>
                )}
            </div>
            <CommandList className="max-h-none min-h-0 flex-1">
                <CommandEmpty>{words.empty}</CommandEmpty>
                {groups.map(([group, rows]) => (
                    <CommandGroup key={group} heading={group}>
                        {rows.map((item) => (
                            <CommandItem
                                key={item.code}
                                value={item.code}
                                onSelect={() => onChoose(item.code)}
                                className="flex-wrap items-start gap-x-2.5 gap-y-1 py-2"
                            >
                                {item.icon !== undefined && (
                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                                        {item.icon}
                                    </span>
                                )}
                                <span className="flex min-w-[min(100%,12rem)] flex-1 basis-48 flex-col gap-0.5">
                                    <span className="flex min-w-0 items-baseline gap-2">
                                        <span className={cn('truncate font-medium', item.name === undefined && 'font-mono')}>
                                            {item.name ?? item.code}
                                        </span>
                                        {item.name !== undefined && (
                                            <span className="truncate font-mono text-xs text-muted-foreground">{item.code}</span>
                                        )}
                                    </span>
                                    {item.description !== undefined && (
                                        <span className="line-clamp-1 text-xs text-muted-foreground">{item.description}</span>
                                    )}
                                </span>
                                <span data-slot="command-shortcut" className="ml-auto flex shrink-0 flex-wrap justify-end gap-1 pt-0.5">
                                    {item.capabilities.map((id) => (
                                        <span
                                            key={id}
                                            className={cn(
                                                'rounded-mini border px-1 text-2xs leading-4',
                                                chosen.has(id)
                                                    ? 'border-primary/40 text-foreground'
                                                    : 'border-border text-muted-foreground',
                                            )}
                                        >
                                            {labels.get(id) ?? id}
                                        </span>
                                    ))}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </Command>
    )
}
