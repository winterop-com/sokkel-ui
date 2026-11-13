import type { LegendItem } from '../ChartLegend'
import { asShares, distinct, pivot } from '../data'
import { SERIES_ORDER, tokenColor } from '../look'
import { legendColor, type ChartSpec } from './spec'

/** The rows as categories and series, as shares when the spec stacks them to 100%. */
export function shaped(spec: ChartSpec) {
    if (spec.x === undefined) throw new Error('This chart needs an x field.')
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    return spec.stack === 'percent' ? { ...data, series: asShares(data.series) } : data
}

/** One entry per series in the color the chart gives it, with its figures: the legend of a kind that lists nothing else. */
export function seriesLegend(spec: ChartSpec): LegendItem[] {
    if (spec.x === undefined) return []
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    return data.series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}

/** A ring's legend: its slices, each with its figure. */
export function donutLegend(spec: ChartSpec): LegendItem[] {
    const { categories, series } = shaped(spec)
    return categories.map((name, index) => ({
        key: name,
        label: name,
        color: legendColor(spec, name, index, SERIES_ORDER),
        values: [series[0]?.values[index] ?? null],
    }))
}

/** A funnel's stages in order with their figures, and each one's share of the first, in percent. */
export function funnelStages(spec: ChartSpec) {
    const { categories, series } = shaped({ ...spec, series: undefined, stack: undefined })
    const values = (series[0]?.values ?? []).map((value) => value ?? 0)
    const first = values[0] ?? 0
    return categories.map((name, index) => ({ name, value: values[index], share: first === 0 ? 0 : (values[index] / first) * 100 }))
}

/** A funnel stage's color as CSS: the token `colors` names for it, or the first series color fading with each stage. */
export function stageColor(spec: ChartSpec, name: string, index: number, count: number): string {
    const token = spec.colors?.[name]
    if (token !== undefined) return tokenColor(token)
    const strength = count <= 1 ? 80 : Math.round(80 - (45 * index) / (count - 1))
    return `color-mix(in oklab, var(--${SERIES_ORDER[0]}) ${String(strength)}%, var(--card))`
}

/** A funnel's legend: its stages, each with its figure. */
export function funnelLegend(spec: ChartSpec): LegendItem[] {
    const list = funnelStages(spec)
    return list.map((stage, index) => ({
        key: stage.name,
        label: stage.name,
        color: stageColor(spec, stage.name, index, list.length),
        values: [stage.value],
    }))
}

/** A scatter's or a parallel chart's legend: its groups of `series`, or one for all. */
export function scatterLegend(spec: ChartSpec): LegendItem[] {
    const groups = spec.series === undefined ? ['All'] : distinct(spec.rows, spec.series, spec.seriesOrder)
    return groups.map((name, index) => ({ key: name, label: name, color: legendColor(spec, name, index, SERIES_ORDER) }))
}

/** A rose's legend: its groups of `series`, or none where it draws one. */
export function roseLegend(spec: ChartSpec): LegendItem[] {
    const { series } = shaped({ ...spec, stack: undefined })
    if (series.length <= 1) return []
    return series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}
