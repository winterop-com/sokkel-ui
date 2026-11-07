import { asShares, formatNumber, pivot, type Series } from '../data'
import { SERIES_ORDER, tooltipMarkup, type ChartLook } from '../look'
import { colorOf, legendColor, unitAt, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/** The figure as a tooltip or a label writes it, with the spec's unit, or the unit of the `field`th `y` field. */
export function written(spec: ChartSpec, value: number | null | undefined, field = 0): string {
    if (value === null || value === undefined) return '-'
    return `${(spec.format ?? formatNumber)(value)}${unitAt(spec, field)}`
}

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

/** The category axis, its labels every `labelEvery`th category when the spec asks. */
function categoryAxis(spec: ChartSpec, categories: string[]) {
    return {
        type: 'category',
        data: categories,
        ...(spec.labelEvery === undefined ? {} : { axisLabel: { interval: spec.labelEvery - 1 } }),
    }
}

/** The value axis' labels: with the spec's unit where it has one, or `%` where the figures stack to 100%. */
export function valueLabels(spec: ChartSpec) {
    if (spec.stack === 'percent') return { axisLabel: { formatter: (value: number) => `${formatNumber(value)}%` } }
    if (spec.unit === undefined) return {}
    return { axisLabel: { formatter: (value: number) => written(spec, value) } }
}

/** A tooltip listing every series at the category under the pointer. */
function axisTooltip(spec: ChartSpec) {
    const unit = spec.stack === 'percent' ? { ...spec, format: (value: number) => value.toFixed(1), unit: '%' } : spec
    return {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (points: { axisValueLabel: string; seriesName: string; seriesIndex: number; value: number | null; color: string }[]) =>
            tooltipMarkup(
                points[0]?.axisValueLabel ?? '',
                points.map((point) => ({
                    label: point.seriesName,
                    value: written(unit, point.value, spec.series === undefined ? point.seriesIndex : 0),
                    color: point.color,
                })),
            ),
    }
}

/** Which series ends each category's stack: the last with a figure above zero, and the last with one below. */
function stackEnds(series: readonly Series[]) {
    const last = (sign: number) =>
        (series[0]?.values ?? []).map((_, category) => series.findLastIndex((entry) => Math.sign(entry.values[category] ?? 0) === sign))
    return { up: last(1), down: last(-1) }
}

/** A bar's corners, rounded at its far end from the axis. */
export function farCorners(corner: number, horizontal: boolean, value: number) {
    if (horizontal) return value < 0 ? [corner, 0, 0, corner] : [0, corner, corner, 0]
    return value < 0 ? [0, 0, corner, corner] : [corner, corner, 0, 0]
}

/**
 * Bars per category, one bar per series side by side, stacked, or as shares of 100%; `gap` sets how
 * close they stand. Each bar, or each stack, is rounded at its far end, and stacked bars are parted
 * by a line in the card's color.
 */
export const bar: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const along = categoryAxis(spec, categories)
    const valueAxis = { type: 'value', max: spec.stack === 'percent' ? 100 : undefined, ...valueLabels(spec) }
    const stacked = spec.stack !== undefined
    const horizontal = spec.horizontal === true
    const ends = stackEnds(series)
    const isEnd = (index: number, category: number, value: number) =>
        !stacked || (value > 0 ? ends.up[category] === index : ends.down[category] === index)
    return {
        tooltip: axisTooltip(spec),
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: horizontal ? valueAxis : along,
        yAxis: horizontal ? { ...along, inverse: true } : valueAxis,
        series: series.map((entry, index) => ({
            type: 'bar',
            name: entry.name,
            data: entry.values.map((value, category) =>
                value === null || value === 0 || !isEnd(index, category, value)
                    ? value
                    : { value, itemStyle: { borderRadius: farCorners(look.corner, horizontal, value) } },
            ),
            stack: stacked ? 'all' : undefined,
            ...(spec.gap === 'tight' ? { barCategoryGap: '6%', barMaxWidth: 400 } : stacked ? { barCategoryGap: '24%' } : {}),
            itemStyle: {
                color: colorOf(spec, look, entry.name, index),
                ...(stacked ? { borderColor: look.card, borderWidth: 1 } : {}),
            },
        })),
    }
}

