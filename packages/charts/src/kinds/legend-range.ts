import type { LegendItem } from '../ChartLegend'
import { SERIES_ORDER } from '../look'
import { spread } from '../shapes'
import { legendColor, type ChartSpec } from './spec'

/** The spread a range chart draws, from its x, y and series fields. */
export function spreadOf(spec: ChartSpec) {
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

/** A range chart's legend: its series, each with its middle line's figures. */
export function rangeLegend(spec: ChartSpec): LegendItem[] {
    return spreadOf(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.middle,
    }))
}
