import { pivot } from '../data'
import { tooltipMarkup } from '../look'
import { dayOf } from '../shapes'
import { written } from './categories'
import { colorOf, type ChartBuilder } from './spec'

/**
 * A stream: each series a band flowing along `x`, stacked around a middle line so the whole swells
 * and thins with the total. `x` is a time field, dates or times, or else categories in `order`;
 * `series` splits the rows into bands in `seriesOrder`, each `y` combined by `aggregate`, or the
 * rows counted without one. Bands take the colors `colors` names, or the theme's order.
 */
export const stream: ChartBuilder = (spec, look) => {
    if (spec.x === undefined) throw new Error('A stream needs an x field.')
    const { categories, series } = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    const time = categories.length > 0 && categories.every((label) => dayOf(label) !== null)
    const text = { color: look.muted, fontFamily: look.font, fontSize: look.size.label }
    const label = (value: unknown) => (typeof value === 'number' && time ? new Date(value).toISOString().slice(0, 10) : String(value))
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line', lineStyle: { color: look.muted, type: 'dashed', width: 1 } },
            formatter: (points: { value: [unknown, number, string]; color: string }[]) =>
                tooltipMarkup(
                    label(points[0]?.value[0]),
                    points.map((point) => ({ label: point.value[2], value: written(spec, point.value[1]), color: point.color })),
                ),
        },
        singleAxis: {
            type: time ? 'time' : 'category',
            data: time ? undefined : categories,
            top: 8,
            bottom: 22,
            left: 8,
            right: 12,
            boundaryGap: time ? undefined : false,
            axisLine: { show: true, lineStyle: { color: look.border } },
            axisTick: { show: false },
            axisLabel: text,
            splitLine: { show: true, lineStyle: { color: look.grid, width: 1 } },
        },
        series: [
            {
                type: 'themeRiver',
                color: series.map((entry, index) => colorOf(spec, look, entry.name, index)),
                boundaryGap: ['4%', '4%'],
                label: { show: false },
                emphasis: { focus: 'self', label: { show: false } },
                blur: { itemStyle: { opacity: 0.25 } },
                data: series.flatMap((entry) => categories.map((category, index) => [category, entry.values[index] ?? 0, entry.name])),
            },
        ],
    }
}
