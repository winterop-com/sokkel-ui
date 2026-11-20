/**
 * What the watch keeps on the simulated backend: its tasks, its zones, the affiliations people on
 * watch set, and the log of what they did. The contacts themselves come from the feed.
 */
import type { TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import { arc } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import type { MapTone } from '@winterop-com/sokkel-ui-maps/tone'
import type { ZoneEdge, ZoneFill } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import type { TrackAffiliation, TrackKind } from '@winterop-com/sokkel-ui-tracking/track'
import { collection } from 'tidevann-shared/backend'

import { EPOCH, MINUTE } from './sim/world'

export type Person = 'ada' | 'grace' | 'linus' | 'margaret'

export const PEOPLE: readonly Person[] = ['ada', 'grace', 'linus', 'margaret']

/** Who is on watch in this browser. */
export const ME: Person = 'ada'

/** What a task asks: look closer, keep with it, or say what it is doing. */
export type TaskKind = 'investigate' | 'follow' | 'report'

export const TASK_KINDS: readonly { value: TaskKind; label: string; description: string }[] = [
    { value: 'investigate', label: 'Investigate', description: 'Close in and make out what it is.' },
    { value: 'follow', label: 'Follow', description: 'Keep with it and keep it in sight.' },
    { value: 'report', label: 'Report', description: 'Say what it does, at each change.' },
]

export const KIND_LABEL: Record<TaskKind, string> = { investigate: 'Investigate', follow: 'Follow', report: 'Report' }

export type Priority = 'low' | 'normal' | 'high'

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', normal: 'Normal', high: 'High' }

/** One end of a task, kept with its name so the task reads the same once the track is gone. */
export interface TaskEndRow {
    track: string
    name: string
    kind: TrackKind
}

export interface Task {
    id: string
    code: string
    kind: TaskKind
    state: TaskState
    /** The unit that does it. */
    from: TaskEndRow
    /** What it is done to. */
    to: TaskEndRow
    priority: Priority
    by: Person
    note: string
    /** Simulated moments, in milliseconds since the epoch. */
    createdAt: number
    startedAt: number | null
    endedAt: number | null
}

const end = (track: string, name: string, kind: TrackKind): TaskEndRow => ({ track, name, kind })

const PATROL = end('257100070', 'PATROL 7', 'vessel')
const PILOT = end('257100020', 'PILOT 2', 'vessel')
const TUG = end('257100031', 'TUG ADA', 'vessel')
const SURVEY = end('47a1c3', 'TDV01', 'aircraft')
const RADAR = end('radar-harbor', 'Harbor radar', 'sensor')
const FERRY = end('257200410', 'FERRY JUNIPER', 'vessel')
const CARGO = end('257300512', 'CARGO LARKSPUR', 'vessel')
const FLIGHT = end('4b8e12', 'FLT312', 'aircraft')

const SEED_TASKS: Task[] = [
    {
        id: 'task-41',
        code: 'TSK-41',
        kind: 'follow',
        state: 'executing',
        from: PATROL,
        to: CARGO,
        priority: 'high',
        by: 'ada',
        note: 'Bound for larkspur late; keep with it to the fairway.',
        createdAt: EPOCH - 30 * MINUTE,
        startedAt: EPOCH - 18 * MINUTE,
        endedAt: null,
    },
    {
        id: 'task-42',
        code: 'TSK-42',
        kind: 'investigate',
        state: 'pending',
        from: SURVEY,
        to: FLIGHT,
        priority: 'normal',
        by: 'grace',
        note: 'Squawk changed twice over juniper.',
        createdAt: EPOCH - 6 * MINUTE,
        startedAt: null,
        endedAt: null,
    },
    {
        id: 'task-39',
        code: 'TSK-39',
        kind: 'report',
        state: 'paused',
        from: RADAR,
        to: FERRY,
        priority: 'normal',
        by: 'linus',
        note: 'Report each stop between juniper and harbor.',
        createdAt: EPOCH - 50 * MINUTE,
        startedAt: EPOCH - 42 * MINUTE,
        endedAt: null,
    },
    {
        id: 'task-36',
        code: 'TSK-36',
        kind: 'investigate',
        state: 'done',
        from: PILOT,
        to: FERRY,
        priority: 'low',
        by: 'margaret',
        note: '',
        createdAt: EPOCH - 100 * MINUTE,
        startedAt: EPOCH - 95 * MINUTE,
        endedAt: EPOCH - 61 * MINUTE,
    },
    {
        id: 'task-35',
        code: 'TSK-35',
        kind: 'follow',
        state: 'failed',
        from: TUG,
        to: CARGO,
        priority: 'normal',
        by: 'ada',
        note: 'Too slow to keep up.',
        createdAt: EPOCH - 140 * MINUTE,
        startedAt: EPOCH - 130 * MINUTE,
        endedAt: EPOCH - 118 * MINUTE,
    },
]

export const tasks = collection<Task>('tasks', () => SEED_TASKS)

/** The next free task code after those there are. */
export function nextCode(rows: readonly Task[]): string {
    const top = rows.reduce((most, row) => Math.max(most, Number(row.code.replace(/\D/g, '')) || 0), 0)
    return `TSK-${String(top + 1)}`
}

/** Whether a task still runs or waits: not done and not failed. */
export const isOpen = (task: Task): boolean => task.state === 'pending' || task.state === 'executing' || task.state === 'paused'

/** One of the watch's areas, as the map draws it, and whether it is shown. */
export interface ZoneRow {
    id: string
    label: string
    tone: MapTone
    fill: ZoneFill
    edge: ZoneEdge
    area: LngLat[]
    visible: boolean
    note: string
}

const SEED_ZONES: ZoneRow[] = [
    {
        id: 'anchorage',
        label: 'Anchorage',
        tone: 'neutral',
        fill: 'solid',
        edge: 'solid',
        visible: true,
        note: 'Where ships wait for a berth at harbor.',
        area: [
            [4.72, 60.3],
            [4.9, 60.29],
            [4.95, 60.42],
            [4.82, 60.48],
            [4.7, 60.4],
        ],
    },
    {
        id: 'closed-area',
        label: 'Closed area',
        tone: 'hostile',
        fill: 'hatched',
        edge: 'dashed',
        visible: true,
        note: 'No entry without leave from the watch.',
        area: [
            [3.7, 60.95],
            [4.35, 61.05],
            [4.7, 60.7],
            [4.45, 60.1],
            [3.95, 60.15],
        ],
    },
    {
        id: 'patrol-box',
        label: 'Patrol box',
        tone: 'friend',
        fill: 'none',
        edge: 'dashed',
        visible: true,
        note: "Patrol 7's waters.",
        area: [
            [4.75, 61.25],
            [5.6, 61.25],
            [5.6, 62.35],
            [4.75, 62.35],
        ],
    },
    {
        id: 'survey-area',
        label: 'Survey area',
        tone: 'unknown',
        fill: 'hatched',
        edge: 'solid',
        visible: true,
        note: 'Survey 1 flies its lines here.',
        area: [
            [3.1, 61.3],
            [3.9, 61.3],
            [3.9, 62.0],
            [3.1, 62.0],
        ],
    },
    {
        id: 'boarding',
        label: 'Pilot boarding',
        tone: 'plain',
        fill: 'solid',
        edge: 'solid',
        visible: false,
        note: 'Where the pilots board inbound ships.',
        area: arc([4.72, 60.1], 8_000, 0, 360, 48),
    },
]

export const zones = collection<ZoneRow>('zones', () => SEED_ZONES)

/** Something a person on watch did: set an affiliation, or moved a task along. */
export interface Entry {
    id: string
    /** The simulated moment it was done. */
    at: number
    kind: 'affiliation' | 'task' | 'zone'
    /** The track it was about, when one. */
    track?: string
    trackKind?: TrackKind
    name: string
    affiliation?: TrackAffiliation
    was?: TrackAffiliation
    /** What was done, as the log says it. */
    detail: string
    by: Person
}

export const entries = collection<Entry>('entries', () => [])

/** An affiliation a person on watch set on a track, from a moment on. */
export interface JudgmentRow {
    id: string
    track: string
    affiliation: TrackAffiliation
    at: number
    by: Person
}

export const judgments = collection<JudgmentRow>('judgments', () => [])
