import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import { Chart } from '../Chart'
import type { ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { legendItems, panelFormat, seriesSpec, type PanelSeries } from './series'

/** One spoke of a radar chart: the measure it stands for and the value at its rim. */
export interface RadarSpoke {
    name: string
    max: number
}

export interface RadarPanelProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
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
    /** Expanding also takes the screen, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    /** Whether the panel is in its window, held from outside with `onExpandedChange`, as when the app's own menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    words?: Partial<ChartFrameWords>
    className?: string
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
    menu,
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
    fullscreen,
    expanded,
    onExpandedChange,
    words,
    className,
}: RadarPanelProps) {
    const spec = useMemo<ChartSpec>(
        () => ({
            ...seriesSpec(
                spokes.map((spoke) => spoke.name),
                series,
            ),
            ...panelFormat(unit, decimals, format),
            rims: Object.fromEntries(spokes.map((spoke) => [spoke.name, spoke.max])),
            round: shape === 'circle',
            levels: rings,
            fill: fill === false ? 'none' : undefined,
        }),
        [spokes, series, unit, decimals, format, shape, fill, rings],
    )
    const items = useMemo(() => legendItems(series).map((item) => ({ ...item, values: undefined })), [series])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            menu={menu}
            legend={legend === 'none' ? undefined : items}
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
            {(state) => <Chart kind="radar" label={typeof title === 'string' ? title : 'Radar chart'} {...spec} {...state} />}
        </ChartFrame>
    )
}
