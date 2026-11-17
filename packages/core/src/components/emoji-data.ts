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

/** The data set's group numbers, as `emojibase-data` writes them; 2, the skin tone components, is left out. */
const GROUP_OF: Record<number, EmojiGroup> = {
    0: 'smileys',
    1: 'people',
    3: 'animals',
    4: 'food',
    5: 'travel',
    6: 'activities',
    7: 'objects',
    8: 'symbols',
    9: 'flags',
}

interface RawSkin {
    emoji: string
    tone?: number | number[]
}

interface RawEmoji {
    label: string
    emoji: string
    tags?: string[]
    group?: number
    order?: number
    version: number
    skins?: RawSkin[]
}

/** The newest emoji version the page's fonts draw: a sample of each version is drawn on a canvas and kept when it draws as one colored glyph. */
function drawnVersion(raw: readonly RawEmoji[]): number {
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
    const versions = [...new Set(raw.map((item) => item.version))].filter((version) => version >= 11).sort((a, b) => b - a)
    for (const version of versions) {
        const sample = raw.find((item) => item.version === version && item.group !== undefined && item.group !== 2)
        if (sample === undefined) continue
        const width = context.measureText(sample.emoji).width
        if (width <= base * 1.5 && (!color || colored(sample.emoji))) return version
    }
    return 11
}

function shape(raw: readonly RawEmoji[]): EmojiData {
    const newest = drawnVersion(raw)
    const list: EmojiItem[] = []
    const order = new Map<EmojiItem, number>()
    for (const item of raw) {
        const group = item.group === undefined ? undefined : GROUP_OF[item.group]
        if (group === undefined || item.version > newest) continue
        const tones = new Map<number, string>()
        for (const skin of item.skins ?? []) if (typeof skin.tone === 'number') tones.set(skin.tone, skin.emoji)
        const skins = tones.size === 5 ? [1, 2, 3, 4, 5].map((tone) => tones.get(tone) ?? item.emoji) : undefined
        const shaped: EmojiItem = { emoji: item.emoji, name: item.label, keywords: item.tags ?? [], group, ...(skins && { skins }) }
        order.set(shaped, item.order ?? 0)
        list.push(shaped)
    }
    list.sort((a, b) => EMOJI_GROUPS.indexOf(a.group) - EMOJI_GROUPS.indexOf(b.group) || (order.get(a) ?? 0) - (order.get(b) ?? 0))
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
    loading ??= import('emojibase-data/en/data.json').then(
        (module) => shape((module as unknown as { default: RawEmoji[] }).default),
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
