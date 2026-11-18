import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'

import { GripVertical } from 'lucide-react'

import { useLocale, useWords, type WordMessages, type WordsPart } from '../lib/words'
import { cn } from '../lib/cn'
import { Dot } from './Dot'
import { useStatus } from './StatusProvider'

/** A time: an ISO 8601 text or milliseconds since the epoch. */
export type RunTimelineTime = string | number

/** One run of a lane. */
export interface RunTimelineRun {
    id: string
    /** When it starts, or is due to. */
    at: RunTimelineTime
    /** When it ended; a run without one is drawn as a mark at its start. */
    end?: RunTimelineTime
    /** Its state, one the status map knows: `succeeded`, `failed`. A run after `now` is drawn hollow as scheduled whatever it says. */
    status?: string
}

/** One row of the timeline: a job and its runs. */
export interface RunTimelineLane {
    id: string
    /** What the lane is of, such as the job's name. */
    name: ReactNode
    /** The name as text, for a screen reader and the drag; `name` when that is text. */
    label?: string
    /** A line under the name: its state, or what it holds (`Paused`, `nothing scheduled`). */
    detail?: ReactNode
    runs: readonly RunTimelineRun[]
    /** A row that adds up the others, such as how many run at once: drawn strong, under a line, and never chosen. */
    total?: boolean
}

/** How far a lane's upcoming runs moved, as `onShift` hears it. */
export interface RunTimelineShift {
    lane: string
    /** How far, in milliseconds: later when above zero. */
    by: number
}

export interface RunTimelineWords {
    /** The label on the line at the current time. */
    now: string
    /** The legend's entry for a run still to come. */
    scheduled: string
    /** Beside the legend while a lane can be shifted. */
    hint: string
    /** What a screen reader calls a lane's upcoming runs. */
    upcoming: (lane: string) => string
    /** On the card that follows the pointer, given how far the runs move written. */
    by: (amount: string) => string
    /** Said once the runs moved. */
    shifted: (lane: string, amount: string) => string
}

export const RUN_TIMELINE_WORDS: RunTimelineWords = {
    now: 'Now',
    scheduled: 'Scheduled',
    hint: "Drag the selected job's upcoming runs to shift them",
    upcoming: (lane) => `Upcoming runs of ${lane}`,
    by: (amount) => `Shift ${amount}`,
    shifted: (lane, amount) => `Upcoming runs of ${lane} shifted ${amount}`,
}

/** Where a catalog holds a run timeline's words, and the arguments its phrases name. */
export const RUN_TIMELINE_PART: WordsPart<RunTimelineWords> = {
    id: 'runTimeline',
    words: RUN_TIMELINE_WORDS,
    args: { upcoming: 'lane', by: 'amount', shifted: 'lane amount' },
}

/** A run timeline's phrases as ICU messages in English, for the catalog. */
export const RUN_TIMELINE_MESSAGES: WordMessages<RunTimelineWords> = {
    upcoming: 'Upcoming runs of {lane}',
    by: 'Shift {amount}',
    shifted: 'Upcoming runs of {lane} shifted {amount}',
}

export interface RunTimelineProps {
    lanes: readonly RunTimelineLane[]
    /** Where the axis starts. */
    from: RunTimelineTime
    /** Where the axis ends. */
    to: RunTimelineTime
    /** The current time, drawn as a line; runs after it are upcoming. Left out, nothing is upcoming. */
    now?: RunTimelineTime
    /** The lane chosen, drawn raised; its upcoming runs are the ones `onShift` moves. */
    selected?: string | null
    /** Called with the lane pressed. */
    onSelect?: (lane: string) => void
    /**
     * Called once the chosen lane's upcoming runs are dragged sideways, or moved with the arrow keys:
     * by `snap`, or a tick with Shift. The runs stay where they are until the app moves them.
     */
    onShift?: (shift: RunTimelineShift) => void
    /** The step a shift snaps to, in milliseconds: a quarter of a tick by default. */
    snap?: number
    /** The states the legend names, in order, with Scheduled after them; by default those the runs show. `false` hides it. */
    legend?: readonly string[] | false
    /** The IANA time zone ticks and times are written in; the browser's own when left out. */
    timeZone?: string
    /** The locale times are written in. */
    locale?: string
    words?: Partial<RunTimelineWords>
    className?: string
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The steps ticks are placed at, from the finest. */
const STEPS = [15 * MINUTE, 30 * MINUTE, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 3 * DAY, 7 * DAY, 14 * DAY]

/** How far a tick's label stays from the current time's, in pixels, so the two never overlap. */
const NOW_ROOM = 40

/** The least room a tick's label takes, in pixels. */
const TICK_ROOM = 64

/** A time in milliseconds. */
export function timelineMs(time: RunTimelineTime): number {
    return typeof time === 'number' ? time : Date.parse(time)
}

/** How far a zone's clock is ahead of UTC at a moment, in milliseconds. */
function zoneOffset(ms: number, timeZone: string | undefined): number {
    if (timeZone === undefined) return -new Date(ms).getTimezoneOffset() * MINUTE
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).formatToParts(ms)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value ?? 0)
    const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'))
    return wall - (ms - (ms % MINUTE))
}

