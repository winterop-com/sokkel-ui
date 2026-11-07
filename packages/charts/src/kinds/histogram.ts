import { asShares, distinct, formatNumber, labelOf, numberOf } from '../data'
import { SERIES_ORDER, tooltipMarkup, withAlpha } from '../look'
import { binCounts, binsFor, type Bins } from '../stats'
import { colorOf, legendColor, unitAt, wordsOf, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/** The rows' `x` numbers in bins, counted per group of `series`, and each bin's label. */
function binned(spec: ChartSpec) {
    const x = spec.x
    if (x === undefined) throw new Error('A histogram needs an x field.')
    const numbers = (rows: readonly ChartSpec['rows'][number][]) =>
        rows.map((row) => numberOf(row[x])).filter((value): value is number => value !== null)
    const bins: Bins = binsFor(numbers(spec.rows), spec.bins)
    const write = (value: number) => (spec.format ?? formatNumber)(value)
    const labels = Array.from({ length: bins.count }, (_, index) => {
        const from = bins.start + index * bins.width
        return `${write(from)}–${write(from + bins.width)}${unitAt(spec)}`
    })
    const groups = spec.series === undefined ? [wordsOf(spec).count] : distinct(spec.rows, spec.series, spec.seriesOrder)
    const series = groups.map((name) => ({
        name,
        values: binCounts(
            numbers(spec.series === undefined ? spec.rows : spec.rows.filter((row) => labelOf(row[spec.series as string]) === name)),
            bins,
        ) as (number | null)[],
    }))
    return { labels, series: spec.stack === 'percent' ? asShares(series) : series }
}

/**
 * The spread of one number: `x` split into equal bins on round edges, each bar how many rows fall
 * in it. `bins` sets how many bins there are, or how wide each is. Groups of `series` are overlaid,
 * see-through, or stacked with `stack`, or shown as shares of each bin with `stack: 'percent'`.
 * Reads `x`, `series`, `seriesOrder`, `bins`, `stack`, `colors`, `format` and `unit`.
 */
export const histogram: ChartBuilder = (spec, look) => {
    const { labels, series } = binned(spec)
    const overlaid = spec.stack === undefined && series.length > 1
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (points: { axisValueLabel: string; seriesName: string; value: number | null; color: string }[]) =>
                tooltipMarkup(
                    points[0]?.axisValueLabel ?? '',
                    points.map((point) => ({
                        label: point.seriesName,
                        value: spec.stack === 'percent' ? `${(point.value ?? 0).toFixed(1)}%` : formatNumber(point.value ?? 0),
                        color: point.color,
                    })),
                ),
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: { type: 'category', data: labels, axisLabel: { hideOverlap: true } },
        yAxis: spec.stack === 'percent' ? { type: 'value', max: 100 } : { type: 'value', minInterval: 1 },
        series: series.map((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            return {
                type: 'bar',
                name: entry.name,
                // An empty bin draws nothing, rather than a bar of no height with an edge.
                data: entry.values.map((value) => (value === 0 ? null : value)),
                stack: spec.stack === undefined ? undefined : 'all',
                barGap: overlaid ? '-100%' : undefined,
                barCategoryGap: '6%',
                barMaxWidth: '100%',
                itemStyle: {
                    color: overlaid ? withAlpha(color, 0.45) : color,
                    borderColor: overlaid ? color : look.card,
                    borderWidth: overlaid || spec.stack !== undefined ? 1 : 0,
                    borderRadius: spec.stack === undefined || index === series.length - 1 ? [look.corner, look.corner, 0, 0] : 0,
                },
            }
        }),
    }
}

/** A histogram's legend: one entry per group, with its count in each bin. */
export function histogramLegend(spec: ChartSpec): LegendItem[] {
    return binned(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}
