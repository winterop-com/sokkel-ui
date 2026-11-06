import { useMemo, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { ChartFrame, type ChartFrameWords } from '../chart/ChartFrame'
import { EChart } from '../chart/EChart'
import type { ChartLook } from '../chart/look'
import { SPAN, type PanelSpan } from './DashboardGrid'
import { valueWriter } from './series'
import { thresholdColor, type Threshold } from './thresholds'

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
    return (look: ChartLook) => {
        const tone = look.token(thresholdColor(value, thresholds) ?? color)
        const steps = thresholds ?? [{ color }]
        const band = steps.map((step, index) => {
            const next = steps[index + 1]?.value
            const end = next === undefined ? 1 : Math.min(1, Math.max(0, (next - min) / (max - min)))
            return [end, look.token(step.color)] as [number, string]
        })
        const arc = {
            startAngle: 215,
            endAngle: -35,
            min,
            max,
            center: ['50%', '60%'],
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            anchor: { show: false },
        }
        return {
            series: [
                {
                    ...arc,
                    name: 'thresholds',
                    type: 'gauge',
                    radius: '98%',
                    silent: true,
                    axisLine: { lineStyle: { width: 3, color: band } },
                    progress: { show: false },
                    title: { show: false },
                    detail: { show: false },
                    data: [{ value: max }],
                },
                {
                    ...arc,
                    name: label ?? 'value',
                    type: 'gauge',
                    radius: '88%',
                    axisLine: { lineStyle: { width: 14, color: [[1, look.grid]] } },
                    progress: { show: true, width: 14, itemStyle: { color: tone } },
                    title: { show: label !== undefined, offsetCenter: [0, '46%'], fontSize: look.size.label, color: look.muted },
                    detail: {
                        offsetCenter: [0, '2%'],
                        fontSize: look.size.stat,
                        fontWeight: 600,
                        fontFamily: look.font,
                        color: tone,
                        formatter: (shown: number) => (value === null ? '-' : write(shown)),
                    },
                    data: [{ value: value ?? min, name: label ?? '' }],
                },
            ],
        }
    }
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
    words?: ChartFrameWords
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
