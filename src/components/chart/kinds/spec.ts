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
    /** How an area is filled: evenly, or fading from its line toward the axis. */
    fill?: 'solid' | 'gradient'
    /** A heatmap's color scale shown beside the grid. */
    showScale?: boolean
    /** A ring's total written in its middle, with this word under it, such as `runs`. */
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

/** A legend entry's color: the token the spec names for it, or the next in the theme's order. */
export function legendColor(spec: ChartSpec, name: string, index: number, order: readonly string[]): string {
    return `var(--${spec.colors?.[name] ?? order[index % order.length]})`
}

/** A series' color: the token the spec names for it, or the next in the theme's order. */
export function colorOf(spec: ChartSpec, look: ChartLook, name: string, index: number): string {
    const token = spec.colors?.[name]
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

/** The unit written after the `index`th `y` field's figures. */
export function unitAt(spec: ChartSpec, index = 0): string {
    if (spec.unit === undefined) return ''
    return typeof spec.unit === 'string' ? spec.unit : (spec.unit[index] ?? '')
}

/** The `y` fields as a list. */
export const fieldsOf = (spec: ChartSpec): string[] => (spec.y === undefined ? [] : typeof spec.y === 'string' ? [spec.y] : [...spec.y])
