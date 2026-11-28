'use client'

import { Pause, Play, StepBack, StepForward } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '../lib/cn'
import { axisShare, tickLabeler, timelineMs, timelineTicks, type TimelineTime } from '../lib/time-axis'
import { useLocale, useWords, type WordsPart } from '../lib/words'
import { Dot } from './Dot'
import { IconButton } from './IconButton'
import { TimeGrid, TimeTicks } from './time-axis'
import { Button } from './ui/button'

export type { TimelineTime } from '../lib/time-axis'

export interface PlaybackTimelineWords {
    /** The live button's word, the readout's while live, and the live edge's chip. */
    live: string
    /** The live button's name while playing back, saying a press returns to live. */
    goLive: string
    play: string
    pause: string
    stepBack: string
    stepForward: string
    /** The playhead's name, as a slider, where no `label` names what is played back. */
    position: string
}

export const PLAYBACK_TIMELINE_WORDS: PlaybackTimelineWords = {
    live: 'Live',
    goLive: 'Back to live',
    play: 'Play',
    pause: 'Pause',
    stepBack: 'Step back',
    stepForward: 'Step forward',
    position: 'Time shown',
}

/** Where a catalog holds a playback timeline's words. */
export const PLAYBACK_TIMELINE_PART: WordsPart<PlaybackTimelineWords> = { id: 'playbackTimeline', words: PLAYBACK_TIMELINE_WORDS }

/** How near the live edge, in pixels, a drag lets go to return to live. */
export const LIVE_SNAP = 8

/** How often playing moves the time on, in milliseconds. */
const FRAME = 250

/** How many steps Page Up and Page Down move. */
const PAGE = 10

/**
 * The time a point on the axis stands for, or null for live: at or past the live edge, or within
 * `snap` pixels of it.
 */
export function scrubTime(x: number, width: number, from: number, to: number, live: number, snap: number = LIVE_SNAP): number | null {
    if (width <= 0) return null
    const at = from + (Math.min(Math.max(x, 0), width) / width) * (to - from)
    const liveX = ((live - from) / Math.max(to - from, 1)) * width
    if (at >= live || liveX - x <= snap) return null
    return Math.max(at, from)
}

/** A time moved by `by` milliseconds and held between the axis's start and the live edge, past which it is live (null). */
export function stepTime(value: number | null, by: number, from: number, live: number): number | null {
    const next = (value ?? live) + by
    if (next >= live) return null
    return Math.max(next, from)
}

/** The tallest count among bins, at least 1 so an empty strip draws nothing. */
function peak(counts: readonly number[]): number {
    return Math.max(1, ...counts.filter((count) => Number.isFinite(count)))
}

function percent(value: number): string {
    return `${String(value * 100)}%`
}

export interface PlaybackTimelineProps {
    /** Where the axis starts. */
    from: TimelineTime
    /** Where the axis ends. */
    to: TimelineTime
    /** The live edge, drawn as a line with its chip; `to` by default. Nothing is played back past it. */
    live?: TimelineTime
    /** The time shown, in milliseconds since the epoch; null while live. */
    value: number | null
    /** Hears the time a scrub, a step or playing moves to, or null once it returns to live. */
    onValueChange: (value: number | null) => void
    /** Whether it plays, held by the app; it holds this itself from `defaultPlaying` without. */
    playing?: boolean
    defaultPlaying?: boolean
    onPlayingChange?: (playing: boolean) => void
    /** How many times real time playing runs: 60 plays a minute a second. */
    rate?: number
    /** How far a step moves, in milliseconds: a minute by default; with Shift the arrows move a tick. */
    step?: number
    /** Counts over time, in bins of one size from `from` to `to`, drawn as a strip of bars under the ticks. */
    activity?: readonly number[]
    /** What is played back ("Harbor watch"), naming the playhead for a screen reader. */
    label?: string
    /** The IANA zone ticks and the readout are written in; the browser's own when left out. */
    timeZone?: string
    locale?: string
    words?: Partial<PlaybackTimelineWords>
    className?: string
}

