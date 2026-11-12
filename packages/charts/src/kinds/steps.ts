import { SERIES_ORDER, tooltipMarkup } from '../look'
import { spread } from '../shapes'
import { area, edgeAxis, line, valueTicks, written } from './categories'
import { colorOf, legendColor, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/**
 * A line that holds each figure flat until the next category, then steps: for a level that changes
 * at moments rather than drifting, such as workers in a pool or a limit. It reads what a line
 * reads: `x` along, `y` combined by `aggregate`, `series` split into lines, and `stack`; `fill`
 * fills the area under it, evenly or fading.
 */
export const step: ChartBuilder = (spec, look) => {
    const option = (spec.fill === undefined || spec.fill === 'none' ? line : area)({ ...spec, smooth: false }, look)
    const series = (option.series ?? []) as Record<string, unknown>[]
    return { ...option, series: series.map((entry) => ({ ...entry, step: 'end' })) }
}

/** The spread a range chart draws, from its x, y and series fields. */
function spreadOf(spec: ChartSpec) {
    if (spec.x === undefined || spec.y === undefined) throw new Error('A range chart needs x and y fields.')
    return spread({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
}

/**
 * A band with a line through it, per category along `x`: with one `y` field the band runs from
 * the 10th to the 90th percentile of its values and the line through their median; with three,
 * from the first to the last, the middle one drawn as the line, each combined by `aggregate`.
 * `series` draws a band and line for each of a field's labels, in its color.
 */
export const range: ChartBuilder = (spec, look) => {
    const { categories, series } = spreadOf(spec)
    const gap = (low: number | null, high: number | null) => (low === null || high === null ? null : high - low)
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line' },
            formatter: (points: { dataIndex: number; seriesName: string; seriesIndex: number; color: string }[]) => {
                const index = points[0]?.dataIndex ?? 0
                const shown = series.filter((entry) => points.some((point) => point.seriesName === entry.name))
                return tooltipMarkup(
                    categories[index] ?? '',
                    shown.map((entry) => ({
                        label: entry.name,
                        value: `${written(spec, entry.middle[index])} (${written({ ...spec, unit: '' }, entry.low[index])} to ${written({ ...spec, unit: '' }, entry.high[index])})`,
                        color: colorOf(spec, look, entry.name, series.indexOf(entry)),
                    })),
                )
            },
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: edgeAxis(spec, categories),
        yAxis: { type: 'value', scale: true, ...valueTicks(spec) },
        series: series.flatMap((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            const band = {
                type: 'line',
                name: entry.name,
                stack: `band-${String(index)}`,
                stackStrategy: 'all',
                symbol: 'none',
                silent: true,
                smooth: spec.smooth === true,
            }
            return [
                { ...band, data: entry.low, lineStyle: { opacity: 0 }, itemStyle: { color } },
                {
                    ...band,
                    data: entry.low.map((low, at) => gap(low, entry.high[at])),
                    lineStyle: { opacity: 0 },
                    itemStyle: { color },
                    areaStyle: { color, opacity: 0.18 },
                },
                {
                    type: 'line',
                    name: entry.name,
                    data: entry.middle,
                    smooth: spec.smooth === true,
                    itemStyle: { color },
                    lineStyle: { color, width: 1.5 },
                },
            ]
        }),
    }
}

/** A range chart's legend: one entry per band, with its middle line's figures. */
export function rangeLegend(spec: ChartSpec): LegendItem[] {
    return spreadOf(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.middle,
    }))
}
