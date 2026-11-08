import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ChartFrame, type ChartFrameWords } from '../ChartFrame'
import { SPAN, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { valueWriter } from './series'
import { thresholdColor, tokenVar, type Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** One bar of a bar gauge. */
export interface GaugeBar {
    name: string
    value: number | null
}

export interface BarGaugeProps {
    title: ReactNode
    subtitle?: ReactNode
    info?: ReactNode
    actions?: ReactNode
    bars: readonly GaugeBar[]
    min?: number
    max?: number
    thresholds?: readonly Threshold[]
    /** The bars' color token when there are no thresholds. */
    color?: string
    unit?: string
    decimals?: number
    format?: (value: number) => string
    mode?: 'gradient' | 'basic'
    span?: PanelSpan
    loading?: boolean
    empty?: boolean
    words?: Partial<ChartFrameWords>
    className?: string
}

/**
 * A dashboard panel of readings as bars against one scale from `min` to `max`, each bar and its
 * value in the color its thresholds give it: workers' load, jobs' failure rates. `gradient` fades
 * each bar in from the track; `basic` fills it flat.
 */
export function BarGauge({
    title,
    subtitle,
    info,
    actions,
    bars,
    min = 0,
    max = 100,
    thresholds,
    color = 'chart-2',
    unit,
    decimals,
    format,
    mode = 'gradient',
    span = 'third',
    loading,
    empty,
    words,
    className,
}: BarGaugeProps) {
    const write = valueWriter(unit, decimals, format)
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            info={info}
            actions={actions}
            exportable={false}
            loading={loading}
            empty={empty}
            fit
            words={words}
            className={cn(SPAN[span], className)}
        >
            {() => (
                <ul className="flex flex-col gap-1.5 py-1">
                    {bars.map((bar) => {
                        const tone = tokenVar(thresholdColor(bar.value, thresholds) ?? color)
                        const share = bar.value === null ? 0 : Math.min(1, Math.max(0, (bar.value - min) / (max - min)))
                        return (
                            <li
                                key={bar.name}
                                style={{ '--tone': tone } as CSSProperties}
                                className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs"
                            >
                                <span className="truncate font-mono text-muted-foreground">{bar.name}</span>
                                <span
                                    role="meter"
                                    aria-label={bar.name}
                                    aria-valuemin={min}
                                    aria-valuemax={max}
                                    aria-valuenow={bar.value ?? undefined}
                                    className="relative h-4 overflow-hidden rounded-[calc(var(--radius)*0.4)] bg-muted"
                                >
                                    <span
                                        className={cn(
                                            'absolute inset-y-0 left-0 rounded-[inherit]',
                                            mode === 'gradient'
                                                ? 'bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tone)_30%,transparent),var(--tone))]'
                                                : 'bg-(--tone)',
                                        )}
                                        style={{ width: `${(share * 100).toFixed(1)}%` }}
                                    />
                                </span>
                                <span className="min-w-10 text-right font-mono font-medium text-(--tone) tabular-nums">
                                    {bar.value === null ? '-' : write(bar.value)}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </ChartFrame>
    )
}
