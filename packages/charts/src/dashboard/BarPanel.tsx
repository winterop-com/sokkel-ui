import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameViewProps, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import { Chart } from '../Chart'
import type { ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { legendItems, panelFormat, seriesSpec, valueWriter, type PanelSeries } from './series'

export interface BarPanelProps extends ChartFrameViewProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    /** The categories, written for a reader. */
    x: readonly string[]
    series: readonly PanelSeries[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    /** Stacks the series; `percent` stacks each category's share of its total, to 100%. */
    stacked?: boolean | 'percent'
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
    /** Expanding also takes the screen, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    /** Whether the panel is in its window, held from outside with `onExpandedChange`, as when the app's own menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    words?: Partial<ChartFrameWords>
    className?: string
}

/**
 * A dashboard panel of bars: one or more series per category, side by side or stacked, upright or
 * lying down, or as each category's share of its total. A tight gap draws a histogram's tall touching bars. Keep `series` and `x` stable
 * between renders.
 */
export function BarPanel({
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
    fullscreen,
    expanded,
    onExpandedChange,
    words,
    data,
    defaultView,
    view,
    onViewChange,
    className,
}: BarPanelProps) {
    const spec = useMemo<ChartSpec>(
        () => ({
            ...seriesSpec(x, series),
            ...panelFormat(unit, decimals, format),
            stack: stacked === 'percent' ? 'percent' : stacked === true ? 'stacked' : undefined,
            horizontal,
            gap,
            labelEvery,
        }),
        [x, series, unit, decimals, format, stacked, horizontal, gap, labelEvery],
    )
    const items = useMemo(() => legendItems(series), [series])
    const write = useMemo(
        () => (stacked === 'percent' ? undefined : valueWriter(unit, decimals, format)),
        [stacked, unit, decimals, format],
    )
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
            data={data}
            defaultView={defaultView}
            view={view}
            onViewChange={onViewChange}
            className={cn(SPAN[span], className)}
        >
            {(state) => <Chart kind="bar" label={typeof title === 'string' ? title : 'Bar chart'} {...spec} {...state} />}
        </ChartFrame>
    )
}
