import type { EChartsCoreOption } from 'echarts/core'

import type { LegendItem } from '../ChartLegend'
import type { Aggregate, Row } from '../data'
import type { ChartLook } from '../look'

/**
 * What a chart draws, read from rows. Which fields each kind reads is said by the kind: most put
 * `x`'s labels along an axis, combine `y` by `aggregate` and split the rows into series by
 * `series`.
 */
export interface ChartSpec {
    /** The rows the chart reads, one record of named fields each. */
    rows: readonly Row[]
    /** The field along the category axis, or the first number for a kind that plots two. */
    x?: string
    /** The field, or fields, whose numbers are drawn. */
    y?: string | readonly string[]
    /** The field that splits the rows into series. */
    series?: string
    /** A third field some kinds read: a point's size, a cell's value, a link's target. */
    value?: string
    /** How the values that fall in one place are combined, or one way for each `y` field in order. */
    aggregate?: Aggregate | readonly Aggregate[]
    /** Bars and areas stacked on each other, or as shares of each category's total. */
    stack?: 'stacked' | 'percent'
    /** Bars running sideways, categories down the side. */
    horizontal?: boolean
    /** Categories in this order first. */
    order?: readonly string[]
    /** Series in this order first. */
    seriesOrder?: readonly string[]
    /** A color token for a series or a category by its name, such as `status-failed`. */
    colors?: Readonly<Record<string, string>>
    /**
     * The color tokens series and categories take in turn where `colors` names none of their own,
     * such as `['kind-teal', 'kind-blue', 'chart-2']`; the theme's order by default. The first is
     * also a heatmap's scale.
     */
    palette?: readonly string[]
    /** How a figure is written in tooltips and labels. */
    format?: (value: number) => string
    /** A unit written after each figure, on the value axis too, such as `s` or `%`, or one for each `y` field in order. */
    unit?: string | readonly string[]
    /** What a field is called where the chart names it, such as a scatter's axes and tooltip; the field's own name where none is given. */
    fieldNames?: Readonly<Record<string, string>>
    /** A line drawn smooth rather than straight between points. */
    smooth?: boolean
    /** Labels every nth category on the category axis, such as every hour of fifteen-minute steps; ECharts picks when omitted. */
    labelEvery?: number
    /** How far apart bars stand: `tight` draws a histogram's tall bars, nearly touching. */
    gap?: 'tight' | 'normal'
    /** How an area is filled: evenly, fading from its line toward the axis, or not at all, leaving a step line or a radar's outlines. */
    fill?: 'solid' | 'gradient' | 'none'
    /** A heatmap's color scale shown beside the grid. */
    showScale?: boolean
    /** A ring's total written in its middle, with this word under it, such as `runs`; under a gauge's figure, the word alone. */
    total?: string
    /** A scatter's axes fitted to its points rather than starting at zero. */
    fit?: boolean
    /** How many bins a histogram splits its numbers into, or how wide each is. */
    bins?: number | { width: number }
    /** Steps along the value axis: a gauge's thresholds, a bullet's qualitative bands. */
    steps?: readonly ChartStep[]
    /** Where the value axis starts, for a kind that fixes it, such as a gauge's dial. */
    min?: number
    /** Where the value axis ends, for a kind that fixes it, such as a gauge's dial. */
    max?: number
    /** The words a chart writes itself, in tooltips and legends. */
    words?: Partial<ChartWords>
    /** The fields from the outermost in, for a kind that nests (boxes, rings) or flows through stages. */
    path?: readonly string[]
    /**
     * How a gauge draws its figure: `arc` (the default) fills an open dial, `ring` a full circle,
     * `half` a half circle low enough for a stat tile, `bands` points at the figure over an arc in its
     * steps' colors, and `needle` swings a needle over a scale with ticks.
     */
    dial?: GaugeDial
    /**
     * Whether a linked chart's panels share one value scale, so a panel's height compares with the
     * others': `shared` by default where `series` splits one measure into panels, `own` by default
     * where each panel is a `y` field of its own, as rain in millimeters beside flow in cubic meters.
     */
    scales?: 'shared' | 'own'
    /** How each panel of a linked chart is drawn, by the name of its `y` field or series. */
    panels?: Readonly<Record<string, LinkedPanel>>
    /**
     * The part of a linked chart's shared axis in view at first: from and to in percent of it, such
     * as `[60, 100]`, or the first and last category in view, such as `['Aug 1', 'Aug 31']`.
     */
    zoom?: readonly [number, number] | readonly [string, string]
    /**
     * The stack each series joins, by its name: series that share one are drawn on top of each
     * other, and a series named in none stands alone, or joins the one stack `stack` draws.
     */
    stacks?: Readonly<Record<string, string>>
    /** Series drawn as a thin dashed line with no area or points: a reference, such as a target or the period before. */
    dashed?: readonly string[]
    /** How a two-axis chart draws each series or `y` field, by its name: bars or a line, on the left axis or the right. */
    layers?: Readonly<Record<string, ChartLayer>>
    /**
     * A two-axis chart's value axes: each one's name, unit, format and range. A chart of one value
     * axis reads the unit of `left` for its ticks, whichever way the axis runs.
     */
    axes?: Readonly<{ left?: ChartAxis; right?: ChartAxis }>
    /** Where each spoke of a radar ends, by its category's name, in place of the one scale `max` sets. */
    rims?: Readonly<Record<string, number>>
    /** A radar's rings drawn as circles rather than polygons. */
    round?: boolean
    /** How many rings a radar's scale is drawn with; 4 by default. */
    levels?: number
    /**
     * The color tokens a heatmap's scale runs through: one shades from the card to it, several are
     * stepped through in turn. `colors.value` or the palette's first by default.
     */
    scale?: string | readonly string[]
    /** A gauge's figure written at the small figure size, for a dial in a small box. */
    small?: boolean
}

