import { SERIES_ORDER, tokenColor, tooltipMarkup } from '../look'
import { shaped, written } from './categories'
import { wordsOf, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/** The stages in order with their figures, and each one's share of the first, in percent. */
function stages(spec: ChartSpec) {
    const { categories, series } = shaped({ ...spec, series: undefined, stack: undefined })
    const values = (series[0]?.values ?? []).map((value) => value ?? 0)
    const first = values[0] ?? 0
    return categories.map((name, index) => ({ name, value: values[index], share: first === 0 ? 0 : (values[index] / first) * 100 }))
}

/** A stage's color as CSS: the token `colors` names for it, or the first series color fading with each stage. */
function stageColor(spec: ChartSpec, name: string, index: number, count: number): string {
    const token = spec.colors?.[name]
    if (token !== undefined) return tokenColor(token)
    const strength = count <= 1 ? 80 : Math.round(80 - (45 * index) / (count - 1))
    return `color-mix(in oklab, var(--${SERIES_ORDER[0]}) ${String(strength)}%, var(--card))`
}

/**
 * Stages narrowing by their figure: the categories of `x` in `order`, each as wide as its combined
 * `y` (or its rows counted) against the first, with its figure and share of the first written on
 * it. Stages fade from the first series color unless `colors` names one. Reads `x`, `y`,
 * `aggregate`, `order`, `colors`, `format`, `unit` and `words`.
 */
export const funnel: ChartBuilder = (spec, look) => {
    const words = wordsOf(spec)
    const list = stages(spec)
    const share = (value: number) => `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { dataIndex: number; color: string }) => {
                const stage = list[point.dataIndex]
                return tooltipMarkup(stage.name, [
                    { label: stage.name, value: written(spec, stage.value), color: point.color },
                    { label: words.ofFirst, value: share(stage.share) },
                ])
            },
        },
        series: [
            {
                type: 'funnel',
                name: spec.x,
                sort: 'none',
                left: 8,
                right: 8,
                top: 8,
                bottom: 8,
                min: 0,
                max: Math.max(1, ...list.map((stage) => stage.value)),
                minSize: '8%',
                gap: 2,
                label: {
                    position: 'inside',
                    color: look.foreground,
                    fontFamily: look.font,
                    fontSize: look.size.label,
                    formatter: (point: { dataIndex: number }) => {
                        const stage = list[point.dataIndex]
                        return `${stage.name}  ${written(spec, stage.value)} · ${share(stage.share)}`
                    },
                },
                labelLine: { show: false },
                itemStyle: { borderColor: look.card, borderWidth: 1 },
                emphasis: { label: { fontWeight: 600 } },
                data: list.map((stage, index) => ({
                    name: stage.name,
                    value: stage.value,
                    itemStyle: { color: look.mix(stageColor(spec, stage.name, index, list.length), 100) },
                })),
            },
        ],
    }
}

/** A funnel's legend: its stages in their colors, each with its figure. */
export function funnelLegend(spec: ChartSpec): LegendItem[] {
    const list = stages(spec)
    return list.map((stage, index) => ({
        key: stage.name,
        label: stage.name,
        color: stageColor(spec, stage.name, index, list.length),
        values: [stage.value],
    }))
}
