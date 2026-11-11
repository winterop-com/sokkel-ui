import { createContext, useContext, useEffect, useId, useSyncExternalStore, type DependencyList } from 'react'

import { createShortcutRegistry, type KeyBinding, type ShortcutRegistryHandle } from '../lib/shortcuts'

export type { KeyBinding, ShortcutRegistryHandle } from '../lib/shortcuts'

/**
 * The registry `useShortcuts` binds in. `Shell` holds one around its content and answers its keys;
 * outside one, keys are bound in the page's own, which answers them on the window.
 */
export const ShortcutRegistry = createContext<ShortcutRegistryHandle | undefined>(undefined)

let page: ShortcutRegistryHandle | undefined

/** The page's own registry, for keys bound outside a `Shell`. */
function pageRegistry(): ShortcutRegistryHandle {
    page ??= createShortcutRegistry()
    return page
}

/** The registry keys are bound in here: the nearest `Shell`'s, or the page's. */
export function useShortcutRegistry(): ShortcutRegistryHandle {
    return useContext(ShortcutRegistry) ?? pageRegistry()
}

/**
 * Binds a screen's keys while the screen is mounted, and takes them away when it unmounts. Each
 * binding names its key by the character it types, with `mod` (⌘ on a Mac, Ctrl elsewhere), `shift`
 * and `alt`, and is quiet while typing in a field and while a dialog, a menu or an overlay is open,
 * unless it asks (`inFields`, `inDialogs`). `next` makes it a two-key sequence (G then D), the
 * second key pressed within a second and never in a field. A `label` lists it in the shortcuts dialog under its
 * `group`. `deps` are what the bindings are made from, as for `useMemo`: they are set again, in the
 * same place, when one changes. A screen's binding comes before the shell's own for the same keys.
 */
export function useShortcuts(bindings: readonly KeyBinding[], deps: DependencyList): void {
    const registry = useShortcutRegistry()
    const own = useContext(ShortcutRegistry) !== undefined
    const key = useId()
    useEffect(() => {
        // The shell answers its own registry's keys; the page's answers them on the window while it holds any.
        const stop = own ? undefined : registry.listen(window)
        return () => {
            registry.remove(key)
            stop?.()
        }
    }, [registry, own, key])
    useEffect(() => {
        registry.set(key, bindings)
    }, [registry, key, ...deps])
}

/** Every key bound in the registry here, in the order the shortcuts dialog lists them, followed as they change. */
export function useRegisteredShortcuts(): readonly KeyBinding[] {
    const registry = useShortcutRegistry()
    return useSyncExternalStore(registry.subscribe, registry.bindings, registry.bindings)
}
