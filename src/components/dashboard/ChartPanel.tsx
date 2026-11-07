import { useMemo, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Chart, chartLegend, useSpec } from '../chart/Chart'
import { ChartFrame, type ChartFrameWords } from '../chart/ChartFrame'
import type { LegendStat } from '../chart/ChartLegend'
import type { ChartKind, ChartSpec } from '../chart/kinds'
import { written } from '../chart/kinds/categories'
import { SPAN, type PanelSpan } from './DashboardGrid'

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
    legend = 'list',
    legendStats,
    span = 'half',
    bodyClassName = 'h-48',
    loading,
    empty,
    file,
    frameWords,
    className,
    ...rest
}: ChartSpec & {
    kind: ChartKind
    /** What the chart shows, for a screen reader; the title when omitted. */
    label?: string
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    legend?: 'list' | 'table' | 'none'
    legendStats?: readonly LegendStat[]
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    empty?: boolean
    file?: string
    /** The frame's words; the chart's own are the spec's `words`. */
    frameWords?: ChartFrameWords
    className?: string
}) {
    const spec = useSpec(rest)
    const items = useMemo(() => (legend === 'none' ? undefined : chartLegend(kind, spec)), [legend, kind, spec])
    const write = useMemo(() => (figure: number) => written(spec, figure), [spec])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            legend={items}
            legendMode={legend === 'table' ? 'table' : 'list'}
            legendStats={legendStats}
            legendFormat={write}
            file={file}
            loading={loading}
            empty={empty}
            bodyClassName={bodyClassName}
            words={frameWords}
            className={cn(SPAN[span], className)}
        >
            {(state) => <Chart kind={kind} label={label ?? (typeof title === 'string' ? title : 'Chart')} {...spec} {...state} />}
        </ChartFrame>
    )
}
