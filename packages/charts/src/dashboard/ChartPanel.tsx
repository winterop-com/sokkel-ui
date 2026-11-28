import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Chart, useSpec } from '../Chart'
import { chartLegend } from '../chart-legend'
import { ChartFrame, type ChartFrameViewProps, type ChartFrameWords } from '../ChartFrame'
import type { LegendStat } from '../ChartLegend'
import type { ChartKind, ChartSpec } from '../kinds'
import { written } from '../kinds/spec'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'

export type ChartPanelProps = ChartSpec & {
    kind: ChartKind
    /** What the chart shows, for a screen reader; the title when omitted. */
    label?: string
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    legend?: 'list' | 'table' | 'none'
    legendStats?: readonly LegendStat[]
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    empty?: boolean
    /** A failed query, its raw message, Retry, and figures kept but behind; see `PanelStateProps`. */
    error?: boolean | string
    technical?: string
    onRetry?: () => void
    stale?: boolean | string
    file?: string
    /** Expanding also takes the screen, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    /** Whether the panel is in its window, held from outside with `onExpandedChange`, as when the app's own menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    /** The frame's words; the chart's own are the spec's `words`. */
    frameWords?: Partial<ChartFrameWords>
    className?: string
} & ChartFrameViewProps

/**
 * A dashboard panel of a `Chart` drawn from rows, for what the other panels do not draw: a ring of
 * shares, a cloud of points, or any kind the rows read best as. `kind` and the spec's fields say
 * how, as they do for `Chart`, and the legend lists what the kind draws, hiding and emphasizing it.
 * Keep `rows` stable between renders.
 */
export function ChartPanel({
    kind,
    label,
    title,
    subtitle,
    info,
    actions,
    menu,
    legend = 'list',
    legendStats,
    span = 'half',
    bodyClassName = 'h-48',
    loading,
    empty,
    error,
    technical,
    onRetry,
    stale,
    file,
    fullscreen,
    expanded,
    onExpandedChange,
    frameWords,
    data,
    defaultView,
    view,
    onViewChange,
    className,
    ...rest
}: ChartPanelProps) {
    const spec = useSpec(rest)
    const items = useMemo(() => (legend === 'none' ? undefined : chartLegend(kind, spec)), [legend, kind, spec])
    const write = useMemo(() => (figure: number) => written(spec, figure), [spec])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            menu={menu}
            legend={items}
            legendMode={legend === 'table' ? 'table' : 'list'}
            legendStats={legendStats}
            legendFormat={write}
            file={file}
            fullscreen={fullscreen}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            loading={loading}
            empty={empty}
            error={error}
            technical={technical}
            onRetry={onRetry}
            stale={stale}
            bodyClassName={bodyClassName}
            words={frameWords}
            data={data}
            defaultView={defaultView}
            view={view}
            onViewChange={onViewChange}
            className={cn(SPAN[span], className)}
        >
            {(state) => <Chart kind={kind} label={label ?? (typeof title === 'string' ? title : 'Chart')} {...spec} {...state} />}
        </ChartFrame>
    )
}
