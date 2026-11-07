import { distinct, labelOf, numberOf } from '../data'
import { SERIES_ORDER, tooltipMarkup } from '../look'
import { written } from './categories'
import { colorOf, legendColor, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/**
 * One point per row, `x` against `y`, both numbers; `series` colors the points by a field's label
 * and `value` sizes them by a number. An axis is named where `fieldNames` names its field.
 */
export const scatter: ChartBuilder = (spec, look) => {
    const x = spec.x
    const y = typeof spec.y === 'string' ? spec.y : spec.y?.[0]
    if (x === undefined || y === undefined) throw new Error('A scatter chart needs x and y fields.')
    const groups = spec.series === undefined ? ['All'] : distinct(spec.rows, spec.series, spec.seriesOrder)
    const sizes = spec.value === undefined ? [] : spec.rows.map((row) => numberOf(row[spec.value as string]) ?? 0)
    const biggest = Math.max(1, ...sizes)
    const named = (field: string) => spec.fieldNames?.[field] ?? field
    const xName = spec.fieldNames?.[x]
    const yName = spec.fieldNames?.[y]
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { seriesName: string; value: [number, number, number?]; color: string }) =>
                tooltipMarkup(point.seriesName, [
                    { label: named(x), value: written({ ...spec, unit: '' }, point.value[0]) },
                    { label: named(y), value: written(spec, point.value[1]) },
                    ...(spec.value === undefined
                        ? []
                        : [{ label: named(spec.value), value: written({ ...spec, unit: '' }, point.value[2]) }]),
                ]),
        },
        grid: { left: 4, right: 10, top: yName === undefined ? 10 : 22, bottom: xName === undefined ? 4 : 26, containLabel: true },
        xAxis: {
            type: 'value',
            scale: true,
            splitLine: { show: true, lineStyle: { color: look.grid } },
            ...(xName === undefined ? {} : { name: xName, nameLocation: 'middle', nameGap: 22 }),
        },
        yAxis: { type: 'value', scale: true, ...(yName === undefined ? {} : { name: yName }) },
        series: groups.map((name, index) => ({
            type: 'scatter',
            name,
            itemStyle: { color: colorOf(spec, look, name, index) },
            symbolSize:
                spec.value === undefined ? undefined : (point: [number, number, number]) => 6 + 18 * Math.sqrt((point[2] ?? 0) / biggest),
            data: spec.rows
                .filter((row) => spec.series === undefined || labelOf(row[spec.series]) === name)
                .map((row) => [numberOf(row[x]), numberOf(row[y]), spec.value === undefined ? undefined : numberOf(row[spec.value])]),
        })),
    }
}

/** A scatter's legend: one entry per group of points. */
export function scatterLegend(spec: ChartSpec): LegendItem[] {
    const groups = spec.series === undefined ? ['All'] : distinct(spec.rows, spec.series, spec.seriesOrder)
    return groups.map((name, index) => ({ key: name, label: name, color: legendColor(spec, name, index, SERIES_ORDER) }))
}
