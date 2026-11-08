import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export type TimelineTone = 'neutral' | 'running' | 'succeeded' | 'failed' | 'waiting' | 'skipped'

/** One event in a timeline. */
export interface TimelineEvent {
    id: string
    title: ReactNode
    /** When it happened, already written for a reader: `14:02:11`, `3 min ago`. */
    at?: ReactNode
    detail?: ReactNode
    /** What sits under the event at full size and ink, such as an answer or a card. */
    content?: ReactNode
    tone?: TimelineTone
    /** An icon in place of the dot. */
    icon?: ReactNode
}

const DOT: Record<TimelineTone, string> = {
    neutral: 'bg-faint',
    running: 'bg-status-running',
    succeeded: 'bg-status-succeeded',
    failed: 'bg-status-failed',
    waiting: 'bg-status-waiting',
    skipped: 'bg-status-skipped',
}

const INK: Record<TimelineTone, string> = {
    neutral: 'text-muted-foreground',
    running: 'text-status-running',
    succeeded: 'text-status-succeeded',
    failed: 'text-status-failed',
    waiting: 'text-status-waiting',
    skipped: 'text-status-skipped',
}

export interface TimelineProps {
    events: readonly TimelineEvent[]
    className?: string
}

/**
 * Events in the order they happened, on a rail: a run's steps, a job's history, an audit
 * trail. Each event's dot is inked by its state; its time sits at the right in tabular figures.
 */
export function Timeline({ events, className }: TimelineProps) {
    return (
        <ol className={cn('flex flex-col', className)}>
            {events.map((event, index) => {
                const tone = event.tone ?? 'neutral'
                const last = index === events.length - 1
                return (
                    <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && <span className="absolute top-5 bottom-1 left-[7.5px] w-px bg-border" aria-hidden />}
                        <span className={cn('relative mt-0.5 flex size-4 shrink-0 items-center justify-center', INK[tone])} aria-hidden>
                            {event.icon ?? <span className={cn('size-2 rounded-full', DOT[tone], tone === 'running' && 'animate-pulse')} />}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex items-baseline gap-3">
                                <span className="min-w-0 flex-1 text-sm">{event.title}</span>
                                {event.at !== undefined && (
                                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{event.at}</span>
                                )}
                            </div>
                            {event.detail !== undefined && <div className="text-xs text-muted-foreground">{event.detail}</div>}
                            {event.content !== undefined && <div className="mt-1.5 min-w-0">{event.content}</div>}
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}
