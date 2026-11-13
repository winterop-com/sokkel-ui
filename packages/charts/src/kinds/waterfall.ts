import { tooltipMarkup } from '../look'
import { valueTicks, written } from './categories'
import { stretches, tones } from './legends'
import { categoryText, wordsOf, type ChartBuilder } from './spec'

interface Api {
    value: (dimension: number) => number
    coord: (point: [number, number]) => [number, number]
    size: (size: [number, number]) => [number, number]
    visual: (key: string) => string
}

/**
 * A running total across the categories of `x`: each category's combined `y` as a bar that rises
 * or falls from where the one before it ended, joined by a thin line, and a bar for the total at the
 * end. Rises take the `good` tone and falls the `critical` one, unless `colors` names others for
 * the words `Rise`, `Fall` and `Total`. Reads `x`, `y`, `aggregate`, `order`, `colors`, `format`,
 * `unit`, `words` and `formatCategory`.
 */
export const waterfall: ChartBuilder = (spec, look) => {
    const words = wordsOf(spec)
    const { categories, steps, total } = stretches(spec)
    const tone = tones(spec)
    const names = [...categories, words.total]
    const bars = [
        ...steps.map((step, index) => ({ index, from: step.from, to: step.to, change: step.change })),
        { index: steps.length, from: 0, to: total, change: total },
    ]
    const draw = (_: unknown, api: Api) => {
        const index = api.value(0)
        const [from, to] = [api.value(1), api.value(2)]
        const [left, top] = api.coord([index, Math.max(from, to)])
        const bottom = api.coord([index, Math.min(from, to)])[1]
        const band = api.size([1, 0])[0]
        const width = Math.min(40, band * 0.62)
        const children: unknown[] = [
            {
                type: 'rect',
                shape: { x: left - width / 2, y: top, width, height: Math.max(1, bottom - top), r: 2 },
                style: { fill: api.visual('color') },
            },
        ]
        if (index < names.length - 1) {
            const level = api.coord([index, to])[1]
            children.push({
                type: 'line',
                silent: true,
                shape: { x1: left + width / 2, y1: level, x2: left + band - width / 2, y2: level },
                style: { stroke: look.muted, lineWidth: 1, lineDash: [2, 2] },
            })
        }
        return { type: 'group', children }
    }
    const series = (name: string, color: string, pick: (bar: (typeof bars)[number]) => boolean) => ({
        type: 'custom',
        name,
        renderItem: draw,
        encode: { x: 0, y: [1, 2] },
        itemStyle: { color: look.token(color) },
        emphasis: { focus: 'series' },
        data: bars.filter(pick).map((bar) => [bar.index, bar.from, bar.to, bar.change]),
    })
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { value: [number, number, number, number]; color: string; seriesName: string }) => {
                const [index, , to, change] = point.value
                if (index === names.length - 1)
                    return tooltipMarkup(words.total, [{ label: words.total, value: written(spec, to), color: point.color }])
                return tooltipMarkup(categoryText(spec, names[index]), [
                    { label: words.change, value: `${change > 0 ? '+' : ''}${written(spec, change)}`, color: point.color },
                    { label: words.total, value: written(spec, to) },
                ])
            },
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: { formatter: (name: string, index: number) => (index === categories.length ? name : categoryText(spec, name)) },
        },
        yAxis: { type: 'value', ...valueTicks(spec) },
        series: [
            series(words.rise, tone.rise, (bar) => bar.index < steps.length && bar.change >= 0),
            series(words.fall, tone.fall, (bar) => bar.index < steps.length && bar.change < 0),
            series(words.total, tone.total, (bar) => bar.index === steps.length),
        ],
    }
}
