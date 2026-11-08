import { createContext, useContext, useEffect, useId, useMemo, useState, type DependencyList } from 'react'

import type { PaletteGroup } from '../components/CommandPalette'

/** Where the commands screens add are kept while they are mounted. */
export interface CommandRegistryHandle {
    /** Sets the groups one screen adds, in that screen's place among the others. */
    set: (key: string, groups: readonly PaletteGroup[]) => void
    /** Takes one screen's groups away. */
    remove: (key: string) => void
}

/**
 * The registry `useCommands` adds to. `Shell` holds one around its content; an app that draws
 * its own palette holds one with `useCommandRegistry` and provides it here.
 */
export const CommandRegistry = createContext<CommandRegistryHandle | undefined>(undefined)

/**
 * A registry of the commands screens add while they are mounted: `registry` goes to
 * `CommandRegistry`'s provider and `groups` are what the screens add, in the order they first
 * added them, for the palette to list with the app's own groups.
 */
export function useCommandRegistry(): { registry: CommandRegistryHandle; groups: readonly PaletteGroup[] } {
    const [entries, setEntries] = useState<readonly (readonly [string, readonly PaletteGroup[]])[]>([])
    const registry = useMemo<CommandRegistryHandle>(
        () => ({
            set: (key, groups) =>
                setEntries((old) => {
                    const at = old.findIndex(([held]) => held === key)
                    if (at === -1) return [...old, [key, groups]]
                    if (old[at][1] === groups) return old
                    return old.map((entry, index) => (index === at ? ([key, groups] as const) : entry))
                }),
            remove: (key) => setEntries((old) => (old.some(([held]) => held === key) ? old.filter(([held]) => held !== key) : old)),
        }),
        [],
    )
    const groups = useMemo(() => entries.flatMap(([, held]) => held), [entries])
    return { registry, groups }
}

/**
 * Adds a screen's own groups to the command palette while the screen is mounted, and takes them
 * away when it unmounts. `deps` are what the groups are made from, as for `useMemo`: the groups
 * are set again, in the same place, when one of them changes. A group's `rank` places it among
 * the palette's groups; at equal rank a screen's groups come before the app's own. Outside a
 * `Shell` or a `CommandRegistry` it does nothing.
 */
export function useCommands(groups: readonly PaletteGroup[], deps: DependencyList): void {
    const registry = useContext(CommandRegistry)
    const key = useId()
    useEffect(() => {
        if (registry === undefined) return undefined
        return () => registry.remove(key)
    }, [registry, key])
    useEffect(() => {
        registry?.set(key, groups)
    }, [registry, key, ...deps])
}
