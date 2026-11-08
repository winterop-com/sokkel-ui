import { isApple, keyLabels, keyName, textEntry, type KeyChord, type KeyTarget } from './keys'
import { overlaysOpen, topOverlay } from './overlay'

/**
 * A key a screen answers while it is mounted: the chord, what it does, and where it is heard.
 *
 * A letter is matched without regard to case, `shift` saying whether Shift is held. A character
 * that is not a letter (`?`, `/`, `*`, `{`) is matched as itself, whatever Shift, Alt or AltGr the
 * layout took to type it, so `?` works on a Norwegian keyboard as on an American one. Where the
 * Option key (on a Mac) or a non-Latin layout turns a letter key into another character, a chord on
 * a letter is matched by the key's place instead.
 */
export interface KeyBinding extends KeyChord {
    id: string
    /** What the key does, as the shortcuts dialog lists it; a binding without one is not listed. */
    label?: string
    /** The heading the dialog lists it under; "General" when not given. */
    group?: string
    /**
     * Heard only while focus is inside an element marked `data-shortcut-scope` with this name, such
     * as a list or an editor, and then before the same chord bound outside it.
     */
    scope?: string
    /** Heard while typing in a field too, as a chord such as ⌘K or ⌘S may be. */
    inFields?: boolean
    /** Heard while a dialog, a menu or an overlay is open over the page too. */
    inDialogs?: boolean
    /** Heard again while the key is held down, as a step through a list may be. */
    repeat?: boolean
    /** Kept and listed, but not heard. */
    disabled?: boolean
    run: (event: KeyboardEvent) => void
}

/** One key press, reduced to what a binding is matched against. */
export interface KeyPress {
    /** What the press typed, or the named key: `KeyboardEvent.key`. */
    key: string
    /** The key's place on the keyboard: `KeyboardEvent.code`. */
    code?: string
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    shiftKey: boolean
    /** Whether AltGr is held, which Windows reports as Ctrl and Alt together. */
    altGraph?: boolean
    /** Whether the key is held down and repeating. */
    repeat?: boolean
    /** Whether the press belongs to an input method composing a character. */
    composing?: boolean
}

/** A keyboard event as a key press. */
export function keyPress(event: KeyboardEvent): KeyPress {
    return {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        altGraph: typeof event.getModifierState === 'function' && event.getModifierState('AltGraph'),
        repeat: event.repeat,
        composing: event.isComposing || event.keyCode === 229,
    }
}

const LATIN = /^[a-z]$/i

/** One character, not a named key or Space. */
function character(key: string): boolean {
    return key !== ' ' && [...key].length === 1
}

function letter(key: string): boolean {
    return character(key) && key.toLowerCase() !== key.toUpperCase()
}

/**
 * Whether a press is a chord, by the character it typed. `apple` says whether `mod` is ⌘ (on a Mac)
 * or Ctrl (elsewhere); the other one held refuses the press.
 */
export function matchesChord(chord: KeyChord, press: KeyPress, apple: boolean): boolean {
    const want = keyName(chord.key)
    const got = keyName(press.key)
    const symbol = character(want) && !letter(want)
    let { ctrlKey, altKey } = press
    // AltGr, which a layout needs for a character such as `{` and Windows reports as Ctrl and Alt.
    if (symbol && ((press.altGraph === true && ctrlKey && altKey) || (ctrlKey && altKey && !press.metaKey))) {
        ctrlKey = false
        altKey = false
    }
    const command = apple ? press.metaKey : ctrlKey
    const other = apple ? ctrlKey : press.metaKey
    if (command !== (chord.mod === true) || other) return false
    if (symbol) return got === want
    if ((chord.alt === true) !== altKey || (chord.shift === true) !== press.shiftKey) return false
    if (letter(want)) {
        if (got.toLowerCase() === want.toLowerCase()) return true
        // Option on a Mac, or a non-Latin layout, made another character on the letter's key.
        return LATIN.test(want) && !LATIN.test(got) && press.code === `Key${want.toUpperCase()}`
    }
    return got.toLowerCase() === want.toLowerCase()
}

