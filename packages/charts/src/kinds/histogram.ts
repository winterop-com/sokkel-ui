import { formatNumber } from '../data'
import { tooltipMarkup, withAlpha } from '../look'
import { binned } from './legend-histogram'
import { colorOf, type ChartBuilder } from './spec'

/**
 * The spread of one number: `x` split into equal bins on round edges, each bar how many rows fall
 * in it. `bins` sets how many bins there are, or how wide each is. Groups of `series` are overlaid,
 * see-through, or stacked with `stack`, or shown as shares of each bin with `stack: 'percent'`.
 * Reads `x`, `series`, `seriesOrder`, `bins`, `stack`, `colors`, `format` and `unit`.
 */
export const histogram: ChartBuilder = (spec, look) => {
    const { labels, series } = binned(spec)
    const overlaid = spec.stack === undefined && series.length > 1
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (points: { axisValueLabel: string; seriesName: string; value: number | null; color: string }[]) =>
                tooltipMarkup(
                    points[0]?.axisValueLabel ?? '',
                    points.map((point) => ({
                        label: point.seriesName,
                        value: spec.stack === 'percent' ? `${(point.value ?? 0).toFixed(1)}%` : formatNumber(point.value ?? 0),
                        color: point.color,
                    })),
                ),
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: { type: 'category', data: labels, axisLabel: { hideOverlap: true } },
        yAxis: spec.stack === 'percent' ? { type: 'value', max: 100 } : { type: 'value', minInterval: 1 },
        series: series.map((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            return {
                type: 'bar',
                name: entry.name,
                // An empty bin draws nothing, rather than a bar of no height with an edge.
                data: entry.values.map((value) => (value === 0 ? null : value)),
                stack: spec.stack === undefined ? undefined : 'all',
                barGap: overlaid ? '-100%' : undefined,
                barCategoryGap: '6%',
                barMaxWidth: '100%',
                itemStyle: {
                    color: overlaid ? withAlpha(color, 0.45) : color,
                    borderColor: overlaid ? color : look.card,
                    borderWidth: overlaid || spec.stack !== undefined ? 1 : 0,
                    borderRadius: spec.stack === undefined || index === series.length - 1 ? [look.corner, look.corner, 0, 0] : 0,
                },
            }
        }),
    }
}
