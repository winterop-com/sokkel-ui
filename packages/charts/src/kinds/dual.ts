import { formatCompact } from '../data'
import { tooltipMarkup } from '../look'
import { shaped, written } from './categories'
import { colorOf, fieldsOf, unitAt, type ChartBuilder } from './spec'

/**
 * Two measures over the same categories on axes of their own: the first `y` field as bars on the
 * left axis and the second as a line on the right one, such as runs and their failure rate. Each
 * field is combined its own way when `aggregate` lists two, and written with its own unit when
 * `unit` lists two. Reads `x`, `y` (two fields), `aggregate`, `order`, `colors`, `format`, `unit`
 * and `smooth`.
 */
export const dual: ChartBuilder = (spec, look) => {
    const fields = fieldsOf(spec)
    if (fields.length < 2) throw new Error('A dual chart needs two y fields: the bars and the line.')
    const { categories, series } = shaped({ ...spec, y: fields.slice(0, 2), series: undefined, stack: undefined })
    const valueAxis = (side: 'left' | 'right', field: string, index: number) => ({
        type: 'value',
        position: side,
        name: field,
        nameGap: 8,
        nameTextStyle: { align: side, padding: 0 },
        alignTicks: side === 'right',
        axisLabel: { formatter: (value: number) => `${formatCompact(value)}${unitAt(spec, index)}`, hideOverlap: true },
        splitLine: side === 'right' ? { show: false } : undefined,
    })
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (
                points: { axisValueLabel: string; seriesName: string; seriesIndex: number; value: number | null; color: string }[],
            ) =>
                tooltipMarkup(
                    points[0]?.axisValueLabel ?? '',
                    points.map((point) => ({
                        label: point.seriesName,
                        value: written(spec, point.value, point.seriesIndex),
                        color: point.color,
                    })),
                ),
        },
        grid: { left: 4, right: 10, top: 26, bottom: 4 },
        xAxis: { type: 'category', data: categories, axisLabel: { hideOverlap: true } },
        yAxis: [valueAxis('left', fields[0], 0), valueAxis('right', fields[1], 1)],
        series: series.map((entry, index) => {
            const color = colorOf(spec, look, entry.name, index)
            return index === 0
                ? {
                      type: 'bar',
                      name: entry.name,
                      data: entry.values,
                      yAxisIndex: 0,
                      barCategoryGap: '28%',
                      barMaxWidth: 32,
                      itemStyle: { color, borderRadius: [look.corner, look.corner, 0, 0] },
                  }
                : {
                      type: 'line',
                      name: entry.name,
                      data: entry.values,
                      yAxisIndex: 1,
                      z: 3,
                      smooth: spec.smooth === true,
                      showSymbol: true,
                      symbolSize: 5,
                      connectNulls: false,
                      itemStyle: { color, borderColor: look.card, borderWidth: 1 },
                      lineStyle: { color, width: 2 },
                  }
        }),
    }
}