/** Where a press lands, reduced to what decides whether a binding is heard there. */
export interface PressPlace {
    /** Focus is in something that takes this key itself: a field being typed in, a slider's arrows, a button's Space. */
    field: boolean
    /** A dialog, a menu or an overlay is open over the page. */
    dialog: boolean
    /** The `data-shortcut-scope` names around the focus, innermost first. */
    scopes: readonly string[]
}

const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])
const ARROW_ROLES = new Set([
    'slider',
    'spinbutton',
    'separator',
    'radiogroup',
    'radio',
    'tab',
    'tablist',
    'listbox',
    'option',
    'menu',
    'menubar',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'grid',
    'gridcell',
    'row',
    'tree',
    'treegrid',
    'treeitem',
])
const PRESSABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY'])
const PRESSABLE_ROLES = new Set([
    'button',
    'link',
    'checkbox',
    'switch',
    'radio',
    'tab',
    'option',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'treeitem',
])
const PRESSABLE_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color', 'image'])
const LAYER_ROLES = new Set(['dialog', 'alertdialog', 'menu', 'listbox'])

function pressable(element: KeyTarget): boolean {
    const tag = (element.tagName ?? '').toUpperCase()
    if (PRESSABLE_TAGS.has(tag)) return true
    if (tag === 'INPUT' && PRESSABLE_INPUTS.has((element.getAttribute?.('type') ?? '').toLowerCase())) return true
    return PRESSABLE_ROLES.has(element.getAttribute?.('role') ?? '')
}

/**
 * Where a press of `key` lands, read from the focused element and those around it: whether it takes
 * the key itself, whether it is in a dialog or a menu, and the shortcut scopes around it.
 * `overlaid` says an overlay of the app's own is open, wherever focus is.
 */
export function pressPlace(target: unknown, key: string, overlaid = false): PressPlace {
    const name = keyName(key)
    const scopes: string[] = []
    let dialog = overlaid
    let field = false
    let node = typeof target === 'object' && target !== null && 'tagName' in target ? (target as KeyTarget) : null
    const focused = node
    if (focused !== null) {
        const tag = (focused.tagName ?? '').toUpperCase()
        const range = tag === 'INPUT' && (focused.getAttribute?.('type') ?? '').toLowerCase() === 'range'
        field = textEntry(focused) || (range && ARROWS.has(name)) || ((name === ' ' || name === 'Enter') && pressable(focused))
    }
    while (node !== null) {
        const role = node.getAttribute?.('role') ?? ''
        if (!field && ARROWS.has(name) && ARROW_ROLES.has(role)) field = true
        if (LAYER_ROLES.has(role) || node.getAttribute?.('aria-modal') === 'true') dialog = true
        const scope = node.getAttribute?.('data-shortcut-scope')
        if (scope !== null && scope !== undefined && scope !== '') scopes.push(scope)
        node = node.parentElement ?? null
    }
    return { field, dialog, scopes }
}

/**
 * Whether a binding is heard where a press lands: never while turned off or for a held key's
 * repeats unless it asks; only inside its scope; not in a field or under a dialog unless it asks,
 * or under a dialog when its scope holds the focus.
 */
export function heard(binding: KeyBinding, press: Pick<KeyPress, 'repeat'>, place: PressPlace): boolean {
    if (binding.disabled === true) return false
    if (press.repeat === true && binding.repeat !== true) return false
    const scoped = binding.scope !== undefined
    if (scoped && !place.scopes.includes(binding.scope as string)) return false
    if (place.field && binding.inFields !== true) return false
    if (place.dialog && binding.inDialogs !== true && !scoped) return false
    return true
}

/**
 * The binding a press calls, from bindings in the order they yield (the first before the rest):
 * one whose scope holds the focus before one bound outside it, the innermost scope first.
 */
