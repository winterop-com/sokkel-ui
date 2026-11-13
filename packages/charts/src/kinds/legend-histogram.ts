import type { LegendItem } from '../ChartLegend'
import { asShares, distinct, formatNumber, labelOf, numberOf } from '../data'
import { SERIES_ORDER } from '../look'
import { binCounts, binsFor, type Bins } from '../stats'
import { legendColor, unitAt, wordsOf, type ChartSpec } from './spec'

/** A histogram's `x` numbers in bins, counted per group of `series`, and each bin's label. */
export function binned(spec: ChartSpec) {
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

/** A histogram's legend: its groups, each with its counts. */
export function histogramLegend(spec: ChartSpec): LegendItem[] {
    return binned(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}
