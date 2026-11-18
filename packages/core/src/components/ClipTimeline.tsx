import { AudioLines, Eye, EyeOff, Film, Lock, LockOpen, Type, Volume2, VolumeX, type LucideIcon } from 'lucide-react'
import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type KeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import type { ClipArrival, ClipCarry, ClipGrip } from './clip-timeline-drag'
import type { DragData } from './DragDrop'
import { IconButton } from './IconButton'

/** What a track holds. */
export type ClipTrackKind = 'video' | 'audio' | 'title'

/** One row of the timeline. */
export interface TimelineTrack {
    id: string
    name: string
    kind: ClipTrackKind
    /** Its sound off: its clips drawn faint. */
    muted?: boolean
    /** Its clips neither move, trim, split nor delete. */
    locked?: boolean
    /** Left out of the picture: its clips drawn faint. */
    hidden?: boolean
}

/** One clip on a track. */
export interface TimelineClip {
    id: string
    /** The id of the track it lies on. */
    track: string
    /** Where it starts on the timeline, in seconds. */
    start: number
    /** How long it lasts, in seconds. */
    duration: number
    /** Where in its source it starts, in seconds; 0 when left out. */
    inPoint?: number
    /** How long its source is, in seconds; trimming never reaches past either end of it. */
    sourceDuration?: number
    label: string
    /** Its color; by its track's kind when left out: video blue, audio green, a title violet. */
    color?: KindColor
    /** The loudness of its whole source from 0 to 1, drawn across an audio clip for the part it plays. */
    waveform?: readonly number[]
}

/** What a move or a trim changed of one clip; only what changed is given. */
export interface ClipChange {
    id: string
    start?: number
    duration?: number
    inPoint?: number
    track?: string
}

/** A thing from elsewhere in the same `DragDrop`, let go on a track. */
export interface ClipDrop {
    /** What the thing carries: its kind, its label and the app's own value. */
    data: DragData
    /** The id of the track it was let go on. */
    track: string
    /** Where it lands, in seconds: snapped, and clear of the track's clips when its length is known. */
    at: number
}

export interface ClipTimelineWords {
    /** What a screen reader calls the timeline. */
    label: string
    /** What a screen reader calls the playhead. */
    playhead: string
    /** Each kind of track, beside its icon. */
    kinds: Record<ClipTrackKind, string>
    /** The toggles in a track's header, on or off. */
    mute: string
    lock: string
    hide: string
    /** What a screen reader calls a clip, given where it starts and ends as timecode. */
    clip: (label: string, start: string, end: string) => string
    /** On the card at the pointer while a clip moves. */
    start: (at: string) => string
    /** On the card at the pointer while a clip is trimmed. */
    length: (length: string) => string
    /** Said once a clip moved, and to which track when it changed track. */
    moved: (clip: string, at: string, track?: string) => string
    trimmed: (clip: string, length: string) => string
    split: (clip: string, at: string) => string
    deleted: (count: number, ripple: boolean) => string
    /** Said when a move would land on another clip or a locked track. */
    blocked: (clip: string) => string
    /** Said once a thing from elsewhere landed on a track. */
    dropped: (item: string, track: string, at: string) => string
    /** Said as the playhead moves by a key. */
    at: (at: string) => string
    /** For the zoom buttons an app draws beside the timeline. */
    zoomIn: string
    zoomOut: string
    zoomFit: string
}

export const CLIP_TIMELINE_WORDS: ClipTimelineWords = {
    label: 'Timeline',
    playhead: 'Playhead',
    kinds: { video: 'Video', audio: 'Audio', title: 'Title' },
    mute: 'Mute',
    lock: 'Lock',
    hide: 'Hide',
    clip: (label, start, end) => `${label}, ${start} to ${end}`,
    start: (at) => `Start ${at}`,
    length: (length) => `Length ${length}`,
    moved: (clip, at, track) => (track === undefined ? `${clip} moved to ${at}` : `${clip} moved to ${track} at ${at}`),
    trimmed: (clip, length) => `${clip} trimmed to ${length}`,
    split: (clip, at) => `${clip} split at ${at}`,
    deleted: (count, ripple) =>
        `${count === 1 ? 'Clip' : `${count.toLocaleString('en-US')} clips`} deleted${ripple ? ', the gap closed' : ''}`,
    blocked: (clip) => `${clip} cannot go there`,
    dropped: (item, track, at) => `${item} added to ${track} at ${at}`,
    at: (at) => `Playhead at ${at}`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomFit: 'Fit',
}

/** Where a catalog holds a clip timeline's words, and the arguments its phrases name. */
export const CLIP_TIMELINE_PART: WordsPart<ClipTimelineWords> = {
    id: 'clipTimeline',
    words: CLIP_TIMELINE_WORDS,
    args: {
        clip: 'label start end',
        start: 'at',
        length: 'length',
        moved: 'clip at track',
        trimmed: 'clip length',
        split: 'clip at',
        deleted: 'count ripple',
        blocked: 'clip',
        dropped: 'item track at',
        at: 'at',
    },
}

/** A clip timeline's phrases as ICU messages in English, for the catalog. */
export const CLIP_TIMELINE_MESSAGES: WordMessages<ClipTimelineWords> = {
    clip: '{label}, {start} to {end}',
    start: 'Start {at}',
    length: 'Length {length}',
    moved: '{track, select, undefined {{clip} moved to {at}} other {{clip} moved to {track} at {at}}}',
    trimmed: '{clip} trimmed to {length}',
    split: '{clip} split at {at}',
    deleted: '{count, plural, =1 {Clip} other {# clips}} deleted{ripple, select, true {, the gap closed} other {}}',
    blocked: '{clip} cannot go there',
    dropped: '{item} added to {track} at {at}',
    at: 'Playhead at {at}',
}

