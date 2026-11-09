import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import { EChart } from '../EChart'
import type { ChartLook } from '../look'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { axes, axisWriter, legendItems, seriesToken, valueWriter, type PanelSeries } from './series'

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

/** The option for bars and lines over the same categories, on up to two value axes, built from the look. */
export function comboOption({
    x,
    series,
    left = {},
    right = {},
    stacked = false,
    labelEvery,
}: {
    x: readonly string[]
    series: readonly ComboSeries[]
    left?: ComboAxis
    right?: ComboAxis
    /** Stacks the bars on each other; lines are never stacked. */
    stacked?: boolean
    labelEvery?: number
}) {
    const sides = { left, right }
    const writers = {
        left: valueWriter(left.unit, left.decimals, left.format),
        right: valueWriter(right.unit, right.decimals, right.format),
    }
    const twoAxes = series.some((entry) => entry.axis === 'right')
    const bars = series.filter((entry) => entry.kind === 'bar')
    return (look: ChartLook) => {
        const shared = axes(look, x, left.unit, labelEvery)
        const valueAxis = (side: 'left' | 'right') => {
            const spec = sides[side]
            return {
                ...shared.yAxis,
                position: side,
                name: spec.name,
                nameGap: 8,
                nameTextStyle: { align: side, padding: 0 },
                min: spec.min,
                max: spec.max,
                // The right axis keeps the left one's grid unless its range is fixed, where aligned ticks land on odd values.
                alignTicks: side === 'right' && spec.min === undefined && spec.max === undefined,
                axisLabel: { formatter: axisWriter(spec.unit), hideOverlap: true },
                splitLine: side === 'right' ? { show: false } : undefined,
            }
        }
        const named = left.name !== undefined || right.name !== undefined
        return {
            tooltip: { trigger: 'axis', axisPointer: { type: bars.length > 0 ? 'shadow' : 'line' } },
            grid: named ? { top: 26 } : undefined,
            xAxis: { ...shared.xAxis, axisLine: { show: true, lineStyle: { color: look.border } } },
            yAxis: twoAxes ? [valueAxis('left'), valueAxis('right')] : [valueAxis('left')],
            series: series.map((entry, index) => {
                const side = entry.axis ?? 'left'
                const color = look.token(seriesToken(entry, index))
                const write = writers[side]
                const common = {
                    name: entry.name,
                    data: entry.values,
                    color,
                    yAxisIndex: side === 'right' && twoAxes ? 1 : 0,
                    tooltip: { valueFormatter: (value: number | null) => (value === null ? '-' : write(value)) },
                }
                if (entry.kind === 'line') {
                    return {
                        ...common,
                        type: 'line',
                        z: 3,
                        showSymbol: entry.dashed !== true,
                        symbolSize: 5,
                        connectNulls: false,
                        itemStyle: { borderColor: look.card, borderWidth: 1 },
                        lineStyle: { width: entry.dashed === true ? 1.25 : 2, type: entry.dashed === true ? 'dashed' : 'solid' },
                    }
                }
                const top = !stacked || entry === bars[bars.length - 1]
                return {
                    ...common,
                    type: 'bar',
                    stack: entry.stack ?? (stacked ? 'bars' : undefined),
                    barCategoryGap: '28%',
                    barMaxWidth: 32,
                    itemStyle: {
                        borderRadius: top ? [look.corner, look.corner, 0, 0] : 0,
                        borderColor: stacked ? look.card : undefined,
                        borderWidth: stacked ? 1 : 0,
                    },
                }
            }),
        }
    }
}

export interface ComboPanelProps {
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
    className,
}: ComboPanelProps) {
    const option = useMemo(
        () => comboOption({ x, series, left, right, stacked, labelEvery }),
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
            className={cn(SPAN[span], className)}
        >
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Bars and lines'} {...state} />}
        </ChartFrame>
    )
}
