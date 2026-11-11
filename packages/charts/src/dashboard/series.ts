import type { LegendItem } from '../ChartLegend'
import type { ChartSpec } from '../kinds'
import { SERIES_ORDER } from '../look'
import { formatValue, tokenVar } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** One series of a dashboard chart panel. `name` names it in the legend, the tooltip and `hidden`. */
export interface PanelSeries {
    name: string
    values: readonly (number | null)[]
    /** A color token's name; series take the categorical order when omitted. */
    color?: string
    /** Series with the same stack are drawn on top of each other. */
    stack?: string
    /** A dashed line, for a reference such as a target or the previous period. */
    dashed?: boolean
}

/** The token a series is drawn in. */
export const seriesToken = (series: PanelSeries, index: number) => series.color ?? SERIES_ORDER[index % SERIES_ORDER.length]

/** The legend items for a panel's series. */
export const legendItems = (series: readonly PanelSeries[]): LegendItem[] =>
    series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: tokenVar(seriesToken(entry, index)),
        values: entry.values.map((value) => value ?? undefined),
    }))

/** Writes a value with its unit, by `format` when given. */
export function valueWriter(unit = '', decimals?: number, format?: (value: number) => string): (value: number) => string {
    return (value) => (format !== undefined ? format(value) : `${formatValue(value, decimals)}${unit}`)
}

/**
 * How a panel's figures are written, as a chart's spec says it: by `format` alone when given, or to
 * `decimals` with the unit after; the value axis' ticks carry the unit either way.
 */
export function panelFormat(
    unit?: string,
    decimals?: number,
    format?: (value: number) => string,
): Pick<ChartSpec, 'format' | 'unit' | 'axes'> {
    if (format === undefined) return { format: (value) => formatValue(value, decimals), unit }
    return { format, ...(unit === undefined ? {} : { axes: { left: { unit } } }) }
}

/** The field of a panel's rows each category is in. */
export const CATEGORY = 'category'
/** The field of a panel's rows each series is named in. */
export const SERIES = 'series'
/** The field of a panel's rows each figure is in. */
export const FIGURE = 'value'

/**
 * The categories, each repeat of a label made its own by trailing zero-width spaces, which read the
 * same. A chart finds a figure's place by its category's name, so times written coarser than their
 * steps ("19:32" six times over a minute) would otherwise share one place and leave the rest empty.
 */
function distinctCategories(x: readonly string[]): string[] {
    const seen = new Map<string, number>()
    return x.map((category) => {
        const times = seen.get(category) ?? 0
        seen.set(category, times + 1)
        return times === 0 ? category : `${category}${'\u200b'.repeat(times)}`
    })
}

/**
 * A panel's series as the rows and fields a `Chart` reads: a row per category and series, the
 * categories and series in their order, each series in its color, its stack and dashed as it says.
 */
export function seriesSpec(x: readonly string[], series: readonly PanelSeries[]): ChartSpec {
    const stacks = series.filter((entry) => entry.stack !== undefined).map((entry) => [entry.name, entry.stack ?? ''])
    const dashed = series.filter((entry) => entry.dashed === true).map((entry) => entry.name)
    const categories = distinctCategories(x)
    return {
        rows: series.flatMap((entry) =>
            categories.map((category, index) => ({ [CATEGORY]: category, [SERIES]: entry.name, [FIGURE]: entry.values[index] ?? null })),
        ),
        x: CATEGORY,
        y: FIGURE,
        series: SERIES,
        order: categories,
        seriesOrder: series.map((entry) => entry.name),
        colors: Object.fromEntries(series.map((entry, index) => [entry.name, seriesToken(entry, index)])),
        ...(stacks.length === 0 ? {} : { stacks: Object.fromEntries(stacks) }),
        ...(dashed.length === 0 ? {} : { dashed }),
    }
}
