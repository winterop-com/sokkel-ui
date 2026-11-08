import { useMemo, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import { EChart } from '../EChart'
import { dial } from '../kinds/gauge'
import type { ChartLook } from '../look'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { valueWriter } from './series'
import { thresholdColor, type Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** The option for a gauge, built from the look. */
export function gaugeOption({
    value,
    min = 0,
    max = 100,
    thresholds,
    color = 'chart-2',
    unit,
    decimals,
    format,
    label,
}: {
    value: number | null
    min?: number
    max?: number
    thresholds?: readonly Threshold[]
    color?: string
    unit?: string
    decimals?: number
    format?: (value: number) => string
    label?: string
}) {
    const write = valueWriter(unit, decimals, format)
    return (look: ChartLook) => ({
        series: dial(look, {
            value,
            min,
            max,
            steps: thresholds ?? [{ color }],
            tone: look.token(thresholdColor(value, thresholds) ?? color),
            write,
            label,
        }),
    })
}

/**
 * A dashboard panel of one reading on an arc from `min` to `max`, filled in the color its
 * thresholds give it, with the thresholds themselves as a thin band outside the arc.
 */
export function GaugePanel({
    title,
    info,
    actions,
    value,
    min,
    max,
    thresholds,
    color,
    unit,
    decimals,
    format,
    label,
    span = 'sixth',
    bodyClassName = 'h-32',
    loading,
    file,
    words,
    className,
}: {
    title: ReactNode
    info?: ReactNode
    actions?: ReactNode
    value: number | null
    min?: number
    max?: number
    thresholds?: readonly Threshold[]
    /** The arc's color token when there are no thresholds. */
    color?: string
    unit?: string
    decimals?: number
    format?: (value: number) => string
    /** A word under the value, such as what it measures. */
    label?: string
    span?: PanelSpan
    bodyClassName?: string
    loading?: boolean
    file?: string
    words?: Partial<ChartFrameWords>
    className?: string
}) {
    const option = useMemo(
        () => gaugeOption({ value, min, max, thresholds, color, unit, decimals, format, label }),
        [value, min, max, thresholds, color, unit, decimals, format, label],
    )
    return (
        <ChartFrame
            title={title}
            info={info}
            actions={actions}
            file={file}
            loading={loading}
            bodyClassName={bodyClassName}
            words={words}
            className={cn(SPAN[span], className)}
        >
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Gauge'} {...state} />}
        </ChartFrame>
    )
}
