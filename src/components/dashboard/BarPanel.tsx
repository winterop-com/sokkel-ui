import { useMemo, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { ChartFrame, type ChartFrameWords } from '../chart/ChartFrame'
import type { LegendStat } from '../chart/ChartLegend'
import { EChart } from '../chart/EChart'
import type { ChartLook } from '../chart/look'
import { SPAN, type PanelSpan } from './DashboardGrid'
import { axes, axisWriter, legendItems, seriesToken, valueWriter, type PanelSeries } from './series'

/** The option for a bar chart, built from the look. */
export function barOption({
    x,
    series,
    unit,
    decimals,
    format,
    stacked = false,
    horizontal = false,
    gap = 'normal',
    labelEvery,
}: {
    x: readonly string[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    stacked?: boolean
    horizontal?: boolean
    gap?: 'tight' | 'normal'
    labelEvery?: number
}) {
    const write = valueWriter(unit, decimals, format)
    return (look: ChartLook) => {
        const shared = axes(look, x, unit, labelEvery)
        const category = { ...shared.xAxis, axisLine: { show: true, lineStyle: { color: look.border } } }
        const value = horizontal
            ? { ...shared.yAxis, type: 'value', axisLabel: { formatter: axisWriter(unit), hideOverlap: true } }
            : shared.yAxis
        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                valueFormatter: (value: number | null) => (value === null ? '-' : write(value)),
            },
            xAxis: horizontal ? value : category,
            yAxis: horizontal ? { ...category, inverse: true, splitLine: { show: false } } : value,
            series: series.map((entry, index) => {
                const top = !stacked || index === series.length - 1
                const radius = top ? (horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0]) : 0
                return {
                    name: entry.name,
                    type: 'bar',
                    data: entry.values,
                    color: look.token(seriesToken(entry, index)),
                    stack: entry.stack ?? (stacked ? 'total' : undefined),
                    barCategoryGap: gap === 'tight' ? '6%' : '28%',
                    barMaxWidth: gap === 'tight' ? 400 : 32,
                    itemStyle: { borderRadius: radius, borderColor: stacked ? look.card : undefined, borderWidth: stacked ? 1 : 0 },
                }
            }),
        }
    }
}

/**
 * A dashboard panel of bars: one or more series per category, side by side or stacked, upright or
 * lying down. A tight gap draws a histogram's tall touching bars. Keep `series` and `x` stable
 * between renders.
 */
export function BarPanel({
    title,
    subtitle,
    info,
    actions,
    x,
    series,
    unit,
    decimals,
    format,
    stacked,
    horizontal,
    gap,
    labelEvery,
    legend = series.length > 1 ? 'list' : 'none',
    legendStats,
    span = 'half',
    bodyClassName = 'h-48',
    loading,
    empty,
    file,
    words,
    className,
}: {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** The categories, written for a reader. */
    x: readonly string[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    stacked?: boolean
    horizontal?: boolean
    gap?: 'tight' | 'normal'
    labelEvery?: number
    legend?: 'list' | 'table' | 'none'
    legendStats?: readonly LegendStat[]
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    empty?: boolean
    file?: string
    words?: ChartFrameWords
    className?: string
}) {
    const option = useMemo(
        () => barOption({ x, series, unit, decimals, format, stacked, horizontal, gap, labelEvery }),
        [x, series, unit, decimals, format, stacked, horizontal, gap, labelEvery],
    )
    const items = useMemo(() => legendItems(series), [series])
    const write = useMemo(() => valueWriter(unit, decimals, format), [unit, decimals, format])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            legend={legend === 'none' ? undefined : items}
            legendMode={legend === 'table' ? 'table' : 'list'}
            legendStats={legendStats}
            legendFormat={write}
            file={file}
            loading={loading}
            empty={empty}
            bodyClassName={bodyClassName}
            words={words}
            className={cn(SPAN[span], className)}
        >
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Bar chart'} {...state} />}
        </ChartFrame>
    )
}
