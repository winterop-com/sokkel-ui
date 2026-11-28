import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameViewProps, type ChartFrameWords } from '../ChartFrame'
import { Chart } from '../Chart'
import type { ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { CATEGORY, FIGURE, heatmapRows, panelFormat, SERIES, usePanelFields, type PanelWords } from './series'

/** One heatmap cell: the x index, the y index and its value. */
export type HeatCell = readonly [x: number, y: number, value: number]

export interface HeatmapPanelProps extends ChartFrameViewProps {
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
    /** The frame's words, and the heads of its data view's columns. */
    words?: Partial<ChartFrameWords & PanelWords>
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
    scale = 'warning',
    labelEvery,
    showScale = true,
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
}: HeatmapPanelProps) {
    const fieldNames = usePanelFields(words)
    const spec = useMemo<ChartSpec>(
        () => ({
            rows: heatmapRows(x, y, cells),
            x: CATEGORY,
            y: FIGURE,
            series: SERIES,
            order: x,
            // The first of y is drawn at the bottom, as on a chart's value axis.
            seriesOrder: [...y].reverse(),
            fieldNames,
            ...panelFormat(unit, decimals, format),
            min: 0,
            scale,
            labelEvery,
            showScale,
        }),
        [x, y, cells, fieldNames, unit, decimals, format, scale, labelEvery, showScale],
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
            data={data}
            defaultView={defaultView}
            view={view}
            onViewChange={onViewChange}
            className={cn(SPAN[span], className)}
        >
            {(state) => <Chart kind="heatmap" label={typeof title === 'string' ? title : 'Heatmap'} {...spec} {...state} />}
        </ChartFrame>
    )
}
