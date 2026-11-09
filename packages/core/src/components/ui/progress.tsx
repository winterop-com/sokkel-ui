'use client'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { createContext, useContext } from 'react'

import { cn } from '../../lib/cn'
import { formatPercent } from '../../lib/percent'

/** What the value says when the app gives no `format`: the share as `formatPercent` writes it, as `DownloadButton` says it. */
const Said = createContext<string | undefined>(undefined)

export type ProgressProps = ProgressPrimitive.Root.Props

/**
 * A bar of how far something has come. Without a `format` its value is said as `formatPercent`
 * writes a share, rounded as every share in the library is: never `0%` once begun nor `100%`
 * before the end.
 */
function Progress({ className, children, value, min = 0, max = 100, format, getAriaValueText, ...props }: ProgressProps) {
    const said =
        format === undefined && value !== null && value !== undefined && Number.isFinite(value) && max > min
            ? formatPercent((value - min) / (max - min))
            : undefined
    return (
        <Said.Provider value={said}>
            <ProgressPrimitive.Root
                value={value}
                min={min}
                max={max}
                format={format}
                getAriaValueText={getAriaValueText ?? (said === undefined ? undefined : () => said)}
                data-slot="progress"
                className={cn('flex flex-wrap gap-3', className)}
                {...props}
            >
                {children}
                <ProgressTrack>
                    <ProgressIndicator />
                </ProgressTrack>
            </ProgressPrimitive.Root>
        </Said.Provider>
    )
}

export type ProgressTrackProps = ProgressPrimitive.Track.Props

function ProgressTrack({ className, ...props }: ProgressTrackProps) {
    return (
        <ProgressPrimitive.Track
            className={cn('relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted', className)}
            data-slot="progress-track"
            {...props}
        />
    )
}

export type ProgressIndicatorProps = ProgressPrimitive.Indicator.Props

function ProgressIndicator({ className, ...props }: ProgressIndicatorProps) {
    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn('h-full bg-primary transition-all', className)}
            {...props}
        />
    )
}

export type ProgressLabelProps = ProgressPrimitive.Label.Props

function ProgressLabel({ className, ...props }: ProgressLabelProps) {
    return <ProgressPrimitive.Label className={cn('text-sm font-medium', className)} data-slot="progress-label" {...props} />
}

export type ProgressValueProps = ProgressPrimitive.Value.Props

function ProgressValue({ className, children, ...props }: ProgressValueProps) {
    const said = useContext(Said)
    return (
        <ProgressPrimitive.Value
            className={cn('ml-auto text-sm text-muted-foreground tabular-nums', className)}
            data-slot="progress-value"
            {...props}
        >
            {children ?? (said === undefined ? undefined : () => said)}
        </ProgressPrimitive.Value>
    )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