export function pickBinding(bindings: readonly KeyBinding[], press: KeyPress, place: PressPlace, apple: boolean): KeyBinding | undefined {
    let best: KeyBinding | undefined
    let bestDepth = Number.POSITIVE_INFINITY
    for (const binding of bindings) {
        if (!matchesChord(binding, press, apple) || !heard(binding, press, place)) continue
        const depth = binding.scope === undefined ? Number.POSITIVE_INFINITY : place.scopes.indexOf(binding.scope)
        if (best === undefined || depth < bestDepth) {
            best = binding
            bestDepth = depth
        }
    }
    return best
}

/** One shortcut as the shortcuts dialog lists it: what it does and its keys, in the order they are pressed. */
export interface Shortcut {
    id: string
    action: string
    keys: readonly string[]
}

/** Shortcuts under a heading: Navigation, Editing. */
export interface ShortcutGroup {
    title: string
    shortcuts: readonly Shortcut[]
}

/**
 * The groups the shortcuts dialog lists: every registered binding with a label and its keys as this
 * device writes them, those with a group of their own first (a screen's), then those without under
 * `general`, then the groups given. Groups of one title are one, at the first one's place; a
 * shortcut whose id is already listed is left out.
 */
export function shortcutGroups(
    registered: readonly KeyBinding[],
    given: readonly ShortcutGroup[],
    general: string,
    apple: boolean = isApple(),
): ShortcutGroup[] {
    const groups = new Map<string, Shortcut[]>()
    const ids = new Set<string>()
    const add = (title: string, shortcut: Shortcut) => {
        if (ids.has(shortcut.id)) return
        ids.add(shortcut.id)
        const held = groups.get(title) ?? []
        held.push(shortcut)
        groups.set(title, held)
    }
    const labeled = registered.filter((binding) => binding.label !== undefined)
    for (const binding of [...labeled.filter((one) => one.group !== undefined), ...labeled.filter((one) => one.group === undefined)])
        add(binding.group ?? general, { id: binding.id, action: binding.label ?? '', keys: keyLabels(binding, apple) })
    for (const group of given) for (const shortcut of group.shortcuts) add(group.title, shortcut)
    return [...groups.entries()].map(([title, shortcuts]) => ({ title, shortcuts }))
}

/**
 * What stands over the page while it is open: a dialog, an alert, a sheet, or a menu or a select's
 * list. Popups that stay in the page while closed are matched only while open; a toast is not one.
 */
const OPEN_LAYERS = [
    '[role="dialog"][data-open]:not([aria-modal="false"])',
    '[role="alertdialog"][data-open]:not([aria-modal="false"])',
    '[data-slot="dropdown-menu-content"]',
    '[data-slot="context-menu-content"]',
    '[data-slot="menubar-content"]',
    '[data-slot="select-content"]',
].join(', ')

/** Whether a dialog, a sheet or a menu is open in `doc`, wherever focus is. */
export function layerOpen(
    doc: Pick<Document, 'querySelector'> | undefined = typeof document === 'undefined' ? undefined : document,
): boolean {
    return doc !== undefined && doc.querySelector(OPEN_LAYERS) !== null
}

/**
 * The layer standing on top of the page: the dialog, sheet or menu opened last in `doc`, or else the
 * overlay from `useOverlay` on top; null where nothing stands over the page.
 */
export function topLayer(
    doc: Pick<Document, 'querySelectorAll'> | undefined = typeof document === 'undefined' ? undefined : document,
): Element | null {
    const layers = doc === undefined ? [] : Array.from(doc.querySelectorAll(OPEN_LAYERS))
    return layers.at(-1) ?? topOverlay()
}

