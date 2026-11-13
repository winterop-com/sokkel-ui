import { pivot } from '../data'
import { SERIES_ORDER, tokenColor, tooltipMarkup } from '../look'
import { niceCeil } from '../stats'
import { valueTicks, written } from './categories'
import { fieldsOf, wordsOf, type ChartBuilder, type ChartSpec, type ChartStep } from './spec'
import type { LegendItem } from '../ChartLegend'

/** Each category's figure and target, and where the scale starts and ends. */
function figures(spec: ChartSpec) {
    const field = fieldsOf(spec)[0]
    if (spec.x === undefined || field === undefined) throw new Error('A bullet chart needs x and y fields.')
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.value === undefined ? [field] : [field, spec.value],
        aggregate: spec.aggregate,
        order: spec.order,
    })
    const values = data.series[0]?.values ?? []
    const targets = spec.value === undefined ? [] : (data.series[1]?.values ?? [])
    const steps: readonly ChartStep[] = spec.steps ?? [{}]
    const largest = Math.max(
        0,
        ...values.map((value) => value ?? 0),
        ...targets.map((value) => value ?? 0),
        ...steps.map((step) => step.value ?? 0),
    )
    return { field, categories: data.categories, values, targets, steps, min: spec.min ?? 0, max: spec.max ?? niceCeil(largest) }
}

/** The CSS color of each band: its own token, faintly, or a gray that lightens from the first band to the last. */
function bandColors(steps: readonly ChartStep[]): string[] {
    return steps.map((step, index) => {
        const strength = steps.length <= 1 ? 22 : Math.round(30 - (20 * index) / (steps.length - 1))
        return `color-mix(in oklab, ${tokenColor(step.color ?? 'muted-foreground')} ${String(step.color === undefined ? strength : 26)}%, var(--card))`
    })
}

const bandName = (step: ChartStep, index: number) => step.label ?? `band-${String(index + 1)}`

interface Api {
    value: (dimension: number) => number
    coord: (point: [number, number]) => [number, number]
    size: (size: [number, number]) => [number, number]
    visual: (key: string) => string
}

/**
 * A figure against its target and the bands it falls in, one bar per category: the categories of
 * `x` down the side, each a broad strip of the bands in `steps`, the combined `y` as a narrow bar
 * across them, and the combined `value` as the target's tick. The bands are shades of gray, darkest
 * first, or faint tints of a step's own color. The scale runs from `min` (0) to `max` or a round
 * number above every figure, target and step; `horizontal: false` stands the bars up. Reads `x`,
 * `y`, `value`, `aggregate` (one, or one for `y` and one for `value`), `steps`, `min`, `max`,
 * `order`, `horizontal`, `colors`, `format`, `unit` and `words`.
 */
export const bullet: ChartBuilder = (spec, look) => {
    const words = wordsOf(spec)
    const { field, categories, values, targets, steps, min, max } = figures(spec)
    const sideways = spec.horizontal !== false
    const bands = bandColors(steps)
    const token = spec.colors?.[field]
    const tone = token === undefined ? look.series[0] : look.token(token)
    const valueAxis = { type: 'value', min, max, splitLine: { show: false }, ...valueTicks(spec) }
    const categoryAxes = [
        { type: 'category', data: categories, inverse: sideways },
        { type: 'category', data: categories, inverse: sideways, show: false },
    ]
    const axis = (index: number) => (sideways ? { yAxisIndex: index } : { xAxisIndex: index })
    const tick = (_: unknown, api: Api) => {
        const index = api.value(0)
        const target = api.value(1)
        const [x, y] = api.coord(sideways ? [target, index] : [index, target])
        const band = api.size(sideways ? [0, 1] : [1, 0])[sideways ? 1 : 0]
        const half = Math.min(14, band * 0.32)
        return {
            type: 'line',
            shape: sideways ? { x1: x, y1: y - half, x2: x, y2: y + half } : { x1: x - half, y1: y, x2: x + half, y2: y },
            style: { stroke: api.visual('color'), lineWidth: 2.5 },
        }
    }
    const ends = steps.map((_, index) => Math.min(max, steps[index + 1]?.value ?? max))
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'none' },
            formatter: (points: { dataIndex: number }[]) => {
                const index = points[0]?.dataIndex ?? 0
                return tooltipMarkup(categories[index] ?? '', [
                    { label: field, value: written(spec, values[index]), color: tone },
                    ...(spec.value === undefined
                        ? []
                        : [{ label: words.target, value: written(spec, targets[index]), color: look.foreground }]),
                ])
            },
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: sideways ? valueAxis : categoryAxes,
        yAxis: sideways ? categoryAxes : valueAxis,
        series: [
            // Each band runs from the scale's start to its end, the last drawn first, so hiding one leaves the others in place.
            ...steps
                .map((step, index) => ({
                    type: 'bar',
                    name: bandName(step, index),
                    ...axis(1),
                    silent: true,
                    barGap: '-100%',
                    barWidth: '64%',
                    barMaxWidth: 44,
                    itemStyle: { color: look.mix(bands[index], 100), borderRadius: 0 },
                    emphasis: { disabled: true },
                    data: categories.map(() => ends[index]),
                }))
                .reverse(),
            {
                type: 'bar',
                name: field,
                ...axis(0),
                z: 3,
                barWidth: '26%',
                barMaxWidth: 16,
                itemStyle: { color: tone, borderRadius: sideways ? [0, look.corner, look.corner, 0] : [look.corner, look.corner, 0, 0] },
                data: values,
            },
            ...(spec.value === undefined
                ? []
                : [
                      {
                          type: 'custom',
                          name: words.target,
                          ...axis(0),
                          z: 4,
                          renderItem: tick,
                          encode: sideways ? { x: 1, y: 0 } : { x: 0, y: 1 },
                          itemStyle: { color: look.foreground },
                          data: targets.map((target, index) => [index, target]),
                      },
                  ]),
        ],
    }
}

/** A bullet chart's legend: the figure, the target, and the bands that carry a label. */
export function bulletLegend(spec: ChartSpec): LegendItem[] {
    const words = wordsOf(spec)
    const { field, values, targets, steps } = figures(spec)
    const bands = bandColors(steps)
    return [
        { key: field, label: field, color: tokenColor(spec.colors?.[field] ?? SERIES_ORDER[0]), values },
        ...(spec.value === undefined ? [] : [{ key: words.target, label: words.target, color: 'var(--foreground)', values: targets }]),
        ...steps.flatMap((step, index) =>
            step.label === undefined ? [] : [{ key: bandName(step, index), label: step.label, color: bands[index] }],
        ),
    ]
}
