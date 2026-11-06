/** Tidevann's runs: fixed, neutral rows drawn from a seeded generator, the same on every load. */

import type { LogLine } from '@winterop-com/sokkel-ui/LogView'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
export const STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const
export const PEOPLE = ['ada', 'grace', 'linus', 'margaret', 'schedule'] as const

export interface Run {
    id: string
    job: (typeof JOBS)[number]
    project: (typeof PROJECTS)[number]
    state: Status
    step: (typeof STEPS)[number]
    by: (typeof PEOPLE)[number]
    /** Seconds before the newest run started. */
    ago: number
    /** Seconds the run took, or has taken so far. */
    duration: number
    records: number
}

function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

const STATES: [Status, number][] = [
    ['succeeded', 0.72],
    ['failed', 0.09],
    ['running', 0.05],
    ['queued', 0.05],
    ['cancelled', 0.05],
    ['skipped', 0.04],
]

const pick = <V>(values: readonly V[], at: number) => values[Math.floor(at * values.length) % values.length]

function state(at: number): Status {
    let sum = 0
    for (const [value, weight] of STATES) {
        sum += weight
        if (at < sum) return value
    }
    return 'succeeded'
}

function makeRuns(count: number): Run[] {
    const random = seeded(20261105)
    return Array.from({ length: count }, (_, index) => {
        const status = state(random())
        return {
            id: `run_${(0x8f3a00 + index).toString(16)}`,
            job: pick(JOBS, random()),
            project: pick(PROJECTS, random()),
            state: status,
            step: status === 'succeeded' ? 'notify' : pick(STEPS, random()),
            by: pick(PEOPLE, random()),
            ago: index * 53 + Math.floor(random() * 50),
            duration: Math.round(2 + random() ** 3 * 3600),
            records: Math.round(random() ** 2 * 250_000),
        }
    })
}

export const RUNS: Run[] = makeRuns(240)

const pad = (value: number) => String(value).padStart(2, '0')

/** When a run started, from a fixed newest time: `Nov 5, 14:02`. */
export function startedAt(ago: number): string {
    const at = new Date(Date.UTC(2026, 10, 5, 14, 2) - ago * 1000)
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][at.getUTCMonth()]
    return `${month} ${String(at.getUTCDate())}, ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`
}

/** A duration as a reader says it: `48s`, `4m 12s`, `1h 03m`. */
export function took(seconds: number): string {
    if (seconds < 60) return `${String(seconds)}s`
    if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m ${pad(seconds % 60)}s`
    return `${String(Math.floor(seconds / 3600))}h ${pad(Math.floor((seconds % 3600) / 60))}m`
}

/** The log a run wrote, up to the step it reached. */
export function runLog(run: Run): LogLine[] {
    const lines: LogLine[] = [
        { at: '14:02:04.112', level: 'info', source: 'fetch', text: `GET https://api.example.org/${run.project}/${run.job}` },
        { at: '14:02:05.020', level: 'info', source: 'fetch', text: `read ${run.records.toLocaleString('en-US')} rows` },
    ]
    if (run.state === 'failed') {
        lines.push({ at: '14:02:08.244', level: 'error', source: run.step, text: 'amount must be a number (37 rows), first at row 112' })
        lines.push({ at: '14:02:08.245', level: 'info', source: 'run', text: `failed after ${took(run.duration)}` })
    } else if (run.state === 'succeeded') {
        lines.push({ at: '14:02:09.801', level: 'info', source: 'notify', text: 'sent the summary to ada' })
        lines.push({ at: '14:02:09.802', level: 'info', source: 'run', text: `succeeded in ${took(run.duration)}` })
    }
    return lines
}
