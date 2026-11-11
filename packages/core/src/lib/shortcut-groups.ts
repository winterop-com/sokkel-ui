import { bindingKeys, isApple } from './keys'
import type { KeyBinding } from './shortcuts'

/** One shortcut as the shortcuts dialog lists it: what it does and its keys, in the order they are pressed. */
export interface Shortcut {
    id: string
    action: string
    keys: readonly string[]
    /** The keys of a sequence's second press, pressed after `keys` let go. */
    next?: readonly string[]
}

/** Shortcuts under a heading: Navigation, Editing. */
export interface ShortcutGroup {
    title: string
    shortcuts: readonly Shortcut[]
}

/**
 * The groups the shortcuts dialog lists: every registered binding with a label and its keys as this
 * device writes them, those with a group of their own first (a screen's), then those without under
 * `general`, then the groups given. Groups of one title are one, at the first one's place.
 *
 * A shortcut is known by its id and its keys together, so two of one id on different keys (a
 * field's `/` and an app's own key for its search) are both listed. Where the groups given name one
 * a binding already has, id and keys alike, the app's own words win: the binding is listed there,
 * in the app's group, and not again.
 */
export function shortcutGroups(
    registered: readonly KeyBinding[],
    given: readonly ShortcutGroup[],
    general: string,
    apple: boolean = isApple(),
): ShortcutGroup[] {
    const identity = (shortcut: Pick<Shortcut, 'id' | 'keys' | 'next'>) =>
        `${shortcut.id}\u0000${shortcut.keys.join('\u0000')}\u0001${(shortcut.next ?? []).join('\u0000')}`
    const appGives = new Set(given.flatMap((group) => group.shortcuts.map(identity)))
    const groups = new Map<string, Shortcut[]>()
    const listed = new Set<string>()
    const add = (title: string, shortcut: Shortcut) => {
        const known = identity(shortcut)
        if (listed.has(known)) return
        listed.add(known)
        const held = groups.get(title) ?? []
        held.push(shortcut)
        groups.set(title, held)
    }
    const labeled = registered.filter((binding) => binding.label !== undefined)
    for (const binding of [...labeled.filter((one) => one.group !== undefined), ...labeled.filter((one) => one.group === undefined)]) {
        const shortcut: Shortcut = { id: binding.id, action: binding.label ?? '', ...bindingKeys(binding, apple) }
        if (!appGives.has(identity(shortcut))) add(binding.group ?? general, shortcut)
    }
    for (const group of given) for (const shortcut of group.shortcuts) add(group.title, shortcut)
    return [...groups.entries()].map(([title, shortcuts]) => ({ title, shortcuts }))
}
