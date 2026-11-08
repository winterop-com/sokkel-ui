import { CalendarDays, CircleDot, Globe, Hash, Timer, User, Workflow } from 'lucide-react'

import type { FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import type { FilterOption } from '@winterop-com/sokkel-ui/FilterChip'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { JOB_OPTIONS, PEOPLE_OPTIONS, STATUS_OPTIONS } from './filters'
import { seeded } from './runRows'

/**
 * A week of Tidevann's runs, Monday 2 to Sunday 8 November 2026, for the filtered listings: each
 * with its job, state, who started it, the day and time, how long it took and the region it ran in.
 * Seeded, so every story draws the same rows.
 */

export interface WeekRun {
    id: string
    job: string
    state: Status
    by: string
    /** The day it started, `YYYY-MM-DD`. */
    day: string
    /** When it started, as the listing says it: `Nov 5, 14:02`. */
    started: string
    /** Seconds it took. */
    seconds: number
    /** How long it took, as a reader says it: `48s`, `4m 12s`. */
    duration: string
    region: string
}

/** The day the stories are drawn on, the week's last. */
export const TODAY = '2026-11-08'
export const WEEK_START = '2026-11-02'

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const PEOPLE = ['schedule', 'schedule', 'ada', 'grace', 'linus', 'margaret']
const STATES: [Status, number][] = [
    ['succeeded', 0.68],
    ['failed', 0.14],
    ['cancelled', 0.06],
    ['skipped', 0.05],
    ['running', 0.04],
    ['queued', 0.03],
]

/** Countries a run can be in, a list long enough to search. */
export const REGIONS = [
    'Austria',
    'Bhutan',
    'Bolivia',
    'Cambodia',
    'Chile',
    'Ecuador',
    'Estonia',
    'Fiji',
    'Ghana',
    'Iceland',
    'Ireland',
    'Kenya',
    'Kiribati',
    'Laos',
    'Malawi',
    'Mongolia',
    'Nepal',
    'Norway',
    'Palau',
    'Paraguay',
    'Peru',
    'Portugal',
    'Rwanda',
    'Samoa',
    'Senegal',
    'Tonga',
    'Uruguay',
    'Vanuatu',
    'Vietnam',
    'Zambia',
]

const pad = (value: number) => String(value).padStart(2, '0')

function took(seconds: number): string {
    if (seconds < 60) return `${String(seconds)}s`
    return `${String(Math.floor(seconds / 60))}m ${pad(seconds % 60)}s`
}

function stateOf(at: number): Status {
    let sum = 0
    for (const [state, weight] of STATES) {
        sum += weight
        if (at < sum) return state
    }
    return 'succeeded'
}

/** The week's runs, newest first. */
export const WEEK_RUNS: WeekRun[] = (() => {
    const random = seeded(20261108)
    const runs: WeekRun[] = []
    for (let day = 8; day >= 2; day -= 1) {
        for (let index = 0; index < 18; index += 1) {
            const minutes = 23 * 60 + 50 - index * 79 - Math.floor(random() * 40)
            const state = stateOf(random())
            const seconds = Math.round(2 + random() ** 3 * 900)
            runs.push({
                id: `run_${(0x8f3a00 + runs.length).toString(16)}`,
                job: JOBS[Math.floor(random() * JOBS.length)],
                state: day < 8 && (state === 'running' || state === 'queued') ? 'succeeded' : state,
                by: PEOPLE[Math.floor(random() * PEOPLE.length)],
                day: `2026-11-${pad(day)}`,
                started: `Nov ${String(day)}, ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
                seconds,
                duration: took(seconds),
                region: REGIONS[Math.floor(random() * REGIONS.length)],
            })
        }
    }
    return runs
})()

const icon = 'size-3.5 text-muted-foreground'

/** Who can start a run: the schedule, then people with their avatars. */
export const STARTER_OPTIONS: FilterOption[] = [{ value: 'schedule' }, ...PEOPLE_OPTIONS]

export const REGION_OPTIONS: FilterOption[] = REGIONS.map((region) => ({ value: region }))

/** The fields the runs filter on, each reading its value from a run. */
export const RUN_FIELDS: FilterField<WeekRun>[] = [
    {
        id: 'job',
        label: 'Job',
        type: 'set',
        options: JOB_OPTIONS,
        icon: <Workflow className={icon} aria-hidden />,
        value: (run) => run.job,
    },
    {
        id: 'state',
        label: 'State',
        type: 'set',
        options: STATUS_OPTIONS,
        icon: <CircleDot className={icon} aria-hidden />,
        value: (run) => run.state,
    },
    {
        id: 'by',
        label: 'Started by',
        type: 'set',
        options: STARTER_OPTIONS,
        icon: <User className={icon} aria-hidden />,
        value: (run) => run.by,
    },
    {
        id: 'started',
        label: 'Started',
        type: 'date',
        icon: <CalendarDays className={icon} aria-hidden />,
        value: (run) => run.day,
    },
    {
        id: 'duration',
        label: 'Duration',
        type: 'number',
        unit: 's',
        operators: ['atLeast', 'atMost', 'between'],
        icon: <Timer className={icon} aria-hidden />,
        value: (run) => run.seconds,
    },
    {
        id: 'region',
        label: 'Region',
        type: 'set',
        options: REGION_OPTIONS,
        icon: <Globe className={icon} aria-hidden />,
        value: (run) => run.region,
    },
    {
        id: 'run',
        label: 'Run',
        type: 'text',
        icon: <Hash className={icon} aria-hidden />,
        value: (run) => run.id,
    },
]
