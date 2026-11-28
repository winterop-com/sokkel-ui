import type { CSSProperties, PointerEvent } from 'react'

import { cn } from '../lib/cn'
import type { DetectionSpan } from '../lib/detections'
import { TRACK_COLORS } from '../lib/tracks'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { formatTime } from './media/time'

export type { DetectionSpan }

/** A stretch on the timeline: a detection's span, and whether it calls for a look. */
export interface TimelineSpan extends DetectionSpan {
    /** It calls for a look: drawn in the critical color, on the alerts' lane. */
    alert?: boolean
}

export interface DetectionTimelineWords {
    /** What the timeline is called to a screen reader. */
    timeline: string
    /** The lane of the spans that call for a look. */
    alerts: string
    /** A span as a button that seeks to it, by what it is and when it starts. */
    seek: (name: string, time: string) => string
}

export const DETECTION_TIMELINE_WORDS: DetectionTimelineWords = {
    timeline: 'Detections over time',
    alerts: 'Alerts',
    seek: (name, time) => `Go to ${name} at ${time}`,
}

/** Where a catalog holds a detection timeline's words, and the arguments its phrases name. */
export const DETECTION_TIMELINE_PART: WordsPart<DetectionTimelineWords> = {
    id: 'detectionTimeline',
    words: DETECTION_TIMELINE_WORDS,
    args: { seek: 'name time' },
}

/** A detection timeline's phrases as ICU messages in English, for the catalog. */
export const DETECTION_TIMELINE_MESSAGES: WordMessages<DetectionTimelineWords> = {
    seek: 'Go to {name} at {time}',
}

export interface DetectionTimelineProps {
    /** The stretches in which things were seen, such as `detectionSpans` makes of detections. */
    spans: readonly TimelineSpan[]
    /** How long the video is, in seconds. */
    duration: number
    /** Where the video is, in seconds: the playhead. */
    time?: number
    /** Makes the timeline seek: a press on a span goes to its start, a press elsewhere on a lane to that moment. */
    onSeek?: (seconds: number) => void
    /** The labels whose lanes are drawn, in this order; every label seen, in the order first seen, by default. */
    labels?: readonly string[]
    words?: Partial<DetectionTimelineWords>
    className?: string
}

/** The ticks along the axis: about five, on a step a reader counts in. */
const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]

/**
 * Where things were seen over a video, as a playback bar marked with them: a lane for the spans that
 * call for a look, in the critical color, then a lane per kind of thing (each label), each span in
 * its affiliation's track color, a playhead at the moment shown, and the time along the foot. With
 * `onSeek` a press on a span goes to its start and a press elsewhere on a lane to that moment, so
 * the timeline drives the player above it. `labels` picks which kinds are drawn, and in what order.
 */
export function DetectionTimeline({ spans, duration, time, onSeek, labels, words: given, className }: DetectionTimelineProps) {
    const words = useWords(DETECTION_TIMELINE_PART, given)
    const length = duration > 0 ? duration : 1
    const share = (seconds: number) => Math.min(1, Math.max(0, seconds / length))
    const kinds = labels ?? [...new Set(spans.map((span) => span.label ?? ''))]
    const alerts = spans.filter((span) => span.alert === true)
    const lanes = [
        ...(alerts.length > 0 ? [{ key: 'alerts', name: words.alerts, spans: alerts, alert: true }] : []),
        ...kinds.map((kind) => ({
            key: kind,
            name: kind,
            spans: spans.filter((span) => span.alert !== true && (span.label ?? '') === kind),
            alert: false,
        })),
    ]
    const step = STEPS.find((one) => length / one <= 6) ?? 3600
    const ticks = Array.from({ length: Math.floor(length / step) + 1 }, (_, index) => index * step)
    const seekAt = (event: PointerEvent<HTMLDivElement>) => {
        if (onSeek === undefined || event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        onSeek(share(((event.clientX - box.left) / box.width) * length) * length)
    }

    return (
        <div
            role="group"
            aria-label={words.timeline}
            data-slot="detection-timeline"
            className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs', className)}
        >
            {lanes.map((lane) => (
                <div key={lane.key} data-slot="detection-lane" className="col-span-2 grid grid-cols-subgrid items-center">
                    <span className={cn('truncate text-muted-foreground', lane.alert && 'font-medium text-critical-ink')}>{lane.name}</span>
                    <div
                        onPointerUp={seekAt}
                        className={cn('relative h-5 rounded-mini bg-muted/60', onSeek !== undefined && 'cursor-pointer')}
                    >
                        {lane.spans.map((span) => {
                            const style = {
                                left: `${String(share(span.start) * 100)}%`,
                                width: `max(0.25rem, ${String((share(span.end) - share(span.start)) * 100)}%)`,
                                backgroundColor:
                                    span.alert === true
                                        ? 'var(--critical)'
                                        : span.affiliation === undefined
                                          ? 'var(--primary)'
                                          : TRACK_COLORS[span.affiliation],
                            } satisfies CSSProperties
                            const name = span.label === undefined ? span.id : `${span.label} ${span.id}`
                            return onSeek === undefined ? (
                                <span
                                    key={`${span.id}-${String(span.start)}`}
                                    data-slot="detection-span"
                                    className="absolute inset-y-1 rounded-mini opacity-85"
                                    style={style}
                                />
                            ) : (
                                <button
                                    key={`${span.id}-${String(span.start)}`}
                                    type="button"
                                    data-slot="detection-span"
                                    aria-label={words.seek(name, formatTime(span.start))}
                                    onClick={() => onSeek(span.start)}
                                    className="absolute inset-y-1 cursor-pointer rounded-mini opacity-85 outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
                                    style={style}
                                />
                            )
                        })}
                        {time !== undefined && (
                            <span
                                aria-hidden
                                data-slot="detection-playhead"
                                className="pointer-events-none absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                                style={{ left: `${String(share(time) * 100)}%` }}
                            />
                        )}
                    </div>
                </div>
            ))}
            <span />
            <div aria-hidden className="relative h-4 text-2xs text-muted-foreground tabular-nums">
                {ticks.map((tick, index) => (
                    <span
                        key={tick}
                        className={cn('absolute top-0', index === 0 ? '' : share(tick) > 0.97 ? '-translate-x-full' : '-translate-x-1/2')}
                        style={{ left: `${String(share(tick) * 100)}%` }}
                    >
                        {formatTime(tick)}
                    </span>
                ))}
            </div>
        </div>
    )
}
