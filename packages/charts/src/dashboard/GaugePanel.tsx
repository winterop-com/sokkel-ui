import { useMemo, type ReactNode } from 'react'

import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
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
    small,
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
    /** Writes the figure at the small chart figure size. */
    small?: boolean
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
            small,
        }),
    })
}

export interface GaugePanelProps {
    title: ReactNode
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
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
    /** The dial's box: `h-32` by default, and `h-28` on a phone. */
    bodyClassName?: string
    loading?: boolean
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
 * A dashboard panel of one reading on an arc from `min` to `max`, filled in the color its
 * thresholds give it, with the thresholds themselves as a thin band outside the arc.
 *
 * On a phone gauges stand two to a row of a `DashboardGrid`, whatever their span short of `full`,
 * each on a shorter body with its figure drawn smaller, so a group of readings is still seen at once.
 */
export function GaugePanel({
    title,
    info,
    actions,
    menu,
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
    bodyClassName,
    loading,
    file,
    fullscreen,
    expanded,
    onExpandedChange,
    words,
    className,
}: GaugePanelProps) {
    const phone = useIsMobile()
    const option = useMemo(
        () => gaugeOption({ value, min, max, thresholds, color, unit, decimals, format, label, small: phone }),
        [value, min, max, thresholds, color, unit, decimals, format, label, phone],
    )
    return (
        <ChartFrame
            title={title}
            info={info}
            actions={actions}
            menu={menu}
            file={file}
            fullscreen={fullscreen}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            loading={loading}
            bodyClassName={cn('h-32 max-md:h-28', bodyClassName)}
            words={words}
            className={cn(SPAN[span], span !== 'full' && '@max-2xl/dashboard:col-span-6', className)}
        >
            {(state) => <EChart option={option} label={typeof title === 'string' ? title : 'Gauge'} {...state} />}
        </ChartFrame>
    )
}