/**
 * A time to look back at what happened, such as the tracks on a map an hour ago: an axis with day
 * and hour ticks on the zone's clock, the live edge marked, a strip of activity over it (counts in
 * plain SVG bars), and a playhead to drag or move with the keys. Play moves the time on at `rate`
 * times real time, Step back and Step forward move it by `step`, and Live returns to now; a drag or a
 * step that reaches the live edge, or ends within a few pixels of it, returns to live too, as does
 * playing up to it. The time is held by the app (`value`, null while live), so a map shows the same.
 * Its axis is `RunTimeline`'s, drawn by the same parts.
 */
export function PlaybackTimeline({
    from: fromTime,
    to: toTime,
    live: liveTime,
    value,
    onValueChange,
    playing: heldPlaying,
    defaultPlaying = false,
    onPlayingChange,
    rate = 60,
    step = 60_000,
    activity,
    label,
    timeZone,
    locale,
    words: given,
    className,
}: PlaybackTimelineProps) {
    const words = useWords(PLAYBACK_TIMELINE_PART, given)
    const providerLocale = useLocale()
    const shownLocale = locale ?? providerLocale
    const from = timelineMs(fromTime)
    const to = timelineMs(toTime)
    const live = Math.min(liveTime === undefined ? to : timelineMs(liveTime), to)
    const isLive = value === null

    const [axis, setAxis] = useState<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)
    useLayoutEffect(() => {
        if (axis === null) return
        setWidth(axis.clientWidth)
        const observer = new ResizeObserver(() => setWidth(axis.clientWidth))
        observer.observe(axis)
        return () => observer.disconnect()
    }, [axis])
    const { step: tick, ticks } = useMemo(() => timelineTicks(from, to, width || 640, timeZone), [from, to, width, timeZone])
    const tickWords = useMemo(() => tickLabeler(shownLocale, timeZone, tick), [shownLocale, timeZone, tick])
    const readout = useMemo(
        () =>
            new Intl.DateTimeFormat(shownLocale, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23',
                timeZone,
            }),
        [shownLocale, timeZone],
    )

    const [ownPlaying, setOwnPlaying] = useState(defaultPlaying)
    const playing = (heldPlaying ?? ownPlaying) && !isLive
    const setPlaying = (next: boolean) => {
        if (heldPlaying === undefined) setOwnPlaying(next)
        onPlayingChange?.(next)
    }

    // Playing reads the latest time and handlers on each frame, so the timer is not started again as they change.
    const latest = useRef({ value, onValueChange, setPlaying, live, rate })
    latest.current = { value, onValueChange, setPlaying, live, rate }
    useEffect(() => {
        if (!playing) return
        const timer = window.setInterval(() => {
            const now = latest.current
            if (now.value === null) return
            const next = now.value + FRAME * now.rate
            if (next >= now.live) {
                now.onValueChange(null)
                now.setPlaying(false)
            } else now.onValueChange(next)
        }, FRAME)
        return () => window.clearInterval(timer)
    }, [playing])

    const move = (next: number | null) => {
        if (next !== value) onValueChange(next)
        if (next === null && playing) setPlaying(false)
    }
    const scrubAt = (event: PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect()
        move(scrubTime(event.clientX - box.left, box.width, from, to, live))
    }
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        const by = event.shiftKey ? tick : step
        const moves: Record<string, () => number | null> = {
            ArrowLeft: () => stepTime(value, -by, from, live),
            ArrowDown: () => stepTime(value, -by, from, live),
            ArrowRight: () => stepTime(value, by, from, live),
            ArrowUp: () => stepTime(value, by, from, live),
            PageDown: () => stepTime(value, -by * PAGE, from, live),
            PageUp: () => stepTime(value, by * PAGE, from, live),
            Home: () => from,
            End: () => null,
        }
        const found = moves[event.key]
        if (found === undefined) return
        event.preventDefault()
        move(found())
    }

    const shown = value ?? live
    const headAt = axisShare(shown, from, to)
    const said = isLive ? words.live : readout.format(shown)
    const counts = activity ?? []
    const tallest = peak(counts)

    return (
        <div
            data-slot="playback-timeline"
            data-live={isLive || undefined}
            className={cn('flex min-w-0 flex-col rounded-surface border border-border bg-card text-sm text-card-foreground', className)}
        >
            <div className="flex min-w-0 items-center gap-1 border-b border-border px-2 py-1">
                <IconButton label={words.stepBack} size="icon-sm" variant="ghost" onClick={() => move(stepTime(value, -step, from, live))}>
                    <StepBack />
                </IconButton>
                <IconButton
                    label={playing ? words.pause : words.play}
                    size="icon-sm"
                    variant="ghost"
                    disabled={isLive}
                    onClick={() => setPlaying(!playing)}
                >
                    {playing ? <Pause /> : <Play />}
                </IconButton>
                <IconButton
                    label={words.stepForward}
                    size="icon-sm"
                    variant="ghost"
                    disabled={isLive}
                    onClick={() => move(stepTime(value, step, from, live))}
                >
                    <StepForward />
                </IconButton>
                <span
                    data-slot="playback-readout"
                    aria-live="off"
                    className={cn('min-w-0 truncate px-1 font-mono text-xs tabular-nums', isLive ? 'text-good-ink' : 'text-foreground')}
                >
                    {said}
                </span>
                <Button
                    size="sm"
                    variant={isLive ? 'ghost' : 'outline'}
                    aria-pressed={isLive}
                    title={isLive ? undefined : words.goLive}
                    onClick={() => move(null)}
                    className="ms-auto shrink-0"
                >
                    <Dot color={isLive ? 'var(--good)' : 'var(--faint)'} size="sm" className={cn(isLive && 'animate-live')} />
                    {words.live}
                </Button>
            </div>
            <div className="px-3 pt-2">
                <div
                    ref={setAxis}
                    data-slot="playback-axis"
                    className="relative cursor-pointer touch-none select-none"
                    onPointerDown={(event) => {
                        if (event.button !== 0) return
                        event.currentTarget.setPointerCapture(event.pointerId)
                        scrubAt(event)
                        // Focus the playhead, so the keys go on from where the press left it.
                        event.currentTarget.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true })
                        event.preventDefault()
                    }}
                    onPointerMove={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubAt(event)
                    }}
                >
                    <div data-slot="playback-strip" className="relative h-8 overflow-hidden rounded-mini bg-muted/50">
                        <TimeGrid from={from} to={to} ticks={ticks} mark={live} />
                        {counts.length > 0 && (
                            <svg
                                aria-hidden
                                viewBox={`0 0 ${String(counts.length)} ${String(tallest)}`}
                                preserveAspectRatio="none"
                                className="absolute inset-0 size-full"
                            >
                                {counts.map((count, index) => {
                                    const height = Number.isFinite(count) ? Math.max(count, 0) : 0
                                    const binStart = from + ((to - from) * index) / counts.length
                                    return (
                                        <rect
                                            key={index}
                                            x={index + 0.1}
                                            width={0.8}
                                            y={tallest - height}
                                            height={height}
                                            fill="currentColor"
                                            fillOpacity={binStart <= shown ? 0.55 : 0.3}
                                            className={binStart <= shown ? 'text-primary' : 'text-muted-foreground'}
                                        />
                                    )
                                })}
                            </svg>
                        )}
                    </div>
                    <TimeTicks from={from} to={to} ticks={ticks} width={width} label={tickWords} mark={{ at: live, label: words.live }} />
                    <span
                        role="slider"
                        tabIndex={0}
                        aria-label={label ?? words.position}
                        aria-valuemin={from}
                        aria-valuemax={live}
                        aria-valuenow={shown}
                        aria-valuetext={said}
                        aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight PageUp PageDown Home End"
                        onKeyDown={onKeyDown}
                        data-slot="playback-head"
                        className="absolute top-0 z-2 h-8 w-3 -translate-x-1/2 cursor-ew-resize rounded-mini outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                        style={{ left: percent(headAt) }}
                    >
                        <span
                            aria-hidden
                            className={cn('absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2', isLive ? 'bg-good' : 'bg-foreground')}
                        />
                        <span
                            aria-hidden
                            className={cn(
                                'absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full',
                                isLive ? 'bg-good' : 'bg-foreground',
                            )}
                        />
                    </span>
                </div>
            </div>
        </div>
    )
}