/** Where the keys screens bind are kept, and the one listener that answers them. */
export interface ShortcutRegistryHandle {
    /**
     * Sets the bindings one screen adds, in that screen's place among the others. `fallback` ones
     * (the shell's own) are listed last and yield to every screen's.
     */
    set: (key: string, bindings: readonly KeyBinding[], options?: { fallback?: boolean }) => void
    /** Takes one screen's bindings away. */
    remove: (key: string) => void
    /** Every binding held, in the order screens first set them, the fallback ones last; the same array until one changes. */
    bindings: () => readonly KeyBinding[]
    /** Hears every change to the bindings; returns the way to stop. */
    subscribe: (listener: () => void) => () => void
    /** Runs the binding a key press calls, if any, and says whether one ran. */
    handle: (event: KeyboardEvent) => boolean
    /** Answers the key presses on a window (or any target) until the returned function is called. */
    listen: (target: Pick<Window, 'addEventListener' | 'removeEventListener'>) => () => void
    /**
     * Says whether a surface of the app's own (the shell's palette, its shortcuts dialog, a
     * full-screen view) is open; while one is, the bindings are quiet as under a dialog.
     */
    surface: (name: string, open: boolean) => void
    /**
     * Whether anything stands over the page: a surface said open, an overlay from `useOverlay`, or
     * a dialog, a sheet or a menu open in the document.
     */
    covered: () => boolean
}

interface Entry {
    key: string
    bindings: readonly KeyBinding[]
    fallback: boolean
}

/**
 * A registry of key bindings. A later screen's binding yields before an earlier one's for the same
 * chord, since it is the screen just put in front; the fallback ones yield to all of them. A press
 * another handler has already taken (`defaultPrevented`) or an input method is composing is left
 * alone, and the binding that runs takes the press with `preventDefault`.
 */
export function createShortcutRegistry({ apple }: { apple?: boolean } = {}): ShortcutRegistryHandle {
    let entries: Entry[] = []
    let listed: readonly KeyBinding[] = []
    let order: readonly KeyBinding[] = []
    const listeners = new Set<() => void>()
    const surfaces = new Set<string>()
    const covered = () => surfaces.size > 0 || overlaysOpen() || layerOpen()
    const changed = () => {
        const screens = entries.filter((entry) => !entry.fallback)
        const fallback = entries.filter((entry) => entry.fallback)
        listed = [...screens, ...fallback].flatMap((entry) => entry.bindings)
        order = [...screens.reverse(), ...fallback.reverse()].flatMap((entry) => entry.bindings)
        for (const listener of Array.from(listeners)) listener()
    }
    const handle = (event: KeyboardEvent) => {
        if (event.defaultPrevented || order.length === 0) return false
        const press = keyPress(event)
        if (press.composing === true) return false
        const place = pressPlace(event.target, press.key, covered())
        const binding = pickBinding(order, press, place, apple ?? isApple())
        if (binding === undefined) return false
        event.preventDefault()
        binding.run(event)
        return true
    }
    const held = new Map<object, number>()
    return {
        set: (key, bindings, options = {}) => {
            const fallback = options.fallback === true
            const at = entries.findIndex((entry) => entry.key === key)
            if (at === -1) entries = [...entries, { key, bindings, fallback }]
            else if (entries[at].bindings === bindings && entries[at].fallback === fallback) return
            else entries = entries.map((entry, index) => (index === at ? { key, bindings, fallback } : entry))
            changed()
        },
        remove: (key) => {
            if (!entries.some((entry) => entry.key === key)) return
            entries = entries.filter((entry) => entry.key !== key)
            changed()
        },
        bindings: () => listed,
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        handle,
        surface: (name, open) => {
            if (open) surfaces.add(name)
            else surfaces.delete(name)
        },
        covered,
        listen: (target) => {
            const count = held.get(target) ?? 0
            if (count === 0) target.addEventListener('keydown', handle)
            held.set(target, count + 1)
            return () => {
                const left = (held.get(target) ?? 1) - 1
                if (left > 0) held.set(target, left)
                else {
                    held.delete(target)
                    target.removeEventListener('keydown', handle)
                }
            }
        },
    }
}
