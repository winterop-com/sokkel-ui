import type { LegendItem } from '../ChartLegend'
import { aggregate, aggregateAt, distinct, labelOf, numberOf } from '../data'
import { SERIES_ORDER } from '../look'
import { fieldsOf, legendColor, wordsOf, type ChartSpec } from './spec'

/** One ring's figure, named by its field or its series. */
export interface RingFigure {
    name: string
    value: number | null
    /** Which `y` field's unit it is written with. */
    unit: number
}

/**
 * The figures a rings chart draws, from the outermost in: one per label of `series`, each its rows'
 * first `y` combined by `aggregate` (or its rows counted), or else one per `y` field, each combined
 * its own way, or else the rows counted.
 */
export function ringFigures(spec: ChartSpec): RingFigure[] {
    const fields = fieldsOf(spec)
    const combine = (rows: ChartSpec['rows'], field: string | undefined, index: number) =>
        field === undefined
            ? rows.length
            : aggregate(
                  rows.map((row) => numberOf(row[field])).filter((value): value is number => value !== null),
                  aggregateAt(spec.aggregate, index),
              )
    if (spec.series !== undefined) {
        const field = spec.series
        return distinct(spec.rows, field, spec.seriesOrder).map((name) => ({
            name,
            value: combine(
                spec.rows.filter((row) => labelOf(row[field]) === name),
                fields[0],
                0,
            ),
            unit: 0,
        }))
    }
    if (fields.length === 0) return [{ name: wordsOf(spec).count, value: spec.rows.length, unit: 0 }]
    return fields.map((field, index) => ({ name: field, value: combine(spec.rows, field, index), unit: index }))
}

/** A rings chart's legend: its rings, each with its figure. */
export function ringsLegend(spec: ChartSpec): LegendItem[] {
    return ringFigures(spec).map((figure, index) => ({
        key: figure.name,
        label: figure.name,
        color: legendColor(spec, figure.name, index, SERIES_ORDER),
        values: [figure.value],
    }))
}
