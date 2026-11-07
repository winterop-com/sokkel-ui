import type { LegendItem } from '../ChartLegend'
import { aggregate, aggregateAt, distinct, labelOf, numberOf } from '../data'
import { SERIES_ORDER, tooltipMarkup } from '../look'
import { written } from './categories'
import { colorOf, fieldsOf, legendColor, wordsOf, type ChartBuilder, type ChartSpec } from './spec'

/** How thick each ring is drawn, in pixels, and the card-colored line that parts it from the next. */
const RING = 12
const PARTING = 2

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

/**
 * Concentric rings, one per label of `series` or per `y` field, each filling from the top to its
 * figure's share of `min` (0) to `max` (100), with the figures written in the middle in their
 * rings' colors, the outermost first. The legend's hidden rings drop out. Give it room: each ring is
 * a fixed thickness, so a small chart leaves little room in the middle.
 * Reads `y`, `series`, `aggregate`, `seriesOrder`, `min`, `max`, `colors`, `format` and `unit`.
 */
export const rings: ChartBuilder = (spec, look, hidden) => {
    const figures = ringFigures(spec)
        .map((figure, index) => ({ ...figure, color: colorOf(spec, look, figure.name, index) }))
        .filter((figure) => hidden?.has(figure.name) !== true)
    const min = spec.min ?? 0
    const max = spec.max ?? 100
    const single = figures.length === 1
    const line = Math.round(look.size.body * 1.5)
    const ring = {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        min,
        max,
        center: ['50%', '50%'],
        radius: '92%',
        // The rings share this width, from the outermost in, as ECharts parts it among the figures.
        axisLine: { show: false, lineStyle: { width: RING * figures.length } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
    }
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { name: string; value: number; color: string; dataIndex: number }) =>
                tooltipMarkup('', [
                    {
                        label: point.name,
                        value: written(spec, figures[point.dataIndex]?.value, figures[point.dataIndex]?.unit),
                        color: figures[point.dataIndex]?.color,
                    },
                ]),
        },
        series: [
            {
                ...ring,
                name: 'figures',
                z: 3,
                progress: { show: true, overlap: false, clip: true, itemStyle: { borderColor: look.card, borderWidth: PARTING } },
                data: figures.map((figure, index) => ({
                    name: figure.name,
                    value: figure.value ?? min,
                    itemStyle: { color: figure.color },
                    detail: {
                        offsetCenter: [0, (index - (figures.length - 1) / 2) * line],
                        fontSize: single ? look.size.stat : look.size.body,
                        fontWeight: 600,
                        fontFamily: look.font,
                        color: figure.color,
                        formatter: () => written(spec, figure.value, figure.unit),
                    },
                })),
            },
            {
                ...ring,
                name: 'tracks',
                silent: true,
                tooltip: { show: false },
                progress: { show: true, overlap: false, itemStyle: { color: look.grid, borderColor: look.card, borderWidth: PARTING } },
                detail: { show: false },
                data: figures.map((figure) => ({ name: figure.name, value: max })),
            },
        ],
    }
}

/** A rings chart's legend: each ring in its color, with its figure. */
export function ringsLegend(spec: ChartSpec): LegendItem[] {
    return ringFigures(spec).map((figure, index) => ({
        key: figure.name,
        label: figure.name,
        color: legendColor(spec, figure.name, index, SERIES_ORDER),
        values: [figure.value],
    }))
}
