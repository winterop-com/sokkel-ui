import { useMemo } from 'react'

import { Chart, chartLegend } from '../../components/chart/Chart'
import { ChartFrame } from '../../components/chart/ChartFrame'
import type { ChartKind, ChartSpec } from '../../components/chart/kinds'

/** A chart drawn from rows in its frame, with the legend the kind gives for the spec. */
export function Framed({
    kind,
    spec,
    title,
    subtitle,
    label,
    bodyClassName,
}: {
    kind: ChartKind
    spec: ChartSpec
    title: string
    subtitle?: string
    label: string
    bodyClassName?: string
}) {
    const legend = useMemo(() => chartLegend(kind, spec), [kind, spec])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            legend={legend}
            file={title.toLowerCase().replaceAll(' ', '-')}
            bodyClassName={bodyClassName}
        >
            {(state) => <Chart kind={kind} label={label} {...spec} {...state} />}
        </ChartFrame>
    )
}
