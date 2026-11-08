import { pivot } from './data'
import type { LegendItem } from './ChartLegend'
import { KINDS, type ChartKind, type ChartKindDef, type ChartSpec } from './kinds'
import { legendColor } from './kinds/spec'
import { SERIES_ORDER } from './look'

/**
 * The legend a `ChartFrame` shows for a chart of this spec: one entry per series in the color the
 * chart gives it, with its figures for the frame's table mode, or what the kind lists instead. It
 * reads every kind at once, so it has a module of its own: a page that draws charts without it
 * fetches the kinds with the first chart instead of with the page.
 */
export function chartLegend(kind: ChartKind, spec: ChartSpec): LegendItem[] {
    const own: ChartKindDef = KINDS[kind]
    if (own.legend !== undefined) return own.legend(spec)
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
