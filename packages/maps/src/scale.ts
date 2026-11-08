/** One category of a categorical scale: the value it matches, what it is called, and its color. */
export interface ScaleCategory {
    value: string | number
    label: string
    /** Any CSS color, a token included. */
    color: string
}

/** Values matched to named categories, each in its own color. */
export interface CategoricalScale {
    kind: 'categorical'
    categories: ScaleCategory[]
}

/**
 * Numbers sorted into classes by ascending breaks: a value below `breaks[0]` takes the first
 * color, a value at or above the last break the last, so there is one more color than breaks.
 */
export interface SequentialScale {
    kind: 'sequential'
    breaks: number[]
    colors: string[]
    format: (value: number) => string
}

/** A sequential scale whose colors run out in two hues from a neutral midpoint. */
export interface DivergingScale {
    kind: 'diverging'
    breaks: number[]
    colors: string[]
    midpoint: number
    format: (value: number) => string
}

export type ColorScale = CategoricalScale | SequentialScale | DivergingScale

/** The ground of an area with no value, which a hatch is drawn over. */
export const NO_DATA_COLOR = 'var(--muted)'

/** The hatch over an area with no value. */
export const NO_DATA_HATCH = 'color-mix(in oklab, var(--muted-foreground) 55%, var(--muted))'

/** The no-data hatch as a CSS background, matching the pattern the map draws. */
export const NO_DATA_BACKGROUND = `repeating-linear-gradient(135deg, ${NO_DATA_HATCH} 0 1px, transparent 1px 4px), ${NO_DATA_COLOR}`

/** The color of a point with no value. */
export const NO_DATA_POINT_COLOR = 'color-mix(in oklab, var(--muted-foreground) 60%, var(--card))'

/** The selected feature's color: a hue of its own, apart from any data color. */
export const SELECTION_COLOR = 'var(--map-selection)'

/** The color of what is highlighted with the selection, such as the areas and points under it. */
export const HIGHLIGHT_COLOR = 'var(--map-highlight)'

/** The ground plain areas are filled toward, and the line between them. */
export const AREA_COLOR = 'var(--muted-foreground)'
export const AREA_LINE = 'color-mix(in oklab, var(--muted-foreground) 70%, var(--card))'

/** How much of its color a plain area's fill carries at each emphasis, over whatever lies under it. */
export const AREA_FILL = { selected: 0.3, highlighted: 0.16, plain: 0.07 } as const

/** One emphasis as a legend draws it: the fill over the card and the edge around it. */
export interface Emphasis {
    color: string
    edge: string
}

const over = (color: string, share: number) => `color-mix(in oklab, ${color} ${Math.round(share * 100)}%, var(--card))`

/**
 * How plain boundaries draw the selected area, the areas highlighted with it and the rest, for a
 * `MapLegend` whose `entries` key them in the same colors the map paints.
 */
export const AREA_EMPHASIS: Record<'selected' | 'highlighted' | 'plain', Emphasis> = {
    selected: { color: over(SELECTION_COLOR, AREA_FILL.selected), edge: SELECTION_COLOR },
    highlighted: { color: over(HIGHLIGHT_COLOR, AREA_FILL.highlighted), edge: HIGHLIGHT_COLOR },
    plain: { color: over(AREA_COLOR, AREA_FILL.plain), edge: AREA_LINE },
}

/** The categorical colors, in the order categories take them. */
export const CATEGORY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function defaultFormat(value: number): string {
    return NUMBER.format(value)
}

/**
 * A step `t` from 0 to 1 along a ramp of one hue: from near the card color, through the hue, and
 * on toward the foreground, so a higher class always stands further from the ground in both schemes.
 */
function ramp(hue: string, t: number): string {
    if (t <= 0.7) return `color-mix(in oklab, ${hue} ${Math.round(26 + (74 * t) / 0.7)}%, var(--card))`
    return `color-mix(in oklab, ${hue}, var(--foreground) ${Math.round((35 * (t - 0.7)) / 0.3)}%)`
}

/** The class a diverging scale centers on. */
const NEUTRAL = 'color-mix(in oklab, var(--muted-foreground) 36%, var(--card))'

