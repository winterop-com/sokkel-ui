import { useMemo, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { ChartFrame, type ChartFrameWords } from '../chart/ChartFrame'
import { EChart } from '../chart/EChart'
import type { ChartLook } from '../chart/look'
import { SPAN, type PanelSpan } from './DashboardGrid'
import { legendItems, seriesToken, valueWriter, type PanelSeries } from './series'

/** One spoke of a radar chart: the measure it stands for and the value at its rim. */
export interface RadarSpoke {
    name: string
    max: number
}

/** The option for a radar chart, one polygon per series over the same spokes, built from the look. */
export function radarOption({
    spokes,
    series,
    unit,
    decimals,
    format,
    shape = 'polygon',
    fill = true,
    rings = 4,
}: {
    spokes: readonly RadarSpoke[]
    /** Each series' values, one per spoke in order. */
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    shape?: 'polygon' | 'circle'
    /** Fills each polygon faintly in its series' color. */
    fill?: boolean
    rings?: number
}) {
    const write = valueWriter(unit, decimals, format)
    return (look: ChartLook) => ({
        tooltip: {
            trigger: 'item',
            valueFormatter: (value: number | null) => (value === null ? '-' : write(value)),
        },
        radar: {
            indicator: spokes.map((spoke) => ({ name: spoke.name, max: spoke.max })),
            shape,
            radius: '68%',
            center: ['50%', '52%'],
            splitNumber: rings,
            axisName: { color: look.muted, fontFamily: look.font, fontSize: look.size.label },
            axisNameGap: 6,
            axisLine: { lineStyle: { color: look.grid } },
            splitLine: { lineStyle: { color: look.grid } },
            splitArea: { show: false },
        },
        // One series per polygon, so the legend beside the chart can hide and emphasize each by name.
        series: series.map((entry, index) => {
            const color = look.token(seriesToken(entry, index))
            return {
                name: entry.name,
                type: 'radar',
                color,
                symbol: entry.dashed === true ? 'none' : 'circle',
                symbolSize: 4,
                emphasis: { focus: 'series' },
                blur: { lineStyle: { opacity: 0.2 }, areaStyle: { opacity: 0.04 }, itemStyle: { opacity: 0.25 } },
                lineStyle: { width: 1.5, type: entry.dashed === true ? 'dashed' : 'solid' },
                areaStyle: fill && entry.dashed !== true ? { color, opacity: 0.14 } : undefined,
                data: [{ name: entry.name, value: entry.values }],
            }
        }),
    })
}

/**
 * A dashboard panel comparing a few items on several measures at once: one spoke per measure,
 * each scaled to its own rim, and one polygon per item, faintly filled. A dashed series draws a
 * reference, such as a target, as an outline. Keep `spokes` and `series` stable between renders.
 */
export function RadarPanel({
    title,
    subtitle,
    info,
    actions,
    spokes,
    series,
    unit,
    decimals,
    format,
    shape,
    fill,
    rings,
    legend = series.length > 1 ? 'list' : 'none',
    span = 'third',
    bodyClassName = 'h-64',
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
    spokes: readonly RadarSpoke[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    shape?: 'polygon' | 'circle'
    fill?: boolean
    rings?: number
    legend?: 'list' | 'none'
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    empty?: boolean
    file?: string
    words?: ChartFrameWords
    className?: string
}) {
    const option = useMemo(
        () => radarOption({ spokes, series, unit, decimals, format, shape, fill, rings }),
        [spokes, series, unit, decimals, format, shape, fill, rings],
    )
    const items = useMemo(() => legendItems(series).map((item) => ({ ...item, values: undefined })), [series])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            legend={legend === 'none' ? undefined : items}
            file={file}
            loading={loading}
            empty={empty}
            bodyClassName={bodyClassName}
            words={words}
            className={cn(SPAN[span], className)}
        >
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Radar chart'} {...state} />}
        </ChartFrame>
    )
}
