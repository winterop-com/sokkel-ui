import { useShortcuts } from './use-shortcuts'

/**
 * Opens a palette an app draws itself on ⌘K on a Mac and Ctrl+K elsewhere, from a field too, bound
 * through `useShortcuts`. `Shell`'s own palette binds it already.
 */
export function usePaletteShortcut(onOpen: () => void, key = 'k') {
    useShortcuts([{ id: 'palette', key, mod: true, inFields: true, run: onOpen }], [onOpen, key])
}