/** A categorical scale; a category without a color takes the next chart color. */
export function categoricalScale(categories: (Omit<ScaleCategory, 'color'> & { color?: string })[]): CategoricalScale {
    return {
        kind: 'categorical',
        categories: categories.map((category, index) => ({
            ...category,
            color: category.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        })),
    }
}

/**
 * A sequential scale over ascending breaks, ramped in one hue (a chart token by default), or drawn
 * in `colors`, one per class, such as the good, warning and critical steps of a threshold scale.
 */
export function sequentialScale({
    breaks,
    hue = 'var(--chart-2)',
    colors,
    format = defaultFormat,
}: {
    breaks: number[]
    hue?: string
    /** One color per class, one more than the breaks, in place of the ramp. */
    colors?: string[]
    format?: (value: number) => string
}): SequentialScale {
    const count = breaks.length + 1
    if (colors !== undefined && colors.length !== count) throw new Error(`A scale of ${count} classes needs ${count} colors.`)
    return {
        kind: 'sequential',
        breaks,
        colors: colors ?? Array.from({ length: count }, (_, index) => ramp(hue, count === 1 ? 1 : index / (count - 1))),
        format,
    }
}

/**
 * A diverging scale over ascending breaks: classes below the midpoint ramp in `low`, classes above
 * it in `high`, and a class that holds the midpoint is neutral.
 */
export function divergingScale({
    breaks,
    midpoint = 0,
    low = 'var(--chart-2)',
    high = 'var(--chart-5)',
    format = defaultFormat,
}: {
    breaks: number[]
    midpoint?: number
    low?: string
    high?: string
    format?: (value: number) => string
}): DivergingScale {
    const count = breaks.length + 1
    const lower = (index: number) => (index === 0 ? -Infinity : breaks[index - 1])
    const upper = (index: number) => (index === count - 1 ? Infinity : breaks[index])
    const below = Array.from({ length: count }, (_, index) => index).filter((index) => upper(index) <= midpoint)
    const above = Array.from({ length: count }, (_, index) => index).filter((index) => lower(index) >= midpoint)
    const colors = Array.from({ length: count }, (_, index) => {
        const side = below.indexOf(index)
        if (side !== -1) return ramp(low, 0.25 + (0.75 * (below.length - side)) / below.length)
        const across = above.indexOf(index)
        if (across !== -1) return ramp(high, 0.25 + (0.75 * (across + 1)) / above.length)
        return NEUTRAL
    })
    return { kind: 'diverging', breaks, colors, midpoint, format }
}

/** The class a value falls in, or null for no data. */
export function classOf(scale: ColorScale, value: unknown): number | null {
    if (value === null || value === undefined) return null
    if (scale.kind === 'categorical') {
        const index = scale.categories.findIndex((category) => category.value === value)
        return index === -1 ? null : index
    }
    if (typeof value !== 'number' || Number.isNaN(value)) return null
    let index = 0
    while (index < scale.breaks.length && value >= scale.breaks[index]) index += 1
    return index
}

/** Every class color of a scale, in class order. */
export function scaleColors(scale: ColorScale): string[] {
    return scale.kind === 'categorical' ? scale.categories.map((category) => category.color) : scale.colors
}

/** The color a value is drawn in, or null for no data. */
export function colorOf(scale: ColorScale, value: unknown): string | null {
    const index = classOf(scale, value)
    return index === null ? null : scaleColors(scale)[index]
}

/** How many of the values fall in each class, in class order, and how many have no data. */
export function classCounts(scale: ColorScale, values: readonly unknown[]): { counts: number[]; noData: number } {
    const counts = scaleColors(scale).map(() => 0)
    let noData = 0
    for (const value of values) {
        const index = classOf(scale, value)
        if (index === null) noData += 1
        else counts[index] += 1
    }
    return { counts, noData }
}

/** Each class written out: "Below 200", "200 – 260", "380 and above", or a category's label. */
export function classLabels(scale: ColorScale): string[] {
    if (scale.kind === 'categorical') return scale.categories.map((category) => category.label)
    const { breaks, format } = scale
    if (breaks.length === 0) return ['All values']
    return [
        `Below ${format(breaks[0])}`,
        ...breaks.slice(1).map((value, index) => `${format(breaks[index])} – ${format(value)}`),
        `${format(breaks[breaks.length - 1])} and above`,
    ]
}
