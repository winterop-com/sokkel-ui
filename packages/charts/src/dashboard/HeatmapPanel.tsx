import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import { EChart } from '../EChart'
import type { ChartLook } from '../look'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { axisWriter, valueWriter } from './series'

/** One heatmap cell: the x index, the y index and its value. */
export type HeatCell = readonly [x: number, y: number, value: number]

/** The scale's colors: from the card to one token, or from the card through several in turn. */
function scaleColors(look: ChartLook, scale: string | readonly string[]): string[] {
    if (typeof scale === 'string') return look.ramp(scale, 7)
    const [first, ...rest] = scale
    return [look.mix(`var(--${first})`, 10), look.mix(`var(--${first})`, 45), look.token(first), ...rest.map(look.token)]
}

/** The option for a heatmap, built from the look. */
export function heatmapOption({
    x,
    y,
    cells,
    unit,
    decimals,
    format,
    scale = 'warning',
    labelEvery,
    showScale = true,
}: {
    x: readonly string[]
    y: readonly string[]
    cells: readonly HeatCell[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    scale?: string | readonly string[]
    labelEvery?: number
    showScale?: boolean
}) {
    const write = valueWriter(unit, decimals, format)
    const top = cells.reduce((most, cell) => Math.max(most, cell[2]), 0)
    return (look: ChartLook) => ({
        tooltip: {
            position: 'top',
            formatter: (params: { value: HeatCell }) => `${x[params.value[0]]}, ${y[params.value[1]]}<br/><b>${write(params.value[2])}</b>`,
        },
        grid: { right: showScale ? 44 : 10 },
        xAxis: {
            type: 'category',
            data: x,
            axisLabel: { interval: labelEvery === undefined ? 'auto' : labelEvery - 1, hideOverlap: true },
            splitLine: { show: false },
            axisLine: { show: false },
        },
        yAxis: { type: 'category', data: y, axisLabel: { interval: 0 }, splitLine: { show: false }, axisLine: { show: false } },
        visualMap: {
            show: showScale,
            min: 0,
            max: top,
            orient: 'vertical',
            right: 0,
            top: 4,
            bottom: 20,
            itemWidth: 8,
            itemHeight: 100,
            text: [axisWriter(unit)(top), '0'],
            textGap: 4,
            calculable: false,
            inRange: { color: scaleColors(look, scale) },
        },
        series: [
            {
                name: 'cells',
                type: 'heatmap',
                data: cells,
                itemStyle: { borderColor: look.card, borderWidth: 1, borderRadius: look.corner },
                emphasis: { itemStyle: { borderColor: look.foreground } },
            },
        ],
    })
}

export interface HeatmapPanelProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    x: readonly string[]
    y: readonly string[]
    cells: readonly HeatCell[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    scale?: string | readonly string[]
    labelEvery?: number
    showScale?: boolean
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
 * A dashboard panel of a heatmap: a value for each pair of x and y categories, such as runs per
 * hour and duration, shaded from the card to `scale` with the scale beside it. `scale` names one
 * token, or several to step through. Keep `cells` stable between renders.
 */
export function HeatmapPanel({
    title,
    subtitle,
    info,
    actions,
    menu,
    x,
    y,
    cells,
    unit,
    decimals,
    format,
    scale,
    labelEvery,
    showScale,
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
}: HeatmapPanelProps) {
    const option = useMemo(
        () => heatmapOption({ x, y, cells, unit, decimals, format, scale, labelEvery, showScale }),
        [x, y, cells, unit, decimals, format, scale, labelEvery, showScale],
    )
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            menu={menu}
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
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Heatmap'} {...state} />}
        </ChartFrame>
    )
}
