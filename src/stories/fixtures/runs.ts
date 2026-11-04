/** Fixed, neutral data for the chart and dashboard stories: Tidevann's job runs over one day, in fifteen-minute steps. */

/** A seeded generator, so every story draws the same numbers. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

const STEPS = 96
const pad = (value: number) => String(value).padStart(2, '0')

/** The time of each step, `00:00` to `23:45`. */
export const TIMES: string[] = Array.from({ length: STEPS }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`)

/** The hours of the day, `00` to `23`. */
export const HOURS: string[] = Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`)

export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
export const WORKERS = ['worker-1', 'worker-2', 'worker-3', 'worker-4'] as const
export const STATES = ['succeeded', 'failed', 'cancelled', 'skipped'] as const

/** The day's load: quiet at night, a morning ramp, a midday peak and an evening batch. */
const load = (i: number) => {
    const hour = i / 4
    return (
        0.35 +
        0.55 * Math.exp(-((hour - 11) ** 2) / 18) +
        0.35 * Math.exp(-((hour - 20) ** 2) / 4) +
        0.25 * Math.exp(-((hour - 2) ** 2) / 1.5)
    )
}

const round = (value: number, places = 0) => Math.round(value * 10 ** places) / 10 ** places

const JOB_WEIGHT = [0.8, 1.6, 0.6, 1.1, 1.9]

/** Runs started per step, per job. */
export const RUNS_BY_JOB: Record<string, number[]> = Object.fromEntries(
    JOBS.map((job, j) => {
        const random = seeded(11 + j)
        return [job, TIMES.map((_, i) => Math.max(0, Math.round(JOB_WEIGHT[j] * 9 * load(i) + random() * 4 - 1)))]
    }),
)

/** Runs started per step, every job together. */
export const RUNS: number[] = TIMES.map((_, i) => JOBS.reduce((sum, job) => sum + RUNS_BY_JOB[job][i], 0))

/** Failed runs per step, with an incident from 14:00 to 15:15. */
export const FAILURES: number[] = (() => {
    const random = seeded(7)
    return TIMES.map((_, i) => {
        const incident = i >= 56 && i <= 61 ? 9 + Math.round(random() * 6) : 0
        return Math.round(RUNS[i] * 0.02 + random() * 1.6) + incident
    })
})()

/** Run duration percentiles per step, in seconds. */
export const DURATIONS: Record<'p50' | 'p90' | 'p99', number[]> = (() => {
    const random = seeded(23)
    const p50 = TIMES.map((_, i) => round(2.4 + 1.6 * load(i) + random() * 0.6 + (i >= 56 && i <= 61 ? 2.2 : 0), 2))
    return {
        p50,
        p90: p50.map((value) => round(value * (2.1 + random() * 0.4), 2)),
        p99: p50.map((value, i) => round(value * (3.6 + random() * 1.2) + (i >= 56 && i <= 61 ? 9 : 0), 2)),
    }
})()

/** Runs waiting for a slot per step, per worker. */
export const QUEUE: Record<string, number[]> = Object.fromEntries(
    WORKERS.map((worker, w) => {
        const random = seeded(41 + w)
        return [
            worker,
            TIMES.map((_, i) =>
                Math.max(0, Math.round(load(i) * (6 + w * 3) + random() * 5 - 2 + (i >= 56 && i <= 61 && w === 2 ? 18 : 0))),
            ),
        ]
    }),
)

/** Runs per hour by state, for stacked bars. */
export const BY_STATE: Record<(typeof STATES)[number], number[]> = (() => {
    const random = seeded(5)
    const runs = HOURS.map((_, h) => RUNS.slice(h * 4, h * 4 + 4).reduce((sum, value) => sum + value, 0))
    const failed = HOURS.map((_, h) => FAILURES.slice(h * 4, h * 4 + 4).reduce((sum, value) => sum + value, 0))
    const cancelled = HOURS.map(() => Math.round(random() * 4))
    const skipped = HOURS.map(() => Math.round(random() * 6))
    return {
        succeeded: runs.map((value, h) => value - failed[h] - cancelled[h] - skipped[h]),
        failed,
        cancelled,
        skipped,
    }
})()

/** The duration buckets of the heatmap and histogram. */
export const BUCKETS = ['<1s', '1-2s', '2-5s', '5-10s', '10-30s', '30-60s', '1-2m', '>2m'] as const

/** Runs per hour and duration bucket, as `[hour, bucket, count]`. */
export const HEATMAP: [number, number, number][] = (() => {
    const random = seeded(31)
    const cells: [number, number, number][] = []
    HOURS.forEach((_, h) => {
        const busy = load(h * 4)
        const slow = h >= 14 && h <= 15 ? 2 : 0
        BUCKETS.forEach((_, b) => {
            const center = 2.2 + busy * 0.8 + slow
            const count = Math.round(60 * busy * Math.exp(-((b - center) ** 2) / 1.6) + random() * 5)
            cells.push([h, b, count])
        })
    })
    return cells
})()

/** Runs per duration bucket across the day. */
export const HISTOGRAM: number[] = BUCKETS.map((_, b) => HEATMAP.filter((cell) => cell[1] === b).reduce((sum, cell) => sum + cell[2], 0))

/** One point per run of import-orders: rows read and seconds taken. */
export const SCATTER: [number, number][] = (() => {
    const random = seeded(59)
    return Array.from({ length: 160 }, () => {
        const rows = Math.round(400 + random() * 9600)
        return [rows, round(0.6 + rows / 1400 + random() * 2.4 + (random() > 0.94 ? 6 : 0), 2)]
    })
})()

/** The day's runs by state. */
export const STATE_TOTALS: Record<(typeof STATES)[number], number> = Object.fromEntries(
    STATES.map((state) => [state, BY_STATE[state].reduce((sum, value) => sum + value, 0)]),
) as Record<(typeof STATES)[number], number>

export const STATE_LABELS: Record<(typeof STATES)[number], string> = {
    succeeded: 'Succeeded',
    failed: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
}

export const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
