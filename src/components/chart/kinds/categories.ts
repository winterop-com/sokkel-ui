import { asShares, formatNumber, pivot } from '../data'
import { SERIES_ORDER, tooltipMarkup } from '../look'
import { colorOf, legendColor, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/** The figure as a tooltip or a label writes it, with the spec's unit. */
export function written(spec: ChartSpec, value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'
    return `${(spec.format ?? formatNumber)(value)}${spec.unit ?? ''}`
}

/** The rows as categories and series, as shares when the spec stacks them to 100%. */
function shaped(spec: ChartSpec) {
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

/** A tooltip listing every series at the category under the pointer. */
function axisTooltip(spec: ChartSpec) {
    const unit = spec.stack === 'percent' ? { ...spec, format: (value: number) => value.toFixed(1), unit: '%' } : spec
    return {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (points: { axisValueLabel: string; seriesName: string; value: number | null; color: string }[]) =>
            tooltipMarkup(
                points[0]?.axisValueLabel ?? '',
                points.map((point) => ({ label: point.seriesName, value: written(unit, point.value), color: point.color })),
            ),
    }
}

/** Bars per category, one bar per series side by side, stacked, or as shares of 100%. */
export const bar: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const categoryAxis = { type: 'category', data: categories }
    const valueAxis = { type: 'value', max: spec.stack === 'percent' ? 100 : undefined }
    return {
        tooltip: axisTooltip(spec),
        grid: { left: 4, right: 10, top: 10, bottom: 4, containLabel: true },
        xAxis: spec.horizontal === true ? valueAxis : categoryAxis,
        yAxis: spec.horizontal === true ? { ...categoryAxis, inverse: true } : valueAxis,
        series: series.map((entry, index) => ({
            type: 'bar',
            name: entry.name,
            data: entry.values,
            stack: spec.stack === undefined ? undefined : 'all',
            itemStyle: { color: colorOf(spec, look, entry.name, index) },
        })),
    }
}

/** A line per series across the categories, or areas filled under them. */
function lines(filled: boolean): ChartBuilder {
    return (spec, look) => {
        const { categories, series } = shaped(spec)
        return {
            tooltip: { ...axisTooltip(spec), axisPointer: { type: 'line' } },
            grid: { left: 4, right: 10, top: 10, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: categories, boundaryGap: false },
            yAxis: { type: 'value', max: spec.stack === 'percent' ? 100 : undefined },
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
                    areaStyle: filled ? { color, opacity: spec.stack === undefined ? 0.15 : 0.55 } : undefined,
                }
            }),
        }
    }
}

export const line = lines(false)
export const area = lines(true)

/** A ring of slices, one per category, each its share of the whole. */
export const donut: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const values = series[0]?.values ?? []
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    return {
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
                radius: ['55%', '85%'],
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

/** A grid of cells, `x` along and `series` down, each cell's color its combined `y`. */
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
        grid: { left: 4, right: 10, top: 10, bottom: 4, containLabel: true },
        xAxis: { type: 'category', data: categories, splitArea: { show: false } },
        yAxis: { type: 'category', data: series.map((entry) => entry.name), inverse: true },
        visualMap: {
            show: false,
            min: values.length === 0 ? 0 : Math.min(...values),
            max: values.length === 0 ? 1 : Math.max(...values),
            inRange: { color: look.ramp(token) },
        },
        series: [{ type: 'heatmap', data: cells }],
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
