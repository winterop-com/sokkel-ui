import type { TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import type { TrackAffiliation, TrackKind, TrackRosterItem, TrackState } from '@winterop-com/sokkel-ui/TrackRoster'
import { HARBOR_DUSK, LIGHTHOUSE } from './photos'

/** The moment Tidevann's harbor watch is drawn at, so every freshness and elapsed time is the same each time. */
export const WATCH_NOW = Date.parse('2026-11-20T14:30:00Z')

/** One track of the watch as a list shows it, with how long ago it was last heard from. */
interface WatchTrack {
    id: string
    name: string
    kind: TrackKind
    affiliation: TrackAffiliation
    heading?: number
    /** Knots. */
    speed?: number
    /** Milliseconds before the watch's now it was last heard from. */
    lag: number
    states?: readonly TrackState[]
    thumbnail?: string
}

/** A track a task is on. */
const TASKED: TrackState = { label: 'Tasked', tone: 'info' }

/** The harbor watch's tracks: harbor, juniper and larkspur's own, the traffic between them, and what is not known yet. */
export const WATCH_TRACKS: readonly WatchTrack[] = [
    { id: 'pilot-2', name: 'Pilot 2', kind: 'vessel', affiliation: 'friend', heading: 250, speed: 14, lag: 1_000 },
    { id: 'patrol-7', name: 'Patrol 7', kind: 'vessel', affiliation: 'friend', heading: 20, speed: 22, lag: 2_000, states: [TASKED] },
    { id: 'tug-ada', name: 'Tug Ada', kind: 'vessel', affiliation: 'friend', heading: 300, speed: 8, lag: 12_000 },
    {
        id: 'survey-1',
        name: 'Survey 1',
        kind: 'aircraft',
        affiliation: 'friend',
        heading: 0,
        speed: 180,
        lag: 3_000,
        states: ['Simulated'],
    },
    { id: 'shore-3', name: 'Shore unit 3', kind: 'vehicle', affiliation: 'friend', heading: 80, speed: 30, lag: 45_000 },
    { id: 'radar-harbor', name: 'Harbor radar', kind: 'sensor', affiliation: 'friend', lag: 500, thumbnail: LIGHTHOUSE },
    { id: 'contact-14', name: 'Contact 14', kind: 'vessel', affiliation: 'hostile', heading: 110, speed: 16, lag: 4_000, states: [TASKED] },
    {
        id: 'ferry-juniper',
        name: 'Ferry Juniper',
        kind: 'vessel',
        affiliation: 'neutral',
        heading: 200,
        speed: 20,
        lag: 30_000,
        thumbnail: HARBOR_DUSK,
    },
    { id: 'cargo-larkspur', name: 'Cargo Larkspur', kind: 'vessel', affiliation: 'neutral', heading: 290, speed: 12, lag: 180_000 },
    { id: 'flight-312', name: 'Flight 312', kind: 'aircraft', affiliation: 'neutral', heading: 15, speed: 420, lag: 2_000 },
    { id: 'contact-9', name: 'Contact 9', kind: 'vessel', affiliation: 'unknown', heading: 140, speed: 10, lag: 540_000 },
    {
        id: 'track-21',
        name: 'Track 21',
        kind: 'aircraft',
        affiliation: 'unknown',
        heading: 60,
        speed: 260,
        lag: 20_000,
        states: ['Simulated'],
    },
    { id: 'new-33', name: 'New 33', kind: 'vessel', affiliation: 'pending', heading: 330, speed: 9, lag: 6_000 },
]

/** A track's speed and heading as one quiet line. */
export function motionOf(speed: number | undefined, heading: number | undefined): string | undefined {
    if (speed === undefined || speed === 0) return undefined
    const way = heading === undefined ? '' : ` · ${String(Math.round(heading)).padStart(3, '0')}°`
    return `${String(Math.round(speed))} kn${way}`
}

/** The watch's tracks as a roster lists them at `now`, each last heard its lag before it. */
export function watchRoster(now: number = WATCH_NOW, affiliations: Readonly<Record<string, TrackAffiliation>> = {}): TrackRosterItem[] {
    return WATCH_TRACKS.map((track) => ({
        id: track.id,
        name: track.name,
        kind: track.kind,
        affiliation: affiliations[track.id] ?? track.affiliation,
        heading: track.heading,
        thumbnail: track.thumbnail,
        states: track.states,
        detail: motionOf(track.speed, track.heading),
        updatedAt: now - track.lag,
    }))
}

/** One task of the watch: what it is, who does it and to what, and how long it has run. */
export interface WatchTask {
    id: string
    title: string
    state: TaskState
    from: string
    to: string
    /** Minutes before the watch's now it started. */
    started?: number
    /** Minutes it ran, for one that ended. */
    ran?: number
    priority: string
    by: string
}

export const WATCH_TASKS: readonly WatchTask[] = [
    { id: 'task-41', title: 'Follow', state: 'executing', from: 'patrol-7', to: 'contact-14', started: 18, priority: 'High', by: 'ada' },
    { id: 'task-42', title: 'Investigate', state: 'pending', from: 'survey-1', to: 'track-21', priority: 'Normal', by: 'grace' },
    { id: 'task-39', title: 'Report', state: 'paused', from: 'radar-harbor', to: 'new-33', started: 42, priority: 'Normal', by: 'linus' },
    {
        id: 'task-36',
        title: 'Investigate',
        state: 'done',
        from: 'pilot-2',
        to: 'contact-9',
        started: 95,
        ran: 34,
        priority: 'Low',
        by: 'margaret',
    },
    {
        id: 'task-35',
        title: 'Follow',
        state: 'failed',
        from: 'tug-ada',
        to: 'cargo-larkspur',
        started: 130,
        ran: 12,
        priority: 'Normal',
        by: 'ada',
    },
]

/** How busy the watch was over the six hours before its now: tracks heard from, in bins of ten minutes, the same every time. */
export const WATCH_ACTIVITY: readonly number[] = Array.from({ length: 36 }, (_, index) =>
    Math.round(14 + 9 * Math.sin(index / 3.2) + 6 * Math.sin(index / 1.3 + 1) + (index > 28 ? 8 : 0)),
)