export interface ClipTimelineProps {
    tracks: readonly TimelineTrack[]
    clips: readonly TimelineClip[]
    /** The timeline's length in seconds; the ruler reaches at least this far, and further when a clip does. */
    duration: number
    /** Where the playhead stands, in seconds. */
    playhead: number
    /** Hears where the playhead goes: a press or a drag on the ruler, or the arrow keys. */
    onPlayheadChange: (seconds: number) => void
    /** The ids of the clips chosen, drawn outlined. */
    selected?: readonly string[]
    /** Hears the clips chosen: a press chooses one, with Shift or the command key it adds or takes one away. */
    onSelectedChange?: (ids: string[]) => void
    /**
     * Hears clips moved, along their track or to another of the same kind, or trimmed at either end.
     * The clips stay where they are until the app moves them; without it they are read-only.
     */
    onClipsChange?: (changes: ClipChange[]) => void
    /** Hears S: split each chosen clip the playhead stands in, at the playhead. */
    onSplit?: (id: string, at: number) => void
    /** Hears Delete or Backspace on the chosen clips; with Shift, `ripple` closes the gap they leave. */
    onDelete?: (ids: string[], ripple: boolean) => void
    /**
     * Takes things dragged from another part inside the same `DragDrop`, such as a media bin's tiles,
     * let go on a track: the thing's data, the track and the time it lands at. While one is carried
     * over a track that takes it, an outline shows where it lands, snapped as a move is, as long as
     * `dropDuration` says; from the keyboard it lands at the playhead.
     */
    onDrop?: (drop: ClipDrop) => void
    /** Which things from outside a track takes, such as only video onto a video track; every one without it. A locked track takes none. */
    accepts?: (drag: DragData, track: TimelineTrack) => boolean
    /**
     * How long a thing from outside lasts once dropped, in seconds, for its outline, its snapping at
     * both ends and keeping it off the track's clips; by default its `value.duration` when that is a number.
     */
    dropDuration?: (drag: DragData) => number | undefined
    /** Hears a track's header toggles; without it the header draws none. */
    onTrackChange?: (id: string, patch: Partial<Pick<TimelineTrack, 'muted' | 'locked' | 'hidden'>>) => void
    /**
     * How wide a second is drawn, in pixels. Left out, the timeline's length fits its width, and with
     * no `onZoomChange` the timeline keeps its own zoom. A fit is never drawn tighter than
     * `clipFitZoom` allows: a second keeps at least `CLIP_TIMELINE_FIT.pixelsPerSecond` (room for the
     * first few characters of a typical clip's label), or the room the whole length would get from
     * `CLIP_TIMELINE_FIT.room` pixels, whichever is less. In a room narrower than that, as on a phone,
     * the lanes scroll sideways inside the timeline.
     */
    zoom?: number
    /** Hears a zoom asked for with the command key and the wheel, or a pinch, held around the pointer. */
    onZoomChange?: (pixelsPerSecond: number) => void
    /**
     * Hears the zoom the fitted view draws at, `clipFitZoom` of the lanes' width, as the width changes,
     * for an app's zoom buttons to start from.
     */
    onFitChange?: (pixelsPerSecond: number) => void
    /** Frames a second: the ruler's timecode, what a time snaps to and how far an arrow steps. 30 by default. */
    fps?: number
    /** Whether a dragged edge snaps to the playhead, another clip's edge and 0. On by default. */
    snap?: boolean
    words?: Partial<ClipTimelineWords>
    className?: string
}

/** How near an edge comes to a time before it snaps to it, in pixels. */
const SNAP_REACH = 8

/** The least room a tick's label takes, in pixels. */
const TICK_ROOM = 88

/** The steps ticks are placed at, in seconds, past the frame steps. */
const SECOND_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]

/** The narrowest and widest a second is drawn by a zoom the timeline asks for, in pixels. */
export const CLIP_TIMELINE_ZOOM = { min: 0.05, max: 600 } as const

/**
 * The floor of a fitted view. `pixelsPerSecond`: a typical clip of 4 seconds keeps 64 pixels, the
 * first five or six characters of its label beside its padding. `room`: the lanes' width on a
 * laptop; a length that would outgrow it at that floor is drawn as this room fits it, so a long
 * timeline still fits whole on a desktop.
 */
export const CLIP_TIMELINE_FIT = { pixelsPerSecond: 64 / 4, room: 960 } as const

/**
 * The zoom at which a timeline `length` seconds long fits lanes `room` pixels wide, never tighter than
 * `CLIP_TIMELINE_FIT.pixelsPerSecond`, or than `length` fitted to `CLIP_TIMELINE_FIT.room` when that
 * is tighter still. Past that floor the lanes are wider than the room and scroll.
 */
export function clipFitZoom(room: number, length: number): number {
    const span = Math.max(length, 1)
    return Math.max(room / span, Math.min(CLIP_TIMELINE_FIT.pixelsPerSecond, CLIP_TIMELINE_FIT.room / span))
}

const NEAR = 1e-6

const DEFAULT_COLOR: Record<ClipTrackKind, KindColor> = { video: 'blue', audio: 'green', title: 'violet' }

/** A clip's block in its color: a wash with its ink, edged in the color. */
const CLIP_LOOK: Record<KindColor, string> = {
    blue: 'border-kind-blue/60 bg-kind-blue/25 text-kind-blue-ink',
    green: 'border-kind-green/60 bg-kind-green/25 text-kind-green-ink',
    jade: 'border-kind-jade/60 bg-kind-jade/25 text-kind-jade-ink',
    pink: 'border-kind-pink/60 bg-kind-pink/25 text-kind-pink-ink',
    teal: 'border-kind-teal/60 bg-kind-teal/25 text-kind-teal-ink',
    violet: 'border-kind-violet/60 bg-kind-violet/25 text-kind-violet-ink',
}

const KIND_ICON: Record<ClipTrackKind, LucideIcon> = { video: Film, audio: AudioLines, title: Type }

