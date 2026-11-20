import type { Ref } from 'react'

import { cn } from '../lib/cn'
import { axisShare } from '../lib/time-axis'

/** How far a tick's label stays from the mark's, in pixels, so the two never overlap. */
const MARK_ROOM = 40

function percent(value: number): string {
    return `${String(value * 100)}%`
}

export interface TimeTicksProps {
    from: number
    to: number
    ticks: readonly number[]
    /** The axis's width in pixels, which keeps a tick's label clear of the mark's. */
    width: number
    label: (at: number) => string
    /** A time marked on the axis, such as now or the live edge, with its word on a chip. */
    mark?: { at: number; label: string }
    ref?: Ref<HTMLDivElement>
    className?: string
}

/**
 * The labels along a time axis, each at its tick, and a marked time's word on a chip in the primary
 * color; a label too near either end or the mark is left out. `RunTimeline` and `PlaybackTimeline`
 * both draw their axis with it.
 */
export function TimeTicks({ from, to, ticks, width, label, mark, ref, className }: TimeTicksProps) {
    const markAt = mark === undefined || mark.at < from || mark.at > to ? undefined : axisShare(mark.at, from, to)
    // A mark at either end keeps its chip inside the axis, the whole chip on one side of it, so labels on that side keep further off.
    const pinned = markAt === undefined ? undefined : markAt > 0.97 ? 'end' : markAt < 0.03 ? 'start' : undefined
    const clear = (left: number) => {
        if (markAt === undefined) return true
        const apart = (left - markAt) * width
        const room = pinned === 'end' && apart < 0 ? MARK_ROOM * 1.5 : pinned === 'start' && apart > 0 ? MARK_ROOM * 1.5 : MARK_ROOM
        return Math.abs(apart) > room
    }
    return (
        <div ref={ref} data-slot="time-ticks" className={cn('relative h-8 min-w-0 flex-1', className)}>
            {ticks.map((at) => {
                const left = axisShare(at, from, to)
                return (
                    <span
                        key={at}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-2xs whitespace-nowrap text-muted-foreground"
                        style={{ left: percent(left) }}
                    >
                        {left > 0.02 && left < 0.98 && clear(left) ? label(at) : null}
                    </span>
                )
            })}
            {markAt !== undefined && mark !== undefined && (
                <span
                    data-slot="time-mark"
                    className={cn(
                        'absolute top-1/2 z-1 -translate-y-1/2 rounded-mini bg-primary px-1 font-mono text-2xs leading-4 font-semibold text-primary-foreground uppercase',
                        pinned === 'end' ? '-translate-x-full' : pinned === 'start' ? '' : '-translate-x-1/2',
                    )}
                    style={{ left: percent(markAt) }}
                >
                    {mark.label}
                </span>
            )}
        </div>
    )
}

export interface TimeGridProps {
    from: number
    to: number
    ticks: readonly number[]
    /** A line in the primary color at a marked time, such as now. */
    mark?: number
}

/** The lines a time axis's ticks make down a lane, and the marked time's line over them. */
export function TimeGrid({ from, to, ticks, mark }: TimeGridProps) {
    const markAt = mark === undefined || mark < from || mark > to ? undefined : axisShare(mark, from, to)
    return (
        <>
            {ticks.map((at) => (
                <span
                    key={at}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-border"
                    style={{ left: percent(axisShare(at, from, to)) }}
                />
            ))}
            {markAt !== undefined && (
                <span aria-hidden className="absolute inset-y-0 z-1 w-px bg-primary" style={{ left: percent(markAt) }} />
            )}
        </>
    )
}
