/** What Tidevann's jobs console holds: jobs, their runs, the saved views of the runs and a person's preferences. */

import type { DashboardLayoutItem } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import type { ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import type { Row } from 'tidevann-shared/backend'

export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export type Project = (typeof PROJECTS)[number]

/** The run states a run can stand at, in the order the console lists them. */
export const STATES: Status[] = ['succeeded', 'failed', 'running', 'queued', 'cancelled', 'skipped']

/** How often a schedule fires; every time is on the UTC clock. */
export type Cadence = '15m' | 'hourly' | 'daily' | 'weekdays' | 'weekly'

export interface Schedule {
    cadence: Cadence
    /** The time it fires at, `HH:mm` UTC: its minute alone for `15m` and `hourly`. */
    at: string
    /** The first day it may fire, `YYYY-MM-DD`; a weekly schedule fires on this day's weekday. */
    starts: string
}

/** One step of a job: its code, what it runs on, and the steps it waits for. */
export interface JobStep {
    code: string
    kind: string
    needs: string[]
}

export interface Job extends Row {
    name: string
    description: string
    project: Project
    owner: Person
    steps: JobStep[]
    /** When it runs by itself; null for a job only started by hand. */
    schedule: Schedule | null
    paused: boolean
    retries: number
    /** Minutes a run may take before it is stopped; null for no limit. */
    timeout: number | null
    /** Seconds a step of a scheduled run takes, about. */
    pace: number
    /** The share of runs that fail. */
    risk: number
}

/** One step of a run as it was planned: how long it takes. */
export interface RunStepPlan extends JobStep {
    ms: number
}

export interface Run extends Row {
    job: string
    project: Project
    by: Person | 'schedule'
    trigger: 'schedule' | 'manual' | 'retry'
    /** The run this one retries. */
    retryOf: string | null
    /** When it was asked for, in milliseconds since the epoch. */
    created: number
    /** How long it waits for a worker before its first step. */
    wait: number
    steps: RunStepPlan[]
    /** The step that fails, and what it says. */
    failAt: string | null
    error: string | null
    /** Why the scheduler never started it, such as the run before still going. */
    skipped: string | null
    cancelledAt: number | null
    cancelledBy: Person | null
    records: number
    inputs: Record<string, string | number | boolean>
    /** The state it last stood at, kept as it changes so a listing filters without a clock. */
    state: Status
    ended: number | null
}

/** A saved view of the runs listing, kept for the person. */
export interface RunView extends Row {
    name: string
    state: ListViewState
    locked?: boolean
}

export interface Prefs extends Row {
    /** Who is signed in; null after signing out. */
    user: Person | null
    openRuns: 'panel' | 'page'
    times: 'relative' | 'clock'
    confirmCancel: boolean
    notifyFailures: boolean
    notifyMine: boolean
    followLog: boolean
    wrapLog: boolean
    /** Whether the scheduler starts runs on their schedules. */
    scheduler: boolean
    /** The overview's panels as the person arranged them, in order with their widths; none for the default. */
    overview?: DashboardLayoutItem[]
}

export const DEFAULT_PREFS: Prefs = {
    id: 'me',
    user: 'ada',
    openRuns: 'panel',
    times: 'relative',
    confirmCancel: true,
    notifyFailures: true,
    notifyMine: true,
    followLog: true,
    wrapLog: true,
    scheduler: true,
}

const pad = (value: number) => String(value).padStart(2, '0')

/** A duration as a reader says it: `840ms`, `4.2s`, `48s`, `4m 12s`, `1h 03m`. */
export function took(ms: number): string {
    if (ms < 1000) return `${String(Math.max(0, Math.round(ms)))}ms`
    const seconds = Math.round(ms / 1000)
    if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`
    if (seconds < 60) return `${String(seconds)}s`
    if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m ${pad(seconds % 60)}s`
    return `${String(Math.floor(seconds / 3600))}h ${pad(Math.floor((seconds % 3600) / 60))}m`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The time of day on the UTC clock: `14:02`, or `14:02:07` with seconds. */
export function clock(at: number, seconds = false): string {
    const date = new Date(at)
    const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
    return seconds ? `${time}:${pad(date.getUTCSeconds())}` : time
}

/** A moment as a reader says it, on the UTC clock: `Nov 8, 14:02`. */
export function stamp(at: number): string {
    const date = new Date(at)
    return `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate())}, ${clock(at)}`
}

/** The UTC day of a moment, `YYYY-MM-DD`. */
export function dayOf(at: number): string {
    const date = new Date(at)
    return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** A day as a heading says it, from today's: Today, Tomorrow, or `Wednesday, Nov 12`. */
export function sayDay(day: string, today: string): string {
    if (day === today) return 'Today'
    const date = new Date(`${day}T00:00:00Z`)
    if (dayOf(new Date(`${today}T00:00:00Z`).getTime() + 86_400_000) === day) return 'Tomorrow'
    return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate())}`
}

export function weekdayOf(day: string): string {
    return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? ''
}

/** A count with its noun: `1 run`, `12 runs`. */
export function counted(count: number, one: string, many = `${one}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`
}

/** Who started a run, as a listing says it. */
export function sayBy(run: Pick<Run, 'by' | 'trigger'>): string {
    if (run.by === 'schedule') return 'schedule'
    return run.trigger === 'retry' ? `${run.by}, retry` : run.by
}
