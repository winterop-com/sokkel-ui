import { Meter as MeterPrimitive } from '@base-ui/react/meter'
import { createContext, useContext } from 'react'

import { cn } from '../../lib/cn'
import { formatPercent } from '../../lib/percent'

/** How a meter's value stands against its bounds: under `low`, between, or past `high`, or none without them. */
export type MeterTone = 'good' | 'warning' | 'critical' | 'none'

/** Which end of the scale is the good one: `low` for what fills up (a disk, a quota), `high` for what should stay full (a battery). */
export type MeterOptimum = 'low' | 'high'

const Look = createContext<{ tone: MeterTone; said: string | undefined }>({ tone: 'none', said: undefined })

export type MeterProps = MeterPrimitive.Root.Props & {
    /** Where the scale stops being good: up to it the bar is good, past it the warning tone. */
    low?: number
    /** Where the scale turns critical. */
    high?: number
    /** Which end is good; the low end by default, so a fuller bar reads worse. */
    optimum?: MeterOptimum
}

/** The tone a value takes between its bounds, the good end set by `optimum`. */
export function meterTone(value: number, low: number | undefined, high: number | undefined, optimum: MeterOptimum = 'low'): MeterTone {
    if (low === undefined && high === undefined) return 'none'
    const [good, bad] = optimum === 'low' ? [low ?? high ?? 0, high ?? low ?? 0] : [high ?? low ?? 0, low ?? high ?? 0]
    if (optimum === 'low') return value <= good ? 'good' : value <= bad ? 'warning' : 'critical'
    return value >= good ? 'good' : value >= bad ? 'warning' : 'critical'
}

/** Each tone's fill. */
const FILL: Record<MeterTone, string> = { good: 'bg-good', warning: 'bg-warning', critical: 'bg-critical', none: 'bg-primary' }

/**
 * How much of something there is on a known scale, as a bar: a disk filled, a quota used, a battery
 * left; for work under way use `Progress`. With `low` and `high` the bar takes a tone, good up to
 * `low`, the warning tone up to `high` and critical past it, turned around with `optimum="high"` for
 * a scale whose full end is the good one. Without a `format` its value is said as a whole percent.
 */
function Meter({ className, children, value, min = 0, max = 100, low, high, optimum, format, getAriaValueText, ...props }: MeterProps) {
    const said = format === undefined && Number.isFinite(value) && max > min ? formatPercent((value - min) / (max - min)) : undefined
    const tone = meterTone(value, low, high, optimum)
    return (
        <Look.Provider value={{ tone, said }}>
            <MeterPrimitive.Root
                value={value}
                min={min}
                max={max}
                format={format}
                getAriaValueText={getAriaValueText ?? (said === undefined ? undefined : () => said)}
                data-slot="meter"
                data-tone={tone}
                className={cn('flex flex-wrap gap-x-3 gap-y-1.5', className)}
                {...props}
            >
                {children}
                <MeterTrack>
                    <MeterIndicator />
                </MeterTrack>
            </MeterPrimitive.Root>
        </Look.Provider>
    )
}

export type MeterTrackProps = MeterPrimitive.Track.Props

function MeterTrack({ className, ...props }: MeterTrackProps) {
    return (
        <MeterPrimitive.Track
            data-slot="meter-track"
            className={cn('relative block h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
            {...props}
        />
    )
}

export type MeterIndicatorProps = MeterPrimitive.Indicator.Props

function MeterIndicator({ className, ...props }: MeterIndicatorProps) {
    const { tone } = useContext(Look)
    return (
        <MeterPrimitive.Indicator
            data-slot="meter-indicator"
            className={cn('block h-full rounded-full transition-all duration-base', FILL[tone], className)}
            {...props}
        />
    )
}

export type MeterLabelProps = MeterPrimitive.Label.Props

function MeterLabel({ className, ...props }: MeterLabelProps) {
    return <MeterPrimitive.Label data-slot="meter-label" className={cn('text-sm font-medium', className)} {...props} />
}

export type MeterValueProps = MeterPrimitive.Value.Props

function MeterValue({ className, children, ...props }: MeterValueProps) {
    const { tone, said } = useContext(Look)
    return (
        <MeterPrimitive.Value
            data-slot="meter-value"
            className={cn(
                'ml-auto text-sm tabular-nums',
                tone === 'critical' ? 'font-medium text-critical-ink' : tone === 'warning' ? 'text-warning-ink' : 'text-muted-foreground',
                className,
            )}
            {...props}
        >
            {children ?? (said === undefined ? undefined : () => said)}
        </MeterPrimitive.Value>
    )
}

export { Meter, MeterTrack, MeterIndicator, MeterLabel, MeterValue }