/** The ticks along an axis from `from` to `to` that fit `width` pixels: the step and each tick's time, on the zone's clock. */
export function timelineTicks(from: number, to: number, width: number, timeZone?: string): { step: number; ticks: number[] } {
    const span = Math.max(to - from, 1)
    const most = Math.max(Math.floor(width / TICK_ROOM), 2)
    const step = STEPS.find((candidate) => span / candidate <= most) ?? STEPS[STEPS.length - 1]
    const offset = zoneOffset(from, timeZone)
    const ticks: number[] = []
    for (let at = Math.ceil((from + offset) / step) * step - offset; at <= to; at += step) {
        // A step of a day or more lands on the zone's midnight even across a change of its clock.
        ticks.push(step >= DAY ? at + offset - zoneOffset(at, timeZone) : at)
    }
    return { step, ticks }
}

/** A shift written short and signed: `+2h`, `-1d 6h`, `+45m`. */
export function formatShift(ms: number): string {
    const sign = ms < 0 ? '-' : '+'
    let left = Math.round(Math.abs(ms) / MINUTE)
    const days = Math.floor(left / (24 * 60))
    left -= days * 24 * 60
    const hours = Math.floor(left / 60)
    const minutes = left - hours * 60
    const parts = [
        days > 0 ? `${String(days)}d` : '',
        hours > 0 ? `${String(hours)}h` : '',
        minutes > 0 ? `${String(minutes)}m` : '',
    ].filter(Boolean)
    return `${sign}${parts.length === 0 ? '0m' : parts.join(' ')}`
}

/** The share of the axis a time stands at, from 0 to 1, held to it. */
function share(at: number, from: number, to: number): number {
    return Math.min(Math.max((at - from) / Math.max(to - from, 1), 0), 1)
}

function percent(value: number): string {
    return `${String(value * 100)}%`
}

type DragLayer = typeof import('./run-timeline-drag')
let dragLayer: DragLayer | undefined
let dragLoad: Promise<DragLayer> | undefined

/** The drag layer, fetched the first time a timeline that shifts runs is drawn. */
function useDragLayer(wanted: boolean): DragLayer | undefined {
    const [loaded, setLoaded] = useState(dragLayer)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        dragLoad ??= import('./run-timeline-drag').then(
            (module) => (dragLayer = module),
            (error: unknown) => {
                dragLoad = undefined
                throw error
            },
        )
        dragLoad.then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return wanted ? (loaded ?? dragLayer) : undefined
}

/**
 * Jobs and their runs along one time axis: a lane per job, its name and state at the start, its runs
 * as marks colored by their state where they fell, those still to come hollow, and a line at the
 * current time. Ticks fit the width, on the time zone's clock. A lane can be chosen, and with
 * `onShift` the chosen lane's upcoming runs drag sideways as one, snapped, a card at the pointer
 * saying how far; the arrow keys move them from the keyboard. A `total` lane, such as how many run
 * at once, closes the list.
 */