/** An area's color fading from its line toward the axis, deeper where areas stack; upward where the area hangs from the top. */
export function fading(look: ChartLook, color: string, stacked: boolean, hang = false) {
    return {
        type: 'linear',
        x: 0,
        y: hang ? 1 : 0,
        x2: 0,
        y2: hang ? 0 : 1,
        colorStops: [
            { offset: 0, color: look.mix(color, stacked ? 55 : 40) },
            { offset: 1, color: look.mix(color, stacked ? 30 : 4) },
        ],
    }
}

/** A line per series across the categories, or areas filled under them, evenly or fading by `fill`. */
function lines(filled: boolean): ChartBuilder {
    return (spec, look) => {
        const { categories, series } = shaped(spec)
        return {
            tooltip: { ...axisTooltip(spec), axisPointer: { type: 'line' } },
            grid: { left: 4, right: 10, top: 10, bottom: 4 },
            xAxis: { ...categoryAxis(spec, categories), boundaryGap: false },
            yAxis: { type: 'value', max: spec.stack === 'percent' ? 100 : undefined, ...valueLabels(spec) },
            series: series.map((entry, index) => {
                const color = colorOf(spec, look, entry.name, index)
                return {
                    type: 'line',
                    name: entry.name,
                    data: entry.values,
                    smooth: spec.smooth === true,
                    stack: spec.stack === undefined ? undefined : 'all',
                    itemStyle: { color },
                    lineStyle: { color },
                    areaStyle: !filled
                        ? undefined
                        : spec.fill === 'gradient'
                          ? { opacity: 1, color: fading(look, color, spec.stack !== undefined) }
                          : { color, opacity: spec.stack === undefined ? 0.15 : 0.55 },
                }
            }),
        }
    }
}

export const line = lines(false)
export const area = lines(true)

/** A ring of slices, one per category, each its share of the whole, with the total in its middle when `total` names it. */
export const donut: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const values = series[0]?.values ?? []
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    return {
        ...(spec.total === undefined
            ? {}
            : {
                  title: {
                      show: true,
                      text: written(spec, total),
                      subtext: spec.total,
                      left: 'center',
                      top: 'center',
                      itemGap: 2,
                      textStyle: { fontSize: look.size.stat, fontWeight: 600, color: look.foreground },
                      subtextStyle: { fontSize: look.size.label, color: look.muted },
                  },
              }),
        tooltip: {
            trigger: 'item',
            formatter: (point: { name: string; value: number; color: string }) =>
                tooltipMarkup('', [
                    {
                        label: point.name,
                        value: `${written(spec, point.value)} (${total === 0 ? '0' : ((point.value / total) * 100).toFixed(1)}%)`,
                        color: point.color,
                    },
                ]),
        },
        series: [
            {
                type: 'pie',
                radius: ['58%', '82%'],
                padAngle: 1,
                label: { show: false },
                data: categories.map((name, index) => ({
                    name,
                    value: values[index],
                    itemStyle: { color: colorOf(spec, look, name, index), borderColor: look.card, borderWidth: 2 },
                })),
            },
        ],
    }
}

/** A grid of cells, `x` along and `series` down, each cell's color its combined `y`, with the scale beside it by `showScale`. */
export const heatmap: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const cells = series.flatMap((entry, row) => entry.values.map((value, column) => [column, row, value]))
    const values = cells.map((cell) => cell[2]).filter((value): value is number => typeof value === 'number')
    const token = spec.colors?.value ?? 'chart-2'
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { value: [number, number, number | null] }) =>
                tooltipMarkup(`${categories[point.value[0]]}, ${series[point.value[1]].name}`, [
                    { label: spec.y === undefined ? 'Count' : String(spec.y), value: written(spec, point.value[2]) },
                ]),
        },
        grid: { left: 4, right: spec.showScale === true ? 56 : 10, top: 10, bottom: 4 },
        xAxis: { ...categoryAxis(spec, categories), splitArea: { show: false } },
        yAxis: { type: 'category', data: series.map((entry) => entry.name), inverse: true },
        visualMap: {
            show: spec.showScale === true,
            calculable: false,
            orient: 'vertical',
            right: 0,
            top: 'center',
            itemWidth: 10,
            itemHeight: 120,
            min: values.length === 0 ? 0 : Math.min(...values),
            max: values.length === 0 ? 1 : Math.max(...values),
            inRange: { color: look.ramp(token, 7) },
        },
        series: [{ type: 'heatmap', data: cells, itemStyle: { borderColor: look.card, borderWidth: 1, borderRadius: look.corner } }],
    }
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
