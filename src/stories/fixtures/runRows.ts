/**
 * Tidevann's runs as rows, one per run, for the charts drawn from data: a month of runs of five
 * jobs in three projects, on four workers in five regions. Seeded, so every story draws the same.
 */

/** A seeded generator, so every story draws the same numbers. */
export function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

export const RUN_JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
export const RUN_PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export const RUN_WORKERS = ['worker-1', 'worker-2', 'worker-3', 'worker-4'] as const
export const RUN_STATES = ['succeeded', 'failed', 'cancelled', 'skipped'] as const
export const RUN_REGIONS = ['Northern Europe', 'Western Europe', 'East Africa', 'South Asia', 'South America'] as const
export const RUN_STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const

/** The color token each run state is drawn in. */
export const STATE_COLORS: Record<string, string> = {
    succeeded: 'status-succeeded',
    failed: 'status-failed',
    cancelled: 'status-cancelled',
    skipped: 'status-skipped',
}

/** One run. */
export interface RunRow {
    [field: string]: unknown
    id: string
    job: (typeof RUN_JOBS)[number]
    project: (typeof RUN_PROJECTS)[number]
    worker: (typeof RUN_WORKERS)[number]
    region: (typeof RUN_REGIONS)[number]
    state: (typeof RUN_STATES)[number]
    /** Where a failed run stopped. */
    step: (typeof RUN_STEPS)[number] | null
    /** The day it ran, `2026-10-01` to `2026-10-30`. */
    day: string
    /** The weekday it ran, `Mon` to `Sun`. */
    weekday: string
    /** The hour it started, `00:00` to `23:00`. */
    hour: string
    /** How long it took, in seconds. */
    duration: number
    /** How many rows it moved. */
    rows: number
    /** How long it waited in the queue, in seconds. */
    wait: number
}

const pad = (value: number) => String(value).padStart(2, '0')
const WEEKDAYS = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']

const JOB_SHAPE: Record<string, { project: (typeof RUN_PROJECTS)[number]; seconds: number; rows: number; fails: number }> = {
    'nightly-export': { project: 'harbor', seconds: 260, rows: 2200, fails: 0.08 },
    'sync-inventory': { project: 'juniper', seconds: 95, rows: 900, fails: 0.05 },
    'rebuild-index': { project: 'larkspur', seconds: 410, rows: 5200, fails: 0.12 },
    'send-digest': { project: 'harbor', seconds: 35, rows: 120, fails: 0.03 },
    'import-orders': { project: 'juniper', seconds: 180, rows: 1600, fails: 0.1 },
}

/** The month's runs: each job runs a few times a day, more on weekdays, slower and failing more when busy. */
export const RUN_ROWS: RunRow[] = (() => {
    const random = seeded(7)
    const rows: RunRow[] = []
    let id = 1
    for (let day = 1; day <= 30; day++) {
        const weekday = WEEKDAYS[(day - 1) % 7]
        const weekend = weekday === 'Sat' || weekday === 'Sun'
        for (const job of RUN_JOBS) {
            const shape = JOB_SHAPE[job]
            const times = weekend ? 1 : 2 + Math.floor(random() * 2)
            for (let run = 0; run < times; run++) {
                const hour = Math.floor((run * 24) / times + random() * (24 / times))
                const busy = hour >= 9 && hour <= 17 ? 1.35 : 1
                const roll = random()
                const failed = roll < shape.fails * busy
                const state: RunRow['state'] = failed ? 'failed' : roll > 0.985 ? 'cancelled' : roll > 0.965 ? 'skipped' : 'succeeded'
                rows.push({
                    id: `run_${String(id++).padStart(4, '0')}`,
                    job,
                    project: shape.project,
                    worker: RUN_WORKERS[Math.floor(random() * RUN_WORKERS.length)],
                    region: RUN_REGIONS[Math.floor(random() * random() * RUN_REGIONS.length)],
                    state,
                    step: failed ? RUN_STEPS[1 + Math.floor(random() * 3)] : null,
                    day: `2026-10-${pad(day)}`,
                    weekday,
                    hour: `${pad(hour)}:00`,
                    duration: Math.round(shape.seconds * busy * (0.6 + random() * 0.9) * (failed ? 0.55 : 1)),
                    rows: state === 'succeeded' ? Math.round(shape.rows * (0.7 + random() * 0.6)) : 0,
                    wait: Math.round(random() * random() * 120 * busy),
                })
            }
        }
    }
    return rows
})()