export function RunTimeline({
    lanes,
    from: fromTime,
    to: toTime,
    now: nowTime,
    selected = null,
    onSelect,
    onShift,
    snap,
    legend,
    timeZone,
    locale,
    words: given,
    className,
}: RunTimelineProps) {
    const own = useWords(RUN_TIMELINE_PART)
    const words = useMemo(() => ({ ...own, ...given }), [own, given])
    const providerLocale = useLocale()
    const shownLocale = locale ?? providerLocale
    const from = timelineMs(fromTime)
    const to = timelineMs(toTime)
    const now = nowTime === undefined ? undefined : timelineMs(nowTime)
    // The axis is held in state, so a timeline drawn again around its drag layer measures the new one.
    const [axis, setAxis] = useState<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)
    useLayoutEffect(() => {
        if (axis === null) return
        setWidth(axis.clientWidth)
        const observer = new ResizeObserver(() => setWidth(axis.clientWidth))
        observer.observe(axis)
        return () => observer.disconnect()
    }, [axis])
    const { step, ticks } = useMemo(() => timelineTicks(from, to, width || 640, timeZone), [from, to, width, timeZone])
    const grain = snap ?? step / 4
    const tickWords = useMemo(() => {
        const day = new Intl.DateTimeFormat(shownLocale, { month: 'short', day: 'numeric', timeZone })
        const time = new Intl.DateTimeFormat(shownLocale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
        // A tick at the zone's midnight names its day; the others their time.
        return (at: number) => (step >= DAY || (at + zoneOffset(at, timeZone)) % DAY === 0 ? day.format(at) : time.format(at))
    }, [shownLocale, timeZone, step])
    const runWords = useMemo(
        () =>
            new Intl.DateTimeFormat(shownLocale, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
                timeZone,
            }),
        [shownLocale, timeZone],
    )

    const chosen = lanes.find((lane) => lane.id === selected && lane.total !== true)
    const upcomingOf = (lane: RunTimelineLane) => (now === undefined ? [] : lane.runs.filter((run) => timelineMs(run.at) > now))
    const shiftable = onShift !== undefined && chosen !== undefined && upcomingOf(chosen).length > 0
    const layer = useDragLayer(onShift !== undefined)
    const [carry, setCarryState] = useState<number | null>(null)
    // The card at the pointer is drawn once when a drag starts, so it reads the shift from here as it changes.
    const carried = useMemo(() => carryStore(), [])
    const setCarry = (value: number | null) => {
        setCarryState(value)
        carried.set(value ?? 0)
    }
    const [said, setSaid] = useState('')

    /** The shift a drag of `pixels` makes, snapped, never before the current time. */
    const shiftFor = (pixels: number, lane: RunTimelineLane): number => {
        const raw = width === 0 ? 0 : (pixels / width) * (to - from)
        const snapped = Math.round(raw / grain) * grain
        const first = Math.min(...upcomingOf(lane).map((run) => timelineMs(run.at)))
        return now === undefined ? snapped : Math.max(snapped, Math.ceil((now - first) / grain) * grain)
    }
    const shift = (lane: RunTimelineLane, by: number) => {
        if (by === 0) return
        onShift?.({ lane: lane.id, by })
        setSaid(words.shifted(lane.label ?? String(lane.name), formatShift(by)))
    }

    const states = useMemo(() => {
        if (legend === false) return []
        if (legend !== undefined) return legend
        const seen: string[] = []
        for (const lane of lanes)
            for (const run of lane.runs)
                if ((now === undefined || timelineMs(run.at) <= now) && run.status !== undefined && !seen.includes(run.status))
                    seen.push(run.status)
        return seen
    }, [legend, lanes, now])
    const anyUpcoming = now !== undefined && lanes.some((lane) => lane.runs.some((run) => timelineMs(run.at) > now))

    const nowAt = now === undefined || now < from || now > to ? undefined : share(now, from, to)
    const grid = (
        <>
            {ticks.map((at) => (
                <span key={at} aria-hidden className="absolute inset-y-0 w-px bg-border" style={{ left: percent(share(at, from, to)) }} />
            ))}
            {nowAt !== undefined && (
                <span aria-hidden className="absolute inset-y-0 z-1 w-px bg-primary" style={{ left: percent(nowAt) }} />
            )}
        </>
    )

    const body = (
        <div className={cn('flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-sm', className)}>
            {(states.length > 0 || anyUpcoming || shiftable) && legend !== false && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    {states.map((state) => (
                        <LegendEntry key={state} state={state} />
                    ))}
                    {anyUpcoming && (
                        <span className="flex items-center gap-1.5">
                            <Dot outline size="md" color="var(--muted-foreground)" />
                            {words.scheduled}
                        </span>
                    )}
                    {shiftable && <span className="ms-auto max-sm:hidden">{words.hint}</span>}
                </div>
            )}
            <div className="flex border-b border-border">
                <div className="w-28 shrink-0 sm:w-48" />
                <div ref={setAxis} className="relative h-8 min-w-0 flex-1">
                    {ticks.map((at) => {
                        const left = share(at, from, to)
                        return (
                            <span
                                key={at}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-2xs whitespace-nowrap text-muted-foreground"
                                style={{ left: percent(left) }}
                            >
                                {left > 0.02 && left < 0.98 && (nowAt === undefined || Math.abs(left - nowAt) * width > NOW_ROOM)
                                    ? tickWords(at)
                                    : null}
                            </span>
                        )
                    })}
                    {nowAt !== undefined && (
                        <span
                            className="absolute top-1/2 z-1 -translate-x-1/2 -translate-y-1/2 rounded-mini bg-primary px-1 font-mono text-2xs leading-4 font-semibold text-primary-foreground uppercase"
                            style={{ left: percent(nowAt) }}
                        >
                            {words.now}
                        </span>
                    )}
                </div>
            </div>
            {lanes.map((lane) => {
                const chosenLane = lane.id === chosen?.id
                const label = lane.label ?? (typeof lane.name === 'string' ? lane.name : lane.id)
                const upcoming = upcomingOf(lane)
                const moving = chosenLane && carry !== null ? carry : 0
                const name = (
                    <>
                        <span className={cn('block truncate font-mono', lane.total === true ? 'font-sans font-semibold' : 'font-medium')}>
                            {lane.name}
                        </span>
                        {lane.detail !== undefined && <span className="block truncate text-xs text-muted-foreground">{lane.detail}</span>}
                    </>
                )
                return (
                    <div
                        key={lane.id}
                        data-lane={lane.id}
                        data-selected={chosenLane || undefined}
                        className={cn(
                            'flex border-b border-border last:border-b-0',
                            lane.total === true && 'border-t border-border-strong',
                            chosenLane && 'bg-accent',
                        )}
                    >
                        {onSelect !== undefined && lane.total !== true ? (
                            <button
                                type="button"
                                aria-pressed={chosenLane}
                                onClick={() => onSelect(lane.id)}
                                className={cn(
                                    'w-28 shrink-0 border-s-2 border-transparent px-3 py-2 text-start outline-offset-focus-inset hover:bg-muted focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid sm:w-48',
                                    chosenLane && 'border-primary hover:bg-accent',
                                )}
                            >
                                {name}
                            </button>
                        ) : (
                            <div className="w-28 shrink-0 border-s-2 border-transparent px-3 py-2 sm:w-48">{name}</div>
                        )}
                        {/* A press anywhere in another lane chooses it, as its name does; the name stays the control a keyboard uses. */}
                        <div
                            data-lane-track
                            onClick={onSelect !== undefined && lane.total !== true && !chosenLane ? () => onSelect(lane.id) : undefined}
                            className={cn(
                                'relative min-h-12 min-w-0 flex-1 overflow-hidden',
                                onSelect !== undefined && lane.total !== true && !chosenLane && 'cursor-pointer hover:bg-muted/50',
                            )}
                        >
                            {grid}
                            {lane.runs.map((run) => {
                                const isUpcoming = now !== undefined && timelineMs(run.at) > now
                                const by = isUpcoming ? moving : 0
                                return (
                                    <RunMark
                                        key={run.id}
                                        run={run}
                                        upcoming={isUpcoming}
                                        from={from}
                                        to={to}
                                        by={by}
                                        faded={isUpcoming && moving !== 0}
                                        title={`${run.status ?? words.scheduled}, ${runWords.format(timelineMs(run.at))}`}
                                    />
                                )
                            })}
                            {chosenLane && shiftable && (
                                <ShiftHandle
                                    layer={layer}
                                    id={lane.id}
                                    label={words.upcoming(label)}
                                    left={share((now ?? Math.min(...upcoming.map((run) => timelineMs(run.at)))) + moving, from, to)}
                                    right={share(Math.max(...upcoming.map((run) => timelineMs(run.at))) + moving, from, to)}
                                    preview={() => <ShiftAmount store={carried} say={words.by} />}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                                        event.preventDefault()
                                        const amount = (event.shiftKey ? step : grain) * (event.key === 'ArrowLeft' ? -1 : 1)
                                        const first = Math.min(...upcoming.map((run) => timelineMs(run.at)))
                                        shift(lane, now !== undefined && first + amount <= now ? 0 : amount)
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
            })}
            <span aria-live="polite" className="sr-only">
                {said}
            </span>
        </div>
    )

    if (layer === undefined || chosen === undefined) return body
    return (
        <layer.ShiftDragArea
            onMove={(pixels) => setCarry(shiftFor(pixels, chosen))}
            onEnd={(pixels) => {
                setCarry(null)
                shift(chosen, shiftFor(pixels, chosen))
            }}
            onCancel={() => setCarry(null)}
        >
            {body}
        </layer.ShiftDragArea>
    )
}

interface CarryStore {
    get: () => number
    set: (value: number) => void
    subscribe: (listener: () => void) => () => void
}

/** Where a drag has carried the runs, for the card at the pointer to follow. */
function carryStore(): CarryStore {
    let value = 0
    const listeners = new Set<() => void>()
    return {
        get: () => value,
        set: (next) => {
            value = next
            for (const listener of listeners) listener()
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}

/** How far the runs move, on the card at the pointer. */
function ShiftAmount({ store, say }: { store: CarryStore; say: (amount: string) => string }) {
    const by = useSyncExternalStore(store.subscribe, store.get, store.get)
    return <span className="block px-2 py-1 font-mono text-xs">{say(formatShift(by))}</span>
}

function LegendEntry({ state }: { state: string }) {
    const look = useStatus(state)
    return (
        <span className="flex items-center gap-1.5">
            <Dot size="md" status={state} />
            {look.label}
        </span>
    )
}

interface RunMarkProps {
    run: RunTimelineRun
    upcoming: boolean
    from: number
    to: number
    /** How far a drag carries it now, in milliseconds. */
    by: number
    faded: boolean
    title: string
}

/** A run where it fell: a bar from its start to its end, or a mark at its start; hollow while it is still to come. */
function RunMark({ run, upcoming, from, to, by, faded, title }: RunMarkProps) {
    const look = useStatus(run.status ?? '')
    const at = timelineMs(run.at) + by
    const end = run.end === undefined ? undefined : timelineMs(run.end) + by
    if (end !== undefined ? end < from || at > to : at < from || at > to) return null
    const left = share(at, from, to)
    const color = upcoming ? 'var(--muted-foreground)' : look.css
    return (
        <>
            {faded && (
                <span
                    aria-hidden
                    className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-mini border border-dashed border-border-strong"
                    style={{ left: percent(share(timelineMs(run.at), from, to)) }}
                />
            )}
            <span
                title={title}
                data-run={run.id}
                className={cn(
                    'absolute top-1/2 z-2 h-4 -translate-y-1/2 rounded-mini',
                    end === undefined ? 'w-1 -translate-x-1/2' : 'min-w-1',
                    upcoming && 'border',
                )}
                style={{
                    left: percent(left),
                    width: end === undefined ? undefined : percent(share(end, from, to) - left),
                    backgroundColor: upcoming ? undefined : color,
                    borderColor: upcoming ? color : undefined,
                }}
            />
        </>
    )
}

interface ShiftHandleProps {
    layer: DragLayer | undefined
    id: string
    label: string
    left: number
    right: number
    preview: () => ReactNode
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

/** The chosen lane's upcoming runs as one thing to drag, or to move with the arrows once focused. */
function ShiftHandle({ layer, id, label, left, right, preview, onKeyDown }: ShiftHandleProps) {
    const draw = (ref?: (element: HTMLElement | null) => void, press?: object) => (
        <span
            ref={ref}
            {...press}
            title={label}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight"
            onKeyDown={onKeyDown}
            data-shift-handle
            className="absolute inset-y-1 z-3 cursor-grab touch-none rounded-control border border-dashed border-primary/50 bg-primary/5 outline-offset-focus-inset hover:bg-primary/10 focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid active:cursor-grabbing"
            // From the current time to two spacing steps past the last run, so the whole stretch ahead is taken.
            style={{ left: percent(left), width: `calc(${percent(Math.max(right - left, 0))} + var(--spacing) * 2)` }}
        >
            <GripVertical aria-hidden className="absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 text-primary" />
        </span>
    )
    if (layer === undefined) return draw()
    return (
        <layer.ShiftDrag id={id} label={label} preview={preview}>
            {({ ref, press }) => draw(ref, press)}
        </layer.ShiftDrag>
    )
}
