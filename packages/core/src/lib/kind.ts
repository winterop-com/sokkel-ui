/** The categorical colors a label, a calendar or a person can wear, each a theme's kind token. */
export type KindColor = 'blue' | 'green' | 'jade' | 'pink' | 'teal' | 'violet'

export const KIND_COLORS: readonly KindColor[] = ['blue', 'violet', 'green', 'pink', 'teal', 'jade']

/** The color as a solid fill: a dot, a swatch, an event's edge. */
export const KIND_FILL: Record<KindColor, string> = {
    blue: 'bg-kind-blue',
    green: 'bg-kind-green',
    jade: 'bg-kind-jade',
    pink: 'bg-kind-pink',
    teal: 'bg-kind-teal',
    violet: 'bg-kind-violet',
}

/** The color as a faint wash with its ink on it: a chip, an event block. */
export const KIND_WASH: Record<KindColor, string> = {
    blue: 'bg-kind-blue/15 text-kind-blue-ink',
    green: 'bg-kind-green/15 text-kind-green-ink',
    jade: 'bg-kind-jade/15 text-kind-jade-ink',
    pink: 'bg-kind-pink/15 text-kind-pink-ink',
    teal: 'bg-kind-teal/15 text-kind-teal-ink',
    violet: 'bg-kind-violet/15 text-kind-violet-ink',
}

/** The color as a chip: the wash with its ink, edged faintly in the color, for a categorical value such as a kind. */
export const KIND_CHIP: Record<KindColor, string> = {
    blue: 'border-kind-blue/30 bg-kind-blue/12 text-kind-blue-ink',
    green: 'border-kind-green/30 bg-kind-green/12 text-kind-green-ink',
    jade: 'border-kind-jade/30 bg-kind-jade/12 text-kind-jade-ink',
    pink: 'border-kind-pink/30 bg-kind-pink/12 text-kind-pink-ink',
    teal: 'border-kind-teal/30 bg-kind-teal/12 text-kind-teal-ink',
    violet: 'border-kind-violet/30 bg-kind-violet/12 text-kind-violet-ink',
}

/** The color's ink, for words in the color on a neutral ground. */
export const KIND_INK: Record<KindColor, string> = {
    blue: 'text-kind-blue-ink',
    green: 'text-kind-green-ink',
    jade: 'text-kind-jade-ink',
    pink: 'text-kind-pink-ink',
    teal: 'text-kind-teal-ink',
    violet: 'text-kind-violet-ink',
}

/** The color as an edge: the bar at an event block's start. */
export const KIND_EDGE: Record<KindColor, string> = {
    blue: 'border-kind-blue',
    green: 'border-kind-green',
    jade: 'border-kind-jade',
    pink: 'border-kind-pink',
    teal: 'border-kind-teal',
    violet: 'border-kind-violet',
}

/** A color picked steadily from a name, so the same person or label always wears the same one. */
export function kindOf(name: string): KindColor {
    let hash = 0
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    return KIND_COLORS[hash % KIND_COLORS.length]
}
