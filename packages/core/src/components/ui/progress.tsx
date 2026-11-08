'use client'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '../../lib/cn'

export type ProgressProps = ProgressPrimitive.Root.Props

function Progress({ className, children, value, ...props }: ProgressProps) {
    return (
        <ProgressPrimitive.Root value={value} data-slot="progress" className={cn('flex flex-wrap gap-3', className)} {...props}>
            {children}
            <ProgressTrack>
                <ProgressIndicator />
            </ProgressTrack>
        </ProgressPrimitive.Root>
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

function ProgressValue({ className, ...props }: ProgressValueProps) {
    return (
        <ProgressPrimitive.Value
            className={cn('ml-auto text-sm text-muted-foreground tabular-nums', className)}
            data-slot="progress-value"
            {...props}
        />
    )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
