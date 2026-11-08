/** Whether a platform names its command key ⌘ rather than Ctrl. */
export function applePlatform(userAgent: string): boolean {
    return /Mac|iPhone|iPad|iPod/.test(userAgent)
}

/** Whether this device is an Apple one, where ⌘ takes the place of Ctrl; false where nothing can tell. */
export function isApple(): boolean {
    if (typeof navigator === 'undefined') return false
    const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
    return applePlatform(`${data?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`)
}

/**
 * A key and the modifiers held with it. `key` is what the key types, as `KeyboardEvent.key` says it
 * (`k`, `?`, `/`, `ø`), or a named key (`Enter`, `Escape`, `ArrowLeft`, `Space`), so a chord works on
 * any keyboard layout. `mod` is the command key: ⌘ on a Mac, Ctrl elsewhere.
 */
export interface KeyChord {
    key: string
    mod?: boolean
    shift?: boolean
    alt?: boolean
}

const NAMED: Readonly<Record<string, readonly [apple: string, other: string]>> = {
    ' ': ['Space', 'Space'],
    Escape: ['Esc', 'Esc'],
    Enter: ['↩', 'Enter'],
    Backspace: ['⌫', 'Backspace'],
    Delete: ['⌦', 'Del'],
    Tab: ['⇥', 'Tab'],
    ArrowLeft: ['←', '←'],
    ArrowRight: ['→', '→'],
    ArrowUp: ['↑', '↑'],
    ArrowDown: ['↓', '↓'],
    PageUp: ['PgUp', 'PgUp'],
    PageDown: ['PgDn', 'PgDn'],
}

/** A key's name as `KeyboardEvent.key` gives it, from the ways a binding may write it. */
export function keyName(key: string): string {
    if (key === 'Space' || key === 'Spacebar') return ' '
    if (key === 'Esc') return 'Escape'
    return key
}

/**
 * The keys of a chord as this device writes them, one label per key in the order they are held:
 * `['⌥', '⇧', '⌘', 'K']` on a Mac, `['Ctrl', 'Alt', 'Shift', 'K']` elsewhere. A letter is written
 * in capitals, a character such as `?` as itself, a named key by its short name or arrow.
 */
export function keyLabels(chord: KeyChord, apple: boolean = isApple()): string[] {
    const key = keyName(chord.key)
    const named = NAMED[key]
    const last = named === undefined ? (key.length === 1 ? key.toUpperCase() : key) : named[apple ? 0 : 1]
    const held = apple
        ? [chord.alt && '⌥', chord.shift && '⇧', chord.mod && '⌘']
        : [chord.mod && 'Ctrl', chord.alt && 'Alt', chord.shift && 'Shift']
    return [...held.filter((label): label is string => typeof label === 'string'), last]
}

/**
 * How a shortcut with the command key is written on this device: `⌘K` on a Mac, `Ctrl K` elsewhere,
 * matching what `usePaletteShortcut` listens for.
 */
export function shortcutLabel(key: string, apple: boolean = isApple()): string {
    return keyLabels({ key, mod: true }, apple).join(apple ? '' : ' ')
}

/** The input types a person types text into; a checkbox, a button or a range takes no letters. */
const TEXT_INPUTS = new Set([
    '',
    'text',
    'search',
    'email',
    'password',
    'url',
    'tel',
    'number',
    'date',
    'datetime-local',
    'month',
    'time',
    'week',
])

/** The little of an element the key helpers read, so they can be asked outside a page. */
export interface KeyTarget {
    tagName?: string
    isContentEditable?: boolean
    getAttribute?: (name: string) => string | null
    parentElement?: KeyTarget | null
}

/** Whether an element is one text is typed into: a text input, a text area, a select or an editable region. */
export function textEntry(element: KeyTarget): boolean {
    const tag = (element.tagName ?? '').toUpperCase()
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (tag === 'INPUT') return TEXT_INPUTS.has((element.getAttribute?.('type') ?? '').toLowerCase())
    if (element.isContentEditable === true) return true
    const editable = element.getAttribute?.('contenteditable')
    if (editable !== null && editable !== undefined && editable !== 'false') return true
    const role = element.getAttribute?.('role')
    return role === 'textbox' || role === 'searchbox' || role === 'combobox'
}

/** Whether a key press lands in a field being typed in, where a single-key shortcut must not fire. */
export function typing(target: EventTarget | null): boolean {
    const element = target as KeyTarget | null
    return element !== null && typeof element === 'object' && textEntry(element)
}
