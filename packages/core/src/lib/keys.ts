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
 * How a shortcut with the command key is written on this device: `⌘K` on a Mac, `Ctrl K` elsewhere,
 * matching what `usePaletteShortcut` listens for (⌘ or Ctrl).
 */
export function shortcutLabel(key: string, apple: boolean = isApple()): string {
    return apple ? `⌘${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`
}

/** Whether a key press lands in a field being typed in, where a single-key shortcut must not fire. */
export function typing(target: EventTarget | null): boolean {
    const element = target as { closest?: (selector: string) => unknown } | null
    return typeof element?.closest === 'function' && element.closest('input, textarea, select, [contenteditable="true"]') !== null
}
