/** The groups the emoji are sorted into, in the order a picker shows them. */
export const EMOJI_GROUPS = ['smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'] as const

export type EmojiGroup = (typeof EMOJI_GROUPS)[number]

/** One emoji of the full list: the character, its English name and keywords, and its group. */
export interface EmojiItem {
    emoji: string
    name: string
    keywords: readonly string[]
    group: EmojiGroup
    /** The same emoji in the five skin tones, lightest first, where it takes one. */
    skins?: readonly string[]
}

/** A skin tone: 0 is the default yellow, 1 to 5 the tones from light to dark. */
export type SkinTone = 0 | 1 | 2 | 3 | 4 | 5

/** The emoji data set as loaded: every emoji in the picker's order, and each one by its character. */
export interface EmojiData {
    list: readonly EmojiItem[]
    byEmoji: ReadonlyMap<string, EmojiItem>
}

/**
 * One emoji as `src/data/emoji-en.json` holds it, which `bun run emoji-data` writes from
 * `emojibase-data`: the character, its English name and keywords, the index of its group in
 * `EMOJI_GROUPS`, the emoji version that brought it, and, where it takes a skin tone, the same emoji
 * in the five tones, lightest first.
 */
export type EmojiRow = [emoji: string, name: string, keywords: string[], group: number, version: number, skins?: string[]]

/** The newest emoji version the page's fonts draw: a sample of each version is drawn on a canvas and kept when it draws as one colored glyph. */
function drawnVersion(rows: readonly EmojiRow[]): number {
    if (typeof document === 'undefined') return Infinity
    let context: CanvasRenderingContext2D | null = null
    try {
        context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    } catch {
        return Infinity
    }
    if (context === null) return Infinity
    const face = getComputedStyle(document.documentElement).getPropertyValue('--typeface-emoji').trim() || 'sans-serif'
    const size = 24
    context.canvas.width = size * 2
    context.canvas.height = size * 2
    context.font = `${String(size)}px ${face}`
    context.textBaseline = 'top'
    const colored = (emoji: string) => {
        context.clearRect(0, 0, size * 2, size * 2)
        context.fillText(emoji, 0, 0)
        const pixels = context.getImageData(0, 0, size * 2, size * 2).data
        for (let at = 0; at < pixels.length; at += 4) {
            const [red, green, blue, alpha] = [pixels[at], pixels[at + 1], pixels[at + 2], pixels[at + 3]]
            if (alpha > 0 && (Math.abs(red - green) > 16 || Math.abs(green - blue) > 16)) return true
        }
        return false
    }
    const base = context.measureText('\u{1F600}').width
    // A browser with no color font draws every emoji gray; then only the width tells a missing one.
    const color = colored('\u{1F600}')
    if (base === 0) return Infinity
    const versions = [...new Set(rows.map((row) => row[4]))].filter((version) => version >= 11).sort((a, b) => b - a)
    for (const version of versions) {
        const sample = rows.find((row) => row[4] === version)
        if (sample === undefined) continue
        const width = context.measureText(sample[0]).width
        if (width <= base * 1.5 && (!color || colored(sample[0]))) return version
    }
    return 11
}

function shape(rows: readonly EmojiRow[]): EmojiData {
    const newest = drawnVersion(rows)
    const list: EmojiItem[] = []
    for (const [emoji, name, keywords, group, version, skins] of rows) {
        if (version > newest) continue
        list.push({ emoji, name, keywords, group: EMOJI_GROUPS[group], ...(skins && { skins }) })
    }
    const byEmoji = new Map<string, EmojiItem>()
    for (const item of list) {
        byEmoji.set(item.emoji, item)
        item.skins?.forEach((skin) => byEmoji.set(skin, item))
    }
    return { list, byEmoji }
}

let loading: Promise<EmojiData> | undefined

/**
 * Loads the full emoji list, its English names and keywords, the first time it is asked for, and
 * hands back the same list after. Only emoji the page's fonts can draw are kept.
 */
export function loadEmojiData(): Promise<EmojiData> {
    loading ??= import('../data/emoji-en.json').then(
        (module) => shape(module.default as unknown as EmojiRow[]),
        (error: unknown) => {
            loading = undefined
            throw error
        },
    )
    return loading
}

/** The emoji whose name or keywords hold every word of `query`: those named by it first, then those whose name starts with it, shorter names first. */
export function searchEmoji(list: readonly EmojiItem[], query: string): EmojiItem[] {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    const scored: [EmojiItem, number][] = []
    for (const item of list) {
        const name = item.name.toLowerCase()
        const keywords = item.keywords.map((keyword) => keyword.toLowerCase())
        if (!words.every((word) => name.includes(word) || keywords.some((keyword) => keyword.includes(word)))) continue
        const first = words[0]
        const parts = name.split(/[\s:-]+/)
        const score =
            name === query.toLowerCase().trim()
                ? 0
                : parts.includes(first)
                  ? 1
                  : name.startsWith(first)
                    ? 2
                    : parts.some((part) => part.startsWith(first))
                      ? 3
                      : keywords.some((keyword) => keyword.startsWith(first))
                        ? 4
                        : 5
        scored.push([item, score])
    }
    return scored.sort((a, b) => a[1] - b[1] || a[0].name.length - b[0].name.length).map(([item]) => item)
}

/** The emoji in the chosen skin tone, where it takes one. */
export function inTone(item: EmojiItem, tone: SkinTone): string {
    return tone === 0 || item.skins === undefined ? item.emoji : item.skins[tone - 1]
}
