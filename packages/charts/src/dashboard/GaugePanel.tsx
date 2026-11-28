import { useMemo, type ReactNode } from 'react'

import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import { Chart } from '../Chart'
import type { ChartSpec } from '../kinds'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { FIGURE, panelFormat } from './series'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

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
    color = 'chart-2',
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
    const spec = useMemo<ChartSpec>(
        () => ({
            rows: [{ [FIGURE]: value }],
            y: FIGURE,
            ...panelFormat(unit, decimals, format),
            min,
            max,
            steps: thresholds,
            colors: { [FIGURE]: color },
            total: label,
            small: phone,
        }),
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
            {(state) => <Chart kind="gauge" label={typeof title === 'string' ? title : 'Gauge'} {...spec} {...state} />}
        </ChartFrame>
    )
}