/** A time as timecode, `HH:MM:SS:FF`, at `fps` frames a second. */
export function formatTimecode(seconds: number, fps: number = 30): string {
    const rate = Math.max(Math.round(fps), 1)
    const frames = Math.round(Math.max(seconds, 0) * rate)
    const whole = Math.floor(frames / rate)
    const pad = (value: number, width = 2) => String(value).padStart(width, '0')
    return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}:${pad(frames % rate, String(rate - 1).length)}`
}

/** The target nearest `time` within `reach` seconds, or undefined. */
function nearest(time: number, targets: readonly number[], reach: number): number | undefined {
    let best: number | undefined
    for (const target of targets) {
        const distance = Math.abs(target - time)
        if (distance <= reach && (best === undefined || distance < Math.abs(best - time))) best = target
    }
    return best
}

/** A time snapped: to the nearest of `targets` within `reach` seconds, or else to the nearest frame. */
export function snapTime(time: number, targets: readonly number[], reach: number, fps: number = 30): number {
    return nearest(time, targets, reach) ?? Math.round(time * fps) / fps
}

/**
 * Where a clip of `duration` seconds asked to start at `start` lands among the clips of its track,
 * never on one: where asked when that is free, else the nearest free place beside a clip in the way,
 * or null when none is within the clip's own length of where it was asked.
 */
export function placeClip(start: number, duration: number, others: readonly { start: number; duration: number }[]): number | null {
    const asked = Math.max(start, 0)
    const free = (at: number) =>
        at >= -NEAR && others.every((other) => at + duration <= other.start + NEAR || at >= other.start + other.duration - NEAR)
    if (free(asked)) return asked
    let best: number | null = null
    for (const other of others)
        for (const at of [other.start + other.duration, other.start - duration])
            if (free(at) && (best === null || Math.abs(at - asked) < Math.abs(best - asked))) best = at
    return best !== null && Math.abs(best - asked) <= duration ? best : null
}

/** The next zoom a button asks for: `steps` steps of a quarter in, or out when below zero, held within `CLIP_TIMELINE_ZOOM`. */
export function zoomStep(pixelsPerSecond: number, steps: number): number {
    return Math.min(Math.max(pixelsPerSecond * 1.25 ** steps, CLIP_TIMELINE_ZOOM.min), CLIP_TIMELINE_ZOOM.max)
}

/** The step between labeled ticks for a zoom, in seconds: a few frames when close, up to an hour. */
export function clipTickStep(pixelsPerSecond: number, fps: number = 30): number {
    const frame = 1 / Math.max(Math.round(fps), 1)
    const steps = [frame, 2 * frame, 5 * frame, 10 * frame, ...SECOND_STEPS]
    return steps.find((step) => step * pixelsPerSecond >= TICK_ROOM) ?? SECOND_STEPS[SECOND_STEPS.length - 1]
}

type DragLayer = typeof import('./clip-timeline-drag')
let dragLayer: DragLayer | undefined
let dragLoad: Promise<DragLayer> | undefined

/** The drag layer, fetched the first time a timeline that changes its clips is drawn. */
function useDragLayer(wanted: boolean): DragLayer | undefined {
    const [loaded, setLoaded] = useState(dragLayer)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        dragLoad ??= import('./clip-timeline-drag').then(
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

/** Where a drag would put a clip. */
interface Proposal {
    id: string
    grip: ClipGrip
    start: number
    duration: number
    inPoint: number
    track: string
    /** Whether it lands there; false when it would cover another clip. */
    fits: boolean
    /** The time an edge snapped to, drawn as a line. */
    snapped?: number
}

interface ProposalStore {
    get: () => Proposal | null
    set: (value: Proposal | null) => void
    subscribe: (listener: () => void) => () => void
}

function proposalStore(): ProposalStore {
    let value: Proposal | null = null
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

const end = (clip: { start: number; duration: number }) => clip.start + clip.duration

/** A dragged thing's `value.duration`, when it is a length in seconds. */
function durationOf(drag: DragData): number | undefined {
    const value = drag.value as { duration?: unknown } | null | undefined
    return typeof value?.duration === 'number' && value.duration > 0 ? value.duration : undefined
}

/** Where a thing from outside would land. */
interface Landing {
    track: string
    start: number
    /** Its length, when known; a mark at `start` without it. */
    duration?: number
    fits: boolean
    snapped?: number
}

/**
 * The multi-track timeline of a video editor. Each track is a row with its header at the start (its
 * kind, its name, and with `onTrackChange` toggles to mute or hide it and to lock it), which stays
 * put while the lanes scroll sideways under a ruler of timecode that fits the zoom. Clips are blocks
 * in their color with their label, an audio clip drawing its waveform and a title dashed; the chosen
 * ones are outlined. A press or a drag on the ruler moves the playhead, a line across every track.
 *
 * With `onClipsChange` a clip drags along its track or onto another of the same kind, and either end
 * drags to trim it, never past its source; a card at the pointer says the new start or length, and
 * its edges snap to the playhead, other clips' edges and 0 (`snap`). A clip never lands on another:
 * dropped on one, it goes to the nearest free place beside it, or back where it was when none is
 * near. A locked track's clips stay put. The command key with the wheel, or a pinch, zooms around
 * the pointer.
 *
 * From the keyboard each clip is a stop of its own, Enter choosing it; Left and Right move the
 * playhead a frame (a second with Shift), Home and End to either end, Alt with them the chosen clips
 * a frame, S splits them at the playhead and Delete deletes them (Shift closes the gap). Each change
 * is said to a screen reader.
 */
export function ClipTimeline({
    tracks,
    clips,
    duration,
    playhead,
    onPlayheadChange,
    selected = [],
    onSelectedChange,
    onClipsChange,
    onSplit,
    onDelete,
    onDrop,
    accepts,
    dropDuration = durationOf,
    onTrackChange,
    zoom,
    onZoomChange,
    onFitChange,
    fps = 30,
    snap = true,
    words: given,
    className,
}: ClipTimelineProps) {
    const ownWords = useWords(CLIP_TIMELINE_PART)
    const words = useMemo(() => ({ ...ownWords, ...given }), [ownWords, given])
    const frame = 1 / Math.max(Math.round(fps), 1)
    const toFrame = (time: number) => Math.round(time / frame) * frame

    const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
    const content = useRef<HTMLDivElement>(null)
    const root = useRef<HTMLDivElement>(null)
    const side = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    /** The lanes' width in sight: the scroller's, less the header column held at its start. */
    const [viewport, setViewport] = useState(0)
    useLayoutEffect(() => {
        if (scroller === null) return
        const measure = () => setViewport(Math.max(scroller.clientWidth - (side.current?.offsetWidth ?? 0), 0))
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(scroller)
        if (side.current !== null) observer.observe(side.current)
        return () => observer.disconnect()
    }, [scroller])

    const total = Math.max(duration, ...clips.map(end), 0)
    const room = viewport || 640
    const fit = clipFitZoom(room, total)
    const [own, setOwn] = useState<number | null>(null)
    useEffect(() => {
        if (viewport > 0) onFitChange?.(fit)
    }, [fit, viewport, onFitChange])
    const pps = zoom ?? own ?? fit
    const width = Math.max(total * pps, room)
    const reach = width / pps

    const trackOf = (id: string) => tracks.find((track) => track.id === id)
    const clipOf = (id: string) => clips.find((clip) => clip.id === id)
    const locked = (clip: TimelineClip) => trackOf(clip.track)?.locked === true
    const chosen = clips.filter((clip) => selected.includes(clip.id))

    const [said, setSaid] = useState('')
    const layer = useDragLayer(onClipsChange !== undefined || onDrop !== undefined)
    const scope = useId()
    const [landing, setLanding] = useState<Landing | null>(null)
    const [proposal, setProposalState] = useState<Proposal | null>(null)
    const carried = useMemo(() => proposalStore(), [])
    const setProposal = (value: Proposal | null) => {
        setProposalState(value)
        carried.set(value)
    }
    /** How far from the grabbed edge the pointer was pressed, in seconds. */
    const grab = useRef<number | null>(null)

    /** The time under a point on the page, in seconds. */
    const timeAt = (x: number) => {
        const box = content.current?.getBoundingClientRect()
        return box === undefined ? 0 : (x - box.left) / pps
    }

    // A zoom held around the pointer: the time under it stays under it once the new zoom is drawn.
    const anchor = useRef<{ time: number; x: number } | null>(null)
    useLayoutEffect(() => {
        const held = anchor.current
        if (held === null || scroller === null) return
        anchor.current = null
        scroller.scrollLeft = held.time * pps - held.x
    }, [pps, scroller])
    const zoomRef = useRef({ pps, fit, onZoomChange, controlled: zoom !== undefined, timeAt })
    zoomRef.current = { pps, fit, onZoomChange, controlled: zoom !== undefined, timeAt }
    useEffect(() => {
        if (scroller === null) return
        const wheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return
            event.preventDefault()
            const now = zoomRef.current
            const rate = Math.abs(event.deltaY) < 50 ? 0.01 : 0.002
            const next = Math.min(
                Math.max(now.pps * Math.exp(-event.deltaY * rate), now.fit / 2, CLIP_TIMELINE_ZOOM.min),
                CLIP_TIMELINE_ZOOM.max,
            )
            if (Math.abs(next - now.pps) < NEAR) return
            const time = now.timeAt(event.clientX)
            anchor.current = { time, x: time * now.pps - scroller.scrollLeft }
            now.onZoomChange?.(next)
            if (now.onZoomChange === undefined && !now.controlled) setOwn(next)
        }
        scroller.addEventListener('wheel', wheel, { passive: false })
        return () => scroller.removeEventListener('wheel', wheel)
    }, [scroller])

    // The playhead is in sight when the timeline is first drawn, and stays in sight as a key moves it.
    const follow = useRef(true)
    useLayoutEffect(() => {
        if (!follow.current || scroller === null) return
        follow.current = false
        const x = playhead * pps
        if (x < scroller.scrollLeft) scroller.scrollLeft = x - room / 4
        else if (x > scroller.scrollLeft + room) scroller.scrollLeft = x - (room * 3) / 4
    }, [playhead, pps, scroller, room])

    const seek = (time: number, byKey = false) => {
        const at = Math.min(Math.max(toFrame(time), 0), toFrame(reach))
        if (byKey) {
            follow.current = true
            setSaid(words.at(formatTimecode(at, fps)))
        }
        onPlayheadChange(at)
    }

    /** The times an edge snaps to: 0, the playhead and every other clip's edges. */
    const targetsFor = (id: string) =>
        snap ? [0, playhead, ...clips.filter((clip) => clip.id !== id).flatMap((clip) => [clip.start, end(clip)])] : []

    /** The track whose lane holds a point on the page, its lanes' visible part only: past the headers and under the ruler. */
    const laneUnder = (point: { x: number; y: number }): TimelineTrack | undefined => {
        if (scroller === null) return undefined
        const shown = scroller.getBoundingClientRect()
        const left = side.current?.getBoundingClientRect().right ?? shown.left
        const top = ruler.current?.getBoundingClientRect().bottom ?? shown.top
        if (point.x < left || point.x > shown.left + scroller.clientWidth) return undefined
        if (point.y < top || point.y > shown.top + scroller.clientHeight) return undefined
        const lanes = root.current?.querySelectorAll<HTMLElement>('[data-track-lane]') ?? []
        for (const lane of lanes) {
            const box = lane.getBoundingClientRect()
            if (point.y >= box.top && point.y < box.bottom) return trackOf(lane.dataset.trackLane ?? '')
        }
        return undefined
    }

    /** The track under a point, if it takes a clip of `kind`. */
    const laneAt = (point: { x: number; y: number }, kind: ClipTrackKind): TimelineTrack | undefined => {
        const track = laneUnder(point)
        return track !== undefined && track.kind === kind && track.locked !== true ? track : undefined
    }

    /** A span asked to start at `asked`, snapped by whichever end comes nearer a target, else to a frame. */
    const snapSpan = (asked: number, length: number, targets: readonly number[]): { start: number; snapped?: number } => {
        const near = SNAP_REACH / pps
        const byStart = nearest(asked, targets, near)
        const byEnd = length > 0 ? nearest(asked + length, targets, near) : undefined
        if (byStart !== undefined && (byEnd === undefined || Math.abs(byStart - asked) <= Math.abs(byEnd - asked - length)))
            return { start: byStart, snapped: byStart }
        if (byEnd !== undefined) return { start: byEnd - length, snapped: byEnd }
        return { start: toFrame(asked) }
    }

    /** Whether a track takes a thing dragged from outside. */
    const trackTakes = (track: TimelineTrack, drag: DragData) => track.locked !== true && (accepts?.(drag, track) ?? true)

    /** Where a thing from outside would land, or null over no track that takes it. */
    const landingFor = (from: ClipArrival): Landing | null => {
        const track = from.point === null ? (from.over === null ? undefined : trackOf(from.over)) : laneUnder(from.point)
        if (track === undefined || !trackTakes(track, from.data)) return null
        const length = dropDuration(from.data)
        const asked = from.point === null ? playhead : timeAt(from.point.x)
        const { start, snapped } = snapSpan(asked, length ?? 0, targetsFor(''))
        const at = Math.max(start, 0)
        if (length === undefined) return { track: track.id, start: at, fits: true, snapped }
        const placed = placeClip(
            at,
            length,
            clips.filter((clip) => clip.track === track.id),
        )
        return {
            track: track.id,
            start: placed ?? at,
            duration: length,
            fits: placed !== null,
            snapped: placed !== null && Math.abs(placed - start) < NEAR ? snapped : undefined,
        }
    }

    /** Where the drag in `carry` would put its clip. */
    const propose = (carry: ClipCarry): Proposal | null => {
        const clip = clipOf(carry.id)
        const home = clip === undefined ? undefined : trackOf(clip.track)
        if (clip === undefined || home === undefined || carry.point === null) return null
        const inPoint = clip.inPoint ?? 0
        const edge = carry.grip === 'end' ? end(clip) : clip.start
        if (grab.current === null) grab.current = carry.start === null ? 0 : timeAt(carry.start.x) - edge
        const asked = timeAt(carry.point.x) - grab.current
        const targets = targetsFor(clip.id)
        const near = SNAP_REACH / pps
        const neighbors = (track: string) => clips.filter((other) => other.track === track && other.id !== clip.id)

        if (carry.grip === 'move') {
            const track = laneAt(carry.point, home.kind) ?? home
            const { start, snapped } = snapSpan(asked, clip.duration, targets)
            const placed = placeClip(Math.max(start, 0), clip.duration, neighbors(track.id))
            return {
                id: clip.id,
                grip: 'move',
                start: placed ?? Math.max(start, 0),
                duration: clip.duration,
                inPoint,
                track: track.id,
                fits: placed !== null,
                snapped: placed !== null && Math.abs(placed - start) < NEAR ? snapped : undefined,
            }
        }

        const others = neighbors(clip.track)
        const snapped = nearest(asked, targets, near)
        const at = snapped ?? toFrame(asked)
        if (carry.grip === 'start') {
            const before = Math.max(0, clip.start - inPoint, ...others.filter((other) => end(other) <= clip.start + NEAR).map(end))
            const start = Math.min(Math.max(at, before), end(clip) - frame)
            return {
                id: clip.id,
                grip: 'start',
                start,
                duration: end(clip) - start,
                inPoint: inPoint + start - clip.start,
                track: clip.track,
                fits: true,
                snapped: snapped !== undefined && Math.abs(start - snapped) < NEAR ? snapped : undefined,
            }
        }
        const after = Math.min(
            Number.POSITIVE_INFINITY,
            ...others.filter((other) => other.start >= end(clip) - NEAR).map((other) => other.start),
            clip.sourceDuration === undefined ? Number.POSITIVE_INFINITY : clip.start + clip.sourceDuration - inPoint,
        )
        const finish = Math.max(Math.min(at, after), clip.start + frame)
        return {
            id: clip.id,
            grip: 'end',
            start: clip.start,
            duration: finish - clip.start,
            inPoint,
            track: clip.track,
            fits: true,
            snapped: snapped !== undefined && Math.abs(finish - snapped) < NEAR ? snapped : undefined,
        }
    }

    /** The change a proposal makes to its clip, or undefined when it makes none. */
    const changeOf = (to: Proposal): ClipChange | undefined => {
        const clip = clipOf(to.id)
        if (clip === undefined || !to.fits) return undefined
        const change: ClipChange = { id: clip.id }
        if (Math.abs(to.start - clip.start) > NEAR) change.start = to.start
        if (Math.abs(to.duration - clip.duration) > NEAR) change.duration = to.duration
        if (Math.abs(to.inPoint - (clip.inPoint ?? 0)) > NEAR) change.inPoint = to.inPoint
        if (to.track !== clip.track) change.track = to.track
        return Object.keys(change).length === 1 ? undefined : change
    }

    const sayChange = (clip: TimelineClip, change: ClipChange) => {
        if (change.duration !== undefined) setSaid(words.trimmed(clip.label, formatTimecode(change.duration, fps)))
        else
            setSaid(
                words.moved(
                    clip.label,
                    formatTimecode(change.start ?? clip.start, fps),
                    change.track === undefined ? undefined : trackOf(change.track)?.name,
                ),
            )
    }

    const settle = () => {
        grab.current = null
        setProposal(null)
    }

    /** Moves the chosen clips a frame along their tracks, each only where it stays clear of the others. */
    const nudge = (by: number) => {
        if (onClipsChange === undefined) return
        const changes: ClipChange[] = []
        for (const clip of chosen) {
            const start = toFrame(clip.start + by)
            const others = clips.filter((other) => other.track === clip.track && other.id !== clip.id)
            if (locked(clip) || start < -NEAR || placeClip(start, clip.duration, others) !== start) {
                setSaid(words.blocked(clip.label))
                return
            }
            changes.push({ id: clip.id, start: Math.max(start, 0) })
        }
        if (changes.length === 0) return
        onClipsChange(changes)
        if (chosen.length === 1) sayChange(chosen[0], changes[0])
    }

    const split = () => {
        if (onSplit === undefined) return
        const at = toFrame(playhead)
        for (const clip of chosen) {
            if (locked(clip) || at <= clip.start + NEAR || at >= end(clip) - NEAR) continue
            onSplit(clip.id, at)
            setSaid(words.split(clip.label, formatTimecode(at, fps)))
        }
    }

    const remove = (ripple: boolean) => {
        if (onDelete === undefined) return
        const ids = chosen.filter((clip) => !locked(clip)).map((clip) => clip.id)
        if (ids.length === 0) return
        onDelete(ids, ripple)
        setSaid(words.deleted(ids.length, ripple))
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented) return
        const mod = event.metaKey || event.ctrlKey
        if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !mod) {
            const sign = event.key === 'ArrowLeft' ? -1 : 1
            event.preventDefault()
            if (event.altKey) nudge(sign * frame)
            else seek(playhead + sign * (event.shiftKey ? 1 : frame), true)
        } else if ((event.key === 'Home' || event.key === 'End') && !mod && !event.altKey) {
            event.preventDefault()
            seek(event.key === 'Home' ? 0 : total, true)
        } else if ((event.key === 's' || event.key === 'S') && !mod && !event.altKey && onSplit !== undefined) {
            event.preventDefault()
            split()
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && !mod && onDelete !== undefined && chosen.length > 0) {
            event.preventDefault()
            remove(event.shiftKey)
        }
    }

    const choose = (id: string, adding: boolean) => {
        if (onSelectedChange === undefined) return
        if (!adding) onSelectedChange([id])
        else onSelectedChange(selected.includes(id) ? selected.filter((each) => each !== id) : [...selected, id])
    }

    /** Follows a press on the ruler, the playhead going where the pointer is. */
    const scrub = (press: ReactPointerEvent<HTMLElement>) => {
        if (press.button !== 0) return
        press.preventDefault()
        const target = press.currentTarget
        target.setPointerCapture(press.pointerId)
        seek(timeAt(press.clientX))
        const move = (event: PointerEvent) => seek(timeAt(event.clientX))
        const up = () => {
            target.removeEventListener('pointermove', move)
            target.removeEventListener('pointerup', up)
            target.removeEventListener('pointercancel', up)
        }
        target.addEventListener('pointermove', move)
        target.addEventListener('pointerup', up)
        target.addEventListener('pointercancel', up)
    }

    const step = clipTickStep(pps, fps)
    const ticks = useMemo(() => {
        const list: number[] = []
        for (let index = 0; index * step <= reach + NEAR; index++) list.push(index * step)
        return list
    }, [step, reach])
    const minor = step / 5
    const minors = useMemo(() => {
        if (minor * pps < 8) return []
        const list: number[] = []
        for (let index = 1; index * minor <= reach + NEAR; index++) if (index % 5 !== 0) list.push(index * minor)
        return list
    }, [minor, pps, reach])

    const head = Math.min(Math.max(playhead, 0), reach) * pps
    const changing = onClipsChange !== undefined

    const body = (
        <div
            ref={root}
            role="group"
            aria-label={words.label}
            onKeyDown={onKeyDown}
            className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-sm', className)}
        >
            <div ref={setScroller} data-timeline-scroller className="relative min-h-0 flex-1 overflow-auto overscroll-x-contain">
                <div className="flex min-h-full w-max min-w-full">
                    <div ref={side} className="sticky start-0 z-5 w-28 shrink-0 overflow-clip border-e border-border bg-card sm:w-44">
                        <div className="sticky top-0 z-1 flex h-8 items-center border-b border-border bg-card px-3 font-mono text-xs text-foreground tabular-nums">
                            {formatTimecode(playhead, fps)}
                        </div>
                        {tracks.map((track) => (
                            <TrackHeader key={track.id} track={track} words={words} onTrackChange={onTrackChange} />
                        ))}
                    </div>
                    <div ref={content} className="relative shrink-0" style={{ width: `${String(width)}px` }}>
                        <div
                            ref={ruler}
                            data-ruler
                            onPointerDown={scrub}
                            className="sticky top-0 z-4 h-8 cursor-col-resize touch-none overflow-hidden border-b border-border bg-card select-none"
                        >
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-primary"
                                style={{ left: `${String(head)}px` }}
                            />
                            {minors.map((at) => (
                                <span
                                    key={at}
                                    aria-hidden
                                    className="absolute bottom-0 h-1.5 w-px bg-border"
                                    style={{ left: `${String(at * pps)}px` }}
                                />
                            ))}
                            {ticks.map((at) => (
                                <span
                                    key={at}
                                    aria-hidden
                                    className="absolute inset-y-0 border-s border-border-strong ps-1 pt-1 font-mono text-2xs whitespace-nowrap text-muted-foreground tabular-nums"
                                    style={{ left: `${String(at * pps)}px` }}
                                >
                                    {formatTimecode(at, fps)}
                                </span>
                            ))}
                            <span
                                role="slider"
                                tabIndex={0}
                                aria-label={words.playhead}
                                aria-valuemin={0}
                                aria-valuemax={total}
                                aria-valuenow={playhead}
                                aria-valuetext={formatTimecode(playhead, fps)}
                                data-playhead
                                className="absolute bottom-0 z-3 h-4 w-3 -translate-x-1/2 cursor-ew-resize rounded-b-mini bg-primary focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                                style={{ left: `${String(head)}px` }}
                            />
                        </div>
                        {tracks.map((track, index) => {
                            const lane = (ref?: (element: HTMLElement | null) => void) => (
                                <div
                                    key={track.id}
                                    ref={ref}
                                    data-track-lane={track.id}
                                    onClick={(event: ReactMouseEvent) => {
                                        if (event.target === event.currentTarget && selected.length > 0) onSelectedChange?.([])
                                    }}
                                    className={cn(
                                        'relative h-14',
                                        index < tracks.length - 1 && 'border-b border-border',
                                        track.locked === true && 'bg-muted/50',
                                    )}
                                >
                                    {clips
                                        .filter((clip) => clip.track === track.id)
                                        .map((clip) => (
                                            <ClipBlock
                                                key={clip.id}
                                                clip={clip}
                                                track={track}
                                                pps={pps}
                                                fps={fps}
                                                words={words}
                                                chosen={selected.includes(clip.id)}
                                                faded={proposal?.id === clip.id}
                                                layer={changing && track.locked !== true ? layer : undefined}
                                                store={carried}
                                                onChoose={choose}
                                            />
                                        ))}
                                    {proposal !== null && proposal.track === track.id && (
                                        <span
                                            aria-hidden
                                            data-landing
                                            className={cn(
                                                'pointer-events-none absolute inset-y-1 z-2 rounded-control border-2 border-dashed',
                                                proposal.fits ? 'border-primary' : 'border-destructive',
                                            )}
                                            style={{
                                                left: `${String(proposal.start * pps)}px`,
                                                width: `${String(proposal.duration * pps)}px`,
                                            }}
                                        />
                                    )}
                                    {landing !== null && landing.track === track.id && (
                                        <span
                                            aria-hidden
                                            data-landing
                                            className={cn(
                                                'pointer-events-none absolute inset-y-1 z-2 rounded-control border-2 border-dashed',
                                                landing.duration === undefined && '-translate-x-1/2',
                                                landing.fits ? 'border-primary bg-primary/10' : 'border-destructive',
                                            )}
                                            style={{
                                                left: `${String(landing.start * pps)}px`,
                                                width: landing.duration === undefined ? undefined : `${String(landing.duration * pps)}px`,
                                            }}
                                        />
                                    )}
                                </div>
                            )
                            if (layer === undefined || onDrop === undefined) return lane()
                            return (
                                <layer.ClipLane
                                    key={track.id}
                                    scope={scope}
                                    track={track.id}
                                    label={track.name}
                                    accepts={(drag) => trackTakes(track, drag)}
                                >
                                    {lane}
                                </layer.ClipLane>
                            )
                        })}
                        {(proposal?.snapped ?? landing?.snapped) !== undefined && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute top-8 bottom-0 z-2 w-px bg-ring"
                                style={{ left: `${String((proposal?.snapped ?? landing?.snapped ?? 0) * pps)}px` }}
                            />
                        )}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute top-0 bottom-0 z-3 w-px -translate-x-1/2 bg-primary"
                            style={{ left: `${String(head)}px` }}
                        />
                    </div>
                </div>
            </div>
            <span aria-live="polite" className="sr-only">
                {said}
            </span>
        </div>
    )

    if (layer === undefined) return body
    return (
        <layer.ClipDragArea
            onMove={(carry) => setProposal(propose(carry))}
            onArrive={(from) => setLanding(from === null || onDrop === undefined ? null : landingFor(from))}
            onLand={(from) => {
                const to = onDrop === undefined ? null : landingFor(from)
                if (to === null) return
                if (!to.fits) {
                    setSaid(words.blocked(from.data.label))
                    return
                }
                onDrop?.({ data: from.data, track: to.track, at: to.start })
                setSaid(words.dropped(from.data.label, trackOf(to.track)?.name ?? to.track, formatTimecode(to.start, fps)))
            }}
            onEnd={(carry) => {
                const to = propose(carry)
                settle()
                const clip = clipOf(carry.id)
                if (to === null || clip === undefined || onClipsChange === undefined) return
                if (!to.fits) {
                    setSaid(words.blocked(clip.label))
                    return
                }
                const change = changeOf(to)
                if (change === undefined) return
                onClipsChange([change])
                sayChange(clip, change)
            }}
            onCancel={settle}
        >
            {body}
        </layer.ClipDragArea>
    )
}

interface TrackHeaderProps {
    track: TimelineTrack
    words: ClipTimelineWords
    onTrackChange?: ClipTimelineProps['onTrackChange']
}

/** A track's header: its kind and name, and its toggles. */
function TrackHeader({ track, words, onTrackChange }: TrackHeaderProps) {
    const Icon = KIND_ICON[track.kind]
    return (
        <div data-track-header={track.id} className="flex h-14 flex-col justify-center gap-0.5 border-b border-border px-3 last:border-b-0">
            <span className="flex min-w-0 items-center gap-1.5">
                <Icon aria-label={words.kinds[track.kind]} className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-medium">{track.name}</span>
            </span>
            {onTrackChange !== undefined && (
                <span className="-ms-1.5 flex items-center">
                    {track.kind === 'audio' ? (
                        <IconButton
                            size="icon-xs"
                            label={words.mute}
                            pressed={track.muted === true}
                            onClick={() => onTrackChange(track.id, { muted: track.muted !== true })}
                        >
                            {track.muted === true ? <VolumeX /> : <Volume2 />}
                        </IconButton>
                    ) : (
                        <IconButton
                            size="icon-xs"
                            label={words.hide}
                            pressed={track.hidden === true}
                            onClick={() => onTrackChange(track.id, { hidden: track.hidden !== true })}
                        >
                            {track.hidden === true ? <EyeOff /> : <Eye />}
                        </IconButton>
                    )}
                    <IconButton
                        size="icon-xs"
                        label={words.lock}
                        pressed={track.locked === true}
                        onClick={() => onTrackChange(track.id, { locked: track.locked !== true })}
                    >
                        {track.locked === true ? <Lock /> : <LockOpen />}
                    </IconButton>
                </span>
            )}
        </div>
    )
}

interface ClipBlockProps {
    clip: TimelineClip
    track: TimelineTrack
    pps: number
    fps: number
    words: ClipTimelineWords
    chosen: boolean
    /** Drawn faint while a drag carries it elsewhere. */
    faded: boolean
    /** The drag layer, for a clip that moves and trims. */
    layer: DragLayer | undefined
    store: ProposalStore
    onChoose: (id: string, adding: boolean) => void
}

/** A clip as a block in its color, its ends grips to trim it by. */
function ClipBlock({ clip, track, pps, fps, words, chosen, faded, layer, store, onChoose }: ClipBlockProps) {
    const color = clip.color ?? DEFAULT_COLOR[track.kind]
    const label = words.clip(clip.label, formatTimecode(clip.start, fps), formatTimecode(end(clip), fps))
    const preview = (grip: ClipGrip) => () => <CarryCard store={store} words={words} fps={fps} clip={clip} grip={grip} />
    const draw = (ref?: (element: HTMLElement | null) => void, press?: object) => (
        <span
            ref={ref}
            {...press}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={chosen}
            data-clip={clip.id}
            onClick={(event) => onChoose(clip.id, event.shiftKey || event.metaKey || event.ctrlKey)}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onChoose(clip.id, event.shiftKey || event.metaKey || event.ctrlKey)
            }}
            className={cn(
                'absolute inset-y-1 z-1 touch-none overflow-hidden rounded-control border select-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid',
                CLIP_LOOK[color],
                track.kind === 'title' && 'border-dashed',
                layer !== undefined ? 'cursor-grab' : 'cursor-default',
                chosen && 'z-2 ring-2 ring-primary',
                (faded || track.hidden === true || track.muted === true) && 'opacity-50',
            )}
            style={{ left: `${String(clip.start * pps)}px`, width: `${String(Math.max(clip.duration * pps, 2))}px` }}
        >
            {track.kind === 'audio' && clip.waveform !== undefined && clip.waveform.length > 1 && <ClipWave clip={clip} />}
            <span className="relative flex items-center gap-1 truncate px-2 pt-1 text-xs leading-4 font-medium">
                {track.kind === 'title' && <Type aria-hidden className="size-3 shrink-0" />}
                <span className="truncate">{clip.label}</span>
            </span>
            {layer !== undefined && (
                <>
                    <Grip layer={layer} clip={clip} grip="start" label={label} preview={preview('start')} />
                    <Grip layer={layer} clip={clip} grip="end" label={label} preview={preview('end')} />
                </>
            )}
        </span>
    )
    if (layer === undefined) return draw()
    return (
        <layer.ClipDrag id={clip.id} grip="move" label={clip.label} preview={preview('move')}>
            {({ ref, press }) => draw(ref, press)}
        </layer.ClipDrag>
    )
}

interface GripProps {
    layer: DragLayer
    clip: TimelineClip
    grip: 'start' | 'end'
    label: string
    preview: () => ReactNode
}

/** One end of a clip, dragged to trim it. */
function Grip({ layer, clip, grip, label, preview }: GripProps) {
    return (
        <layer.ClipDrag id={clip.id} grip={grip} label={label} preview={preview}>
            {({ ref, press }) => (
                <span
                    ref={ref}
                    {...press}
                    aria-hidden
                    data-trim={grip}
                    className={cn(
                        'absolute inset-y-0 z-1 w-2 cursor-ew-resize touch-none hover:bg-current/25',
                        grip === 'start' ? 'start-0' : 'end-0',
                    )}
                />
            )}
        </layer.ClipDrag>
    )
}

/** An audio clip's loudness for the part of its source it plays, mirrored about the middle. */
function ClipWave({ clip }: { clip: TimelineClip }) {
    const peaks = clip.waveform ?? []
    const inPoint = clip.inPoint ?? 0
    const source = clip.sourceDuration ?? inPoint + clip.duration
    const from = Math.floor((inPoint / source) * peaks.length)
    const to = Math.max(Math.ceil(((inPoint + clip.duration) / source) * peaks.length), from + 2)
    const shown = peaks.slice(from, Math.min(to, peaks.length))
    if (shown.length < 2) return null
    const last = shown.length - 1
    const half = (peak: number) => Math.min(Math.max(peak, 0), 1) * 0.5
    const top = shown.map((peak, index) => `${String(index)},${String(0.5 - half(peak))}`)
    const bottom = shown.map((peak, index) => `${String(index)},${String(0.5 + half(peak))}`).reverse()
    return (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-5 bottom-1">
            <svg viewBox={`0 0 ${String(last)} 1`} preserveAspectRatio="none" className="size-full fill-current opacity-60">
                <polygon points={[...top, ...bottom].join(' ')} />
            </svg>
        </span>
    )
}

/** The new start or length, on the card at the pointer. */
function CarryCard({
    store,
    words,
    fps,
    clip,
    grip,
}: {
    store: ProposalStore
    words: ClipTimelineWords
    fps: number
    clip: TimelineClip
    grip: ClipGrip
}) {
    const carried = useSyncExternalStore(store.subscribe, store.get, store.get)
    // Until the pointer has moved, the clip as it is.
    const shown = carried?.id === clip.id ? carried : clip
    return (
        <span className="block px-2 py-1 font-mono text-xs whitespace-nowrap">
            {grip === 'move' ? words.start(formatTimecode(shown.start, fps)) : words.length(formatTimecode(shown.duration, fps))}
        </span>
    )
}
