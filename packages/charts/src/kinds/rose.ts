import { tooltipMarkup } from '../look'
import { written } from './categories'
import { shaped } from './legends'
import { categoryLabels, categoryText, colorOf, isFigure, type ChartBuilder } from './spec'

/**
 * Categories around a circle, each a wedge as long as its combined `y` (or its rows counted), as
 * a Nightingale rose: a clock of the hours, a compass of the regions. Groups of `series` stack
 * outward in each wedge; without `series`, a wedge takes the color `colors` names for its category,
 * or the first series color. Reads `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`,
 * `colors`, `format`, `unit` and `formatCategory`.
 */
export const rose: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped({ ...spec, stack: undefined })
    const single = spec.series === undefined && series.length === 1
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (
                points: { axisValueLabel: string; seriesName: string; seriesIndex: number; value: number | null; color: string }[],
            ) =>
                tooltipMarkup(
                    categoryText(spec, points[0]?.axisValueLabel ?? ''),
                    points
                        .filter((point) => isFigure(point.value))
                        .map((point) => ({
                            label: point.seriesName,
                            value: written(spec, point.value, spec.series === undefined ? point.seriesIndex : 0),
                            color: point.color,
                        })),
                ),
        },
        polar: { radius: ['6%', '80%'], center: ['50%', '52%'] },
        angleAxis: {
            type: 'category',
            data: categories,
            startAngle: 90 + 180 / Math.max(1, categories.length),
            axisLine: { show: true, lineStyle: { color: look.border } },
            axisTick: { show: false },
            axisLabel: { color: look.muted, fontFamily: look.font, fontSize: look.size.label, hideOverlap: true, ...categoryLabels(spec) },
            splitLine: { show: true, lineStyle: { color: look.grid } },
        },
        radiusAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { show: true, lineStyle: { color: look.grid } },
            splitNumber: 3,
        },
        series: series.map((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            return {
                type: 'bar',
                name: entry.name,
                coordinateSystem: 'polar',
                stack: 'all',
                barCategoryGap: '8%',
                itemStyle: { color, borderColor: look.card, borderWidth: 1 },
                data: entry.values.map((value, at) =>
                    single && spec.colors?.[categories[at]] !== undefined
                        ? { value, itemStyle: { color: colorOf(spec, look, categories[at], at) } }
                        : value,
                ),
            }
        }),
    }
}
