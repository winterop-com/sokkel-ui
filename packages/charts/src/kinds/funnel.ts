import { tooltipMarkup } from '../look'
import { funnelStages, stageColor } from './legend-series'
import { written, wordsOf, type ChartBuilder } from './spec'

/**
 * Stages narrowing by their figure: the categories of `x` in `order`, each as wide as its combined
 * `y` (or its rows counted) against the first, with its figure and share of the first written on
 * it. Stages fade from the first series color unless `colors` names one. Reads `x`, `y`,
 * `aggregate`, `order`, `colors`, `format`, `unit` and `words`.
 */
export const funnel: ChartBuilder = (spec, look) => {
    const words = wordsOf(spec)
    const list = funnelStages(spec)
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
