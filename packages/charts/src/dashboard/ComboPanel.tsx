import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameViewProps, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import { Chart } from '../Chart'
import type { ChartAxis, ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { legendItems, seriesSpec, type PanelSeries } from './series'
import { formatValue } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** One series of a combined chart: bars or a line, measured on the left axis or the right one. */
export interface ComboSeries extends PanelSeries {
    kind: 'bar' | 'line'
    /** The axis the series is measured on; the left one when omitted. */
    axis?: 'left' | 'right'
}

/** One value axis of a combined chart: its name, the unit its labels and tooltip carry, and its range. */
export interface ComboAxis {
    name?: string
    unit?: string
    decimals?: number
    format?: (value: number) => string
    min?: number
    max?: number
}

/** A combined chart's axis as the dual kind reads it, its figures written to its decimals with its unit after. */
function comboAxis(axis: ComboAxis = {}): ChartAxis {
    const format = axis.format ?? ((value: number) => `${formatValue(value, axis.decimals)}${axis.unit ?? ''}`)
    return { name: axis.name, unit: axis.unit ?? '', format, min: axis.min, max: axis.max }
}

export interface ComboPanelProps extends ChartFrameViewProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    /** The categories, written for a reader. */
    x: readonly string[]
    series: readonly ComboSeries[]
    left?: ComboAxis
    right?: ComboAxis
    stacked?: boolean
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
 * A dashboard panel of bars and lines over the same categories, such as a count per week in bars
 * and a rate in a line. A series measured on the right axis gets an axis of its own there, its
 * ticks lined up with the left axis' grid; each series' tooltip value carries its own axis' unit.
 * Keep `series` and `x` stable between renders.
 */
export function ComboPanel({
    title,
    subtitle,
    info,
    actions,
    menu,
    x,
    series,
    left,
    right,
    stacked,
    labelEvery,
    legend = 'list',
    legendStats,
    span = 'half',
    bodyClassName = 'h-56',
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
}: ComboPanelProps) {
    const spec = useMemo<ChartSpec>(
        () => ({
            ...seriesSpec(x, series),
            layers: Object.fromEntries(series.map((entry) => [entry.name, { mark: entry.kind, axis: entry.axis ?? 'left' }])),
            axes: { left: comboAxis(left), right: comboAxis(right) },
            stack: stacked === true ? 'stacked' : undefined,
            labelEvery,
        }),
        [x, series, left, right, stacked, labelEvery],
    )
    const items = useMemo(() => legendItems(series), [series])
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
            {(state) => <Chart kind="dual" label={typeof title === 'string' ? title : 'Bars and lines'} {...spec} {...state} />}
        </ChartFrame>
    )
}
