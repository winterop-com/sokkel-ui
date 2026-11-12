import { distinct, labelOf, numberOf } from '../data'
import { tooltipMarkup } from '../look'
import { tickWriter, written } from './categories'
import { colorOf, type ChartBuilder, type ChartSpec } from './spec'

/** The fields a parallel chart draws an axis for, in order. */
function axesOf(spec: ChartSpec): string[] {
    const fields = spec.y === undefined ? [] : typeof spec.y === 'string' ? [spec.y] : [...spec.y]
    if (fields.length < 2) throw new Error('A parallel chart needs at least two y fields.')
    return fields
}

/** Whether a field holds numbers: its first value that is not empty is one. */
function numeric(spec: ChartSpec, field: string): boolean {
    const found = spec.rows.find((row) => labelOf(row[field]) !== '')
    return found === undefined || numberOf(found[field]) !== null
}

/**
 * Parallel coordinates: one upright axis per `y` field, left to right, and each row a line through
 * its value on every axis. A field of numbers gets a scale, any other its labels, sorted or in
 * `order`. `series` colors the lines by a field's label, in the colors `colors` names or the
 * theme's order, and the legend lists them.
 */
export const parallel: ChartBuilder = (spec, look) => {
    const fields = axesOf(spec)
    const kinds = fields.map((field) => numeric(spec, field))
    const labels = fields.map((field, index) =>
        kinds[index] ? [] : spec.order === undefined ? distinct(spec.rows, field).sort() : distinct(spec.rows, field, spec.order),
    )
    const groups = spec.series === undefined ? ['All'] : distinct(spec.rows, spec.series, spec.seriesOrder)
    const text = { color: look.muted, fontFamily: look.font, fontSize: look.size.label }
    const tickText = { ...text, textBorderColor: look.card, textBorderWidth: 3 }
    const valueOf = (value: unknown, index: number) => (kinds[index] ? numberOf(value) : labelOf(value))
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { seriesName: string; value: (number | string | null)[]; color: string }) =>
                tooltipMarkup(
                    point.seriesName,
                    fields.map((field, index) => {
                        const value = point.value[index]
                        return { label: field, value: typeof value === 'number' ? written({ ...spec, unit: '' }, value) : (value ?? '-') }
                    }),
                ),
        },
        parallel: {
            left: 28,
            right: 36,
            top: 28,
            bottom: 20,
            parallelAxisDefault: {
                nameLocation: 'end',
                nameGap: 10,
                nameTextStyle: { ...text, color: look.foreground },
                axisLine: { show: true, lineStyle: { color: look.border } },
                axisTick: { show: false },
                axisLabel: tickText,
                splitLine: { show: false },
            },
        },
        parallelAxis: fields.map((field, index) =>
            kinds[index]
                ? {
                      dim: index,
                      name: field,
                      type: 'value',
                      scale: true,
                      z: 3,
                      axisLabel: { ...tickText, formatter: tickWriter(spec.format) },
                  }
                : { dim: index, name: field, type: 'category', data: labels[index], z: 3 },
        ),
        series: groups.map((name, index) => ({
            type: 'parallel',
            name,
            z: 1,
            smooth: spec.smooth === true,
            lineStyle: { color: colorOf(spec, look, name, index), width: 1, opacity: 0.35 },
            emphasis: { focus: 'series', lineStyle: { width: 1.5, opacity: 0.9 } },
            blur: { lineStyle: { opacity: 0.06 } },
            data: spec.rows
                .filter((row) => spec.series === undefined || labelOf(row[spec.series]) === name)
                .map((row) => fields.map((field, at) => valueOf(row[field], at))),
        })),
    }
}
