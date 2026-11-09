import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import { Chart } from '../Chart'
import type { ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { legendItems, panelFormat, seriesSpec, valueWriter, type PanelSeries } from './series'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** How a time series is drawn: lines alone, lines over a fading area, or lines over a solid area. */
export type SeriesFill = 'none' | 'gradient' | 'solid'

export interface TimeSeriesPanelProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
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
    /** Expanding also takes the screen, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    /** Whether the panel is in its window, held from outside with `onExpandedChange`, as when the app's own menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    words?: Partial<ChartFrameWords>
    className?: string
}

/**
 * A dashboard panel of values over time: lines, over a fading or solid area, alone or stacked,
 * with dashed threshold lines, and a legend under it as a row or a table of each series' min, max,
 * mean and current value. It draws the `area` kind, or `line` without a fill and `step` for
 * steps. Keep `series` and `x` stable between renders.
 */
export function TimeSeriesPanel({
    title,
    subtitle,
    info,
    actions,
    menu,
    x,
    series,
    unit,
    decimals,
    format,
    fill = 'gradient',
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
    fullscreen,
    expanded,
    onExpandedChange,
    words,
    className,
}: TimeSeriesPanelProps) {
    const spec = useMemo<ChartSpec>(
        () => ({
            ...seriesSpec(x, series),
            ...panelFormat(unit, decimals, format),
            // Stacked areas are filled evenly, so each band reads against the one under it.
            fill: stacked === true && fill === 'gradient' ? 'solid' : fill,
            stack: stacked === true ? 'stacked' : undefined,
            steps: thresholds,
            min,
            max,
            labelEvery,
        }),
        [x, series, unit, decimals, format, fill, stacked, thresholds, min, max, labelEvery],
    )
    const kind = step === true ? 'step' : fill === 'none' ? 'line' : 'area'
    const items = useMemo(() => legendItems(series), [series])
    const write = useMemo(() => valueWriter(unit, decimals, format), [unit, decimals, format])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            menu={menu}
            legend={legend === 'none' ? undefined : items}
            legendMode={legend === 'table' ? 'table' : 'list'}
            legendStats={legendStats}
            legendFormat={write}
            file={file}
            fullscreen={fullscreen}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            loading={loading}
            empty={empty}
            bodyClassName={bodyClassName}
            words={words}
            className={cn(SPAN[span], className)}
        >
            {(state) => <Chart kind={kind} label={typeof title === 'string' ? title : 'Time series'} {...spec} {...state} />}
        </ChartFrame>
    )
}
