import { tooltipMarkup } from '../look'
import { compactWritten, endsStack, farCorners, tickWriter } from './axes'
import { shaped } from './legend-series'
import {
    written,
    categoryLabels,
    categoryText,
    colorOf,
    isFigure,
    fieldsOf,
    isDashed,
    stackOf,
    unitAt,
    type ChartBuilder,
    type ChartLayer,
    type ChartSpec,
} from './spec'

type Side = 'left' | 'right'

/** How a series is drawn: as `layers` names it, or the first as bars on the left axis and the rest as a line on the right. */
function layerOf(spec: ChartSpec, name: string, index: number): Required<ChartLayer> {
    const own = spec.layers?.[name]
    return { mark: own?.mark ?? (index === 0 ? 'bar' : 'line'), axis: own?.axis ?? (index === 0 ? 'left' : 'right') }
}

/**
 * Bars and lines over the same categories, on a value axis on the left and one of their own on
 * the right, such as runs in bars and their failure rate in a line. With two `y` fields the first
 * is bars on the left and the second a line on the right, each combined its own way when
 * `aggregate` lists two and written with its own unit when `unit` lists two; with `series`, each
 * label of it is a series of `y`. `layers` says how each series or field is drawn and on which
 * axis, and `axes` gives each axis a name, a unit, a format and a range. Bars stack by `stack` and
 * `stacks`, never lines, and a `dashed` series is a thin dashed line, as a target is. The right
 * axis keeps the left one's grid unless its range is fixed. Reads `x`, `y`, `series`,
 * `aggregate`, `order`, `seriesOrder`, `layers`, `axes`, `stack`, `stacks`, `dashed`, `colors`,
 * `format`, `unit`, `smooth`, `labelEvery` and `formatCategory`.
 */
export const dual: ChartBuilder = (spec, look) => {
    const fields = fieldsOf(spec)
    const bySeries = spec.series !== undefined
    if (!bySeries && fields.length < 2) throw new Error('A dual chart needs two y fields, or a series field: the bars and the line.')
    const { categories, series } = shaped(
        bySeries ? { ...spec, stack: undefined } : { ...spec, y: fields, series: undefined, stack: undefined },
    )
    const layers = series.map((entry, index) => layerOf(spec, entry.name, index))
    const twoAxes = layers.some((layer) => layer.axis === 'right')
    const groups = series.map((entry, index) => (layers[index].mark === 'bar' ? stackOf(spec, entry.name) : undefined))
    const stacked = groups.some((group) => group !== undefined)
    const sides = (['left', 'right'] as const).map((side, at) => {
        const own = spec.axes?.[side] ?? {}
        const first = layers.findIndex((layer) => layer.axis === side)
        const unit = own.unit ?? unitAt(spec, at)
        return {
            name: own.name ?? (bySeries || first < 0 ? undefined : series[first].name),
            unit,
            tick:
                own.format === undefined
                    ? tickWriter(spec.format, unit)
                    : (value: number) => compactWritten(own.format?.(value) ?? '', value),
            min: own.min,
            max: own.max,
            write: (value: number | null) =>
                value === null ? '-' : own.format !== undefined ? own.format(value) : written({ ...spec, unit }, value),
        }
    })
    const sideOf = (index: number) => sides[layers[index].axis === 'right' && twoAxes ? 1 : 0]
    const valueAxis = (side: Side) => {
        const own = sides[side === 'left' ? 0 : 1]
        return {
            type: 'value',
            position: side,
            name: own.name,
            nameGap: 8,
            nameTextStyle: { align: side, padding: 0 },
            min: own.min,
            max: own.max,
            alignTicks: side === 'right' && own.min === undefined && own.max === undefined,
            splitNumber: 4,
            axisLabel: { formatter: own.tick, hideOverlap: true },
            splitLine: side === 'right' ? { show: false } : undefined,
        }
    }
    const named = sides.some((side) => side.name !== undefined)
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: layers.some((layer) => layer.mark === 'bar') ? 'shadow' : 'line' },
            formatter: (
                points: { axisValueLabel: string; seriesName: string; seriesIndex: number; value: number | null; color: string }[],
            ) =>
                tooltipMarkup(
                    categoryText(spec, points[0]?.axisValueLabel ?? ''),
                    points
                        .filter((point) => isFigure(point.value))
                        .map((point) => ({
                            label: point.seriesName,
                            value: sideOf(point.seriesIndex).write(point.value),
                            color: point.color,
                        })),
                ),
        },
        grid: { left: 4, right: 10, top: named ? 26 : 10, bottom: 4 },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: {
                interval: spec.labelEvery === undefined ? 'auto' : spec.labelEvery - 1,
                hideOverlap: true,
                ...categoryLabels(spec),
            },
        },
        yAxis: twoAxes ? [valueAxis('left'), valueAxis('right')] : [valueAxis('left')],
        series: series.map((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            const yAxisIndex = layers[index].axis === 'right' && twoAxes ? 1 : 0
            if (layers[index].mark === 'line') {
                const dashed = isDashed(spec, entry.name)
                return {
                    type: 'line',
                    name: entry.name,
                    data: entry.values,
                    yAxisIndex,
                    z: 3,
                    smooth: spec.smooth === true,
                    showSymbol: !dashed,
                    symbolSize: 5,
                    connectNulls: false,
                    itemStyle: { color, borderColor: look.card, borderWidth: 1 },
                    lineStyle: { color, width: dashed ? 1.25 : 2, type: dashed ? 'dashed' : 'solid' },
                }
            }
            return {
                type: 'bar',
                name: entry.name,
                data: entry.values.map((value, category) =>
                    value === null || value === 0 || !endsStack(groups, series, index, category, value)
                        ? value
                        : { value, itemStyle: { borderRadius: farCorners(look.corner, false, value) } },
                ),
                yAxisIndex,
                stack: groups[index],
                barCategoryGap: '28%',
                barMaxWidth: 32,
                itemStyle: { color, ...(stacked ? { borderColor: look.card, borderWidth: 1 } : {}) },
            }
        }),
    }
}