/** How a two-axis chart draws one series; see `ChartSpec.layers`. */
export interface ChartLayer {
    /** Bars or a line; the first series is bars and the rest lines by default. */
    mark?: 'bar' | 'line'
    /** The value axis it is measured on; the first series is on the left and the rest on the right by default. */
    axis?: 'left' | 'right'
}

/** One value axis of a two-axis chart; see `ChartSpec.axes`. */
export interface ChartAxis {
    /** What the axis measures, written over it. */
    name?: string
    /** A unit written after its ticks, in place of the spec's, and after its figures where its `format` does not write them. */
    unit?: string
    /** How its figures are written in tooltips, unit and all, in place of the spec's `format`. */
    format?: (value: number) => string
    min?: number
    max?: number
}

/** The shapes a gauge's dial takes; see `ChartSpec.dial`. */
export type GaugeDial = 'arc' | 'ring' | 'half' | 'bands' | 'needle'

/** How one panel of a linked chart is drawn. */
export interface LinkedPanel {
    /** Bars, a line, or a line with the area under it filled; a line by default. */
    mark?: 'bar' | 'line' | 'area'
    /** The panel hangs from its top: its value axis runs down from zero, as rainfall hangs over a river's flow. */
    hang?: boolean
    /** The panel's share of the height against the others', 1 by default, so a panel of 2 is twice as tall as one of 1. */
    weight?: number
}

/**
 * Builds a kind's ECharts option from the spec and the theme's look. `hidden` names what the
 * frame's legend hides, for a kind whose legend lists what ECharts cannot hide by a series' name.
 */
export type ChartBuilder = (spec: ChartSpec, look: ChartLook, hidden?: ReadonlySet<string>) => EChartsCoreOption

/**
 * A kind of chart: `build` draws it, and `legend` lists what a frame's legend shows for it where
 * that is not one entry per series, such as a ring's slices or a tree's top branches.
 */
export interface ChartKindDef {
    build: ChartBuilder
    legend?: (spec: ChartSpec) => LegendItem[]
}

/** The `index`th token of the spec's palette, or undefined where it gives none. */
export function paletteToken(spec: ChartSpec, index: number): string | undefined {
    const palette = spec.palette
    return palette === undefined || palette.length === 0 ? undefined : palette[index % palette.length]
}

/** A legend entry's color: the token the spec names for it, or the next in the spec's palette or the theme's order. */
export function legendColor(spec: ChartSpec, name: string, index: number, order: readonly string[]): string {
    return `var(--${spec.colors?.[name] ?? paletteToken(spec, index) ?? order[index % order.length]})`
}

/** A series' color: the token the spec names for it, or the next in the spec's palette or the theme's order. */
export function colorOf(spec: ChartSpec, look: ChartLook, name: string, index: number): string {
    const token = spec.colors?.[name] ?? paletteToken(spec, index)
    return token === undefined ? look.series[index % look.series.length] : look.token(token)
}

/**
 * One step of a scale, from its `value` up to the next step's: a gauge's threshold or a bullet's
 * band. The first step's `value` is ignored, so it starts where the axis starts.
 */
export interface ChartStep {
    value?: number
    /** A color token; a bullet's bands without one are shades of gray, darkest first. */
    color?: string
    /** What the step means, such as `Poor`, shown in the legend. */
    label?: string
}

/** The words a chart writes itself, beside the names its rows give. */
export interface ChartWords {
    count: string
    total: string
    rise: string
    fall: string
    change: string
    low: string
    lower: string
    median: string
    upper: string
    high: string
    outlier: string
    ofFirst: string
    target: string
}

const WORDS: ChartWords = {
    count: 'Count',
    total: 'Total',
    rise: 'Rise',
    fall: 'Fall',
    change: 'Change',
    low: 'Low',
    lower: 'Lower quartile',
    median: 'Median',
    upper: 'Upper quartile',
    high: 'High',
    outlier: 'Outlier',
    ofFirst: 'of first',
    target: 'Target',
}

/** The spec's words over the English defaults. */
export const wordsOf = (spec: ChartSpec): ChartWords => ({ ...WORDS, ...spec.words })

/** What a measured field is called in a tooltip: its name from `fieldNames`, the field itself, or the count word where rows are counted. */
export const measureName = (spec: ChartSpec, field: string | undefined): string =>
    field === undefined ? wordsOf(spec).count : (spec.fieldNames?.[field] ?? field)

/** The unit written after the `index`th `y` field's figures. */
export function unitAt(spec: ChartSpec, index = 0): string {
    if (spec.unit === undefined) return ''
    return typeof spec.unit === 'string' ? spec.unit : (spec.unit[index] ?? '')
}

/** The `y` fields as a list. */
export const fieldsOf = (spec: ChartSpec): string[] => (spec.y === undefined ? [] : typeof spec.y === 'string' ? [spec.y] : [...spec.y])

/** The stack a series joins: the one `stacks` names for it, or the one stack `stack` draws. */
export const stackOf = (spec: ChartSpec, name: string): string | undefined =>
    spec.stacks?.[name] ?? (spec.stack === undefined ? undefined : 'all')

/** Whether a series is drawn dashed, as a reference. */
export const isDashed = (spec: ChartSpec, name: string): boolean => spec.dashed?.includes(name) === true
