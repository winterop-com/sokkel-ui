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
    rows: readonly Row[]
    /** The field along the category axis, or the first number for a kind that plots two. */
    x?: string
    /** The field, or fields, whose numbers are drawn. */
    y?: string | readonly string[]
    /** The field that splits the rows into series. */
    series?: string
    /** A third field some kinds read: a point's size, a cell's value, a link's target. */
    value?: string
    aggregate?: Aggregate
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
    /** A unit written after each figure, such as `s` or `%`. */
    unit?: string
    /** A line drawn smooth rather than straight between points. */
    smooth?: boolean
}

/** Builds a kind's ECharts option from the spec and the theme's look. */
export type ChartBuilder = (spec: ChartSpec, look: ChartLook) => EChartsCoreOption

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
