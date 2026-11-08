import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import { EChart } from '../EChart'
import type { ChartLook } from '../look'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { axes, legendItems, seriesToken, valueWriter, type PanelSeries } from './series'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** How a time series is drawn: lines alone, lines over a fading area, or lines over a solid area. */
export type SeriesFill = 'none' | 'gradient' | 'solid'

/** The option for a time-series chart, built from the look. */
export function timeSeriesOption({
    x,
    series,
    unit,
    decimals,
    format,
    fill = 'gradient',
    stacked = false,
    step = false,
    thresholds,
    min,
    max,
    labelEvery,
}: {
    x: readonly string[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    fill?: SeriesFill
    stacked?: boolean
    step?: boolean
    thresholds?: readonly Threshold[]
    min?: number
    max?: number
    labelEvery?: number
}) {
    const write = valueWriter(unit, decimals, format)
    return (look: ChartLook) => {
        const shared = axes(look, x, unit, labelEvery)
        const lines = (thresholds ?? []).filter((step) => step.value !== undefined)
        return {
            tooltip: { trigger: 'axis', valueFormatter: (value: number | null) => (value === null ? '-' : write(value)) },
            xAxis: { ...shared.xAxis, boundaryGap: false },
            yAxis: { ...shared.yAxis, min, max },
            series: series.map((entry, index) => {
                const color = look.token(seriesToken(entry, index))
                const area =
                    fill === 'none' || entry.dashed === true
                        ? undefined
                        : fill === 'solid' || stacked
                          ? { opacity: 1, color: look.mix(color, stacked ? 62 : 32) }
                          : {
                                opacity: 1,
                                color: {
                                    type: 'linear',
                                    x: 0,
                                    y: 0,
                                    x2: 0,
                                    y2: 1,
                                    colorStops: [
                                        { offset: 0, color: look.mix(color, 42) },
                                        { offset: 1, color: look.mix(color, 3) },
                                    ],
                                },
                            }
                return {
                    name: entry.name,
                    type: 'line',
                    data: entry.values,
                    color,
                    step: step ? 'end' : undefined,
                    stack: entry.stack ?? (stacked ? 'total' : undefined),
                    connectNulls: false,
                    lineStyle: { width: entry.dashed === true ? 1.25 : 1.5, type: entry.dashed === true ? 'dashed' : 'solid' },
                    areaStyle: area,
                    markLine:
                        index === 0 && lines.length > 0
                            ? {
                                  silent: true,
                                  symbol: 'none',
                                  data: lines.map((line) => ({
                                      yAxis: line.value,
                                      lineStyle: { color: look.token(line.color), type: 'dashed', width: 1 },
                                      label: {
                                          show: true,
                                          position: 'insideEndTop',
                                          formatter: () => write(line.value ?? 0),
                                          color: look.token(line.color),
                                          fontFamily: look.font,
                                          fontSize: look.size.small,
                                      },
                                  })),
                              }
                            : undefined,
                }
            }),
        }
    }
}

export interface TimeSeriesPanelProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** The time of each value, written for a reader. */
    x: readonly string[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    fill?: SeriesFill
    stacked?: boolean
    step?: boolean
    thresholds?: readonly Threshold[]
    min?: number
    max?: number
    /** Labels every nth time on the axis; ECharts picks when omitted. */
    labelEvery?: number
    legend?: 'list' | 'table' | 'none'
    legendStats?: readonly LegendStat[]
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    empty?: boolean
    file?: string
    words?: Partial<ChartFrameWords>
    className?: string
}

/**
 * A dashboard panel of values over time: lines, over a fading or solid area, alone or stacked,
 * with dashed threshold lines, and a legend under it as a row or a table of each series' min, max,
 * mean and current value. Keep `series` and `x` stable between renders.
 */
export function TimeSeriesPanel({
    title,
    subtitle,
    info,
    actions,
    x,
    series,
    unit,
    decimals,
    format,
    fill,
    stacked,
    step,
    thresholds,
    min,
    max,
    labelEvery,
    legend = 'list',
    legendStats,
    span = 'half',
    bodyClassName = 'h-48',
    loading,
    empty,
    file,
    words,
    className,
}: TimeSeriesPanelProps) {
    const option = useMemo(
        () => timeSeriesOption({ x, series, unit, decimals, format, fill, stacked, step, thresholds, min, max, labelEvery }),
        [x, series, unit, decimals, format, fill, stacked, step, thresholds, min, max, labelEvery],
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
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Time series'} {...state} />}
        </ChartFrame>
    )
}
