/**
 * Tidevann's jobs, and the runs they would have had over a span of time: each schedule's fires and a
 * few runs started by hand, drawn from a seeded generator so the same span gives the same runs.
 */

import { dayOf, PEOPLE, type Job, type Person, type Run, type RunStepPlan } from './model'
import { firesBetween } from './schedule'
import { runAt } from './timeline'

export const JOBS: Job[] = [
    {
        id: 'nightly-export',
        name: 'Nightly export',
        description: "Exports the day's orders from harbor to the archive, then tells the team it is there.",
        project: 'harbor',
        owner: 'ada',
        steps: [
            { code: 'fetch-orders', kind: 'http', needs: [] },
            { code: 'fetch-inventory', kind: 'http', needs: [] },
            { code: 'transform', kind: 'sql', needs: ['fetch-orders', 'fetch-inventory'] },
            { code: 'validate', kind: 'schema', needs: ['transform'] },
            { code: 'upload', kind: 's3', needs: ['validate'] },
            { code: 'notify', kind: 'webhook', needs: ['upload'] },
        ],
        schedule: { cadence: 'daily', at: '02:00', starts: '2026-09-01' },
        paused: false,
        retries: 2,
        timeout: 60,
        pace: 45,
        risk: 0.14,
    },
    {
        id: 'sync-inventory',
        name: 'Inventory sync',
        description: "Brings larkspur's stock levels in from the warehouse api every hour.",
        project: 'larkspur',
        owner: 'linus',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'transform', kind: 'python', needs: ['fetch'] },
            { code: 'validate', kind: 'schema', needs: ['transform'] },
            { code: 'upload', kind: 'sql', needs: ['validate'] },
        ],
        schedule: { cadence: 'hourly', at: '00:15', starts: '2026-09-01' },
        paused: false,
        retries: 3,
        timeout: 15,
        pace: 16,
        risk: 0.06,
    },
    {
        id: 'rebuild-index',
        name: 'Search index rebuild',
        description: 'Rebuilds the search index of harbor from scratch, then swaps it in once it checks out.',
        project: 'harbor',
        owner: 'grace',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'transform', kind: 'python', needs: ['fetch'] },
            { code: 'validate', kind: 'schema', needs: ['transform'] },
            { code: 'upload', kind: 's3', needs: ['validate'] },
            { code: 'notify', kind: 'webhook', needs: ['upload'] },
        ],
        schedule: { cadence: 'weekly', at: '03:30', starts: '2026-09-06' },
        paused: false,
        retries: 1,
        timeout: 120,
        pace: 260,
        risk: 0.1,
    },
    {
        id: 'send-digest',
        name: 'Morning digest',
        description: "Writes yesterday's runs into one email and sends it to larkspur's team before the day starts.",
        project: 'larkspur',
        owner: 'margaret',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'transform', kind: 'python', needs: ['fetch'] },
            { code: 'notify', kind: 'email', needs: ['transform'] },
        ],
        schedule: { cadence: 'weekdays', at: '07:00', starts: '2026-09-01' },
        paused: false,
        retries: 2,
        timeout: 10,
        pace: 5,
        risk: 0.05,
    },
    {
        id: 'import-orders',
        name: 'Order import',
        description: "Picks up juniper's new orders every quarter of an hour and loads them for the morning's shipping.",
        project: 'juniper',
        owner: 'grace',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'validate', kind: 'schema', needs: ['fetch'] },
            { code: 'transform', kind: 'sql', needs: ['validate'] },
            { code: 'upload', kind: 'sql', needs: ['transform'] },
        ],
        schedule: { cadence: '15m', at: '00:00', starts: '2026-09-01' },
        paused: false,
        retries: 3,
        timeout: 10,
        pace: 7,
        risk: 0.11,
    },
]

/** A generator of numbers from 0 to 1, the same for the same seed. */
export function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

export const pick = <V>(values: readonly V[], at: number): V => values[Math.floor(at * values.length) % values.length] as V

/** What a step says when it fails, by the word its code starts with. */
export function failureOf(step: string, job: Pick<Job, 'id' | 'project' | 'retries'>): string {
    switch (step.split('-')[0]) {
        case 'fetch':
            return `GET https://api.example.org/${job.project}/${job.id} answered 503 after ${String(job.retries + 1)} tries`
        case 'transform':
            return 'column sku is missing from 12 rows, first at row 48'
        case 'validate':
            return 'amount must be a number (37 rows), first at row 112'
        case 'upload':
            return 'storage.example.org refused the upload: the bucket is over its quota'
        default:
            return 'smtp.example.org did not answer within 30s'
    }
}

/** What a run of a job is given. */
export function inputsOf(job: Pick<Job, 'id' | 'project'>, at: number): Run['inputs'] {
    const day = dayOf(at - 86_400_000)
    switch (job.id) {
        case 'nightly-export':
            return { day, project: job.project, format: 'csv', target: `https://storage.example.org/${job.project}/exports/` }
        case 'sync-inventory':
            return { project: job.project, source: `https://api.example.org/${job.project}/inventory`, dry_run: false }
        case 'rebuild-index':
            return { project: job.project, shards: 6, full: true }
        case 'send-digest':
            return { project: job.project, day, to: `${job.project}-team@example.org` }
        default:
            return { project: job.project, source: `https://api.example.org/${job.project}/orders`, batch: 500 }
    }
}

export interface RunOrder {
    job: Job
    at: number
    by: Person | 'schedule'
    trigger: Run['trigger']
    retryOf?: string | null
    /** Seconds a step takes, about; the job's own pace by default. */
    pace?: number
    /** The share of runs that fail; the job's own by default. */
    risk?: number
}

let made = 0

/** A run of a job as it is asked for: its plan, its outcome and what it is given. */
export function planRun(order: RunOrder, random: () => number, id?: string): Run {
    const { job, at } = order
    const pace = order.pace ?? job.pace
    const steps: RunStepPlan[] = job.steps.map((step) => ({ ...step, ms: Math.round(pace * 1000 * (0.45 + random() * 1.2)) }))
    const fails = random() < (order.risk ?? job.risk) && steps.length > 0
    const failAt = fails ? pick(steps, random()).code : null
    made += 1
    const run: Run = {
        id: id ?? `run_${Math.floor(at / 1000).toString(36)}${made.toString(36)}`,
        job: job.id,
        project: job.project,
        by: order.by,
        trigger: order.trigger,
        retryOf: order.retryOf ?? null,
        created: at,
        wait: Math.round(order.pace === undefined ? 400 + random() * 3600 : 1200 + random() * 800),
        steps,
        failAt,
        error: failAt === null ? null : failureOf(failAt, job),
        skipped: null,
        cancelledAt: null,
        cancelledBy: null,
        records: Math.round(random() ** 2 * 250_000),
        inputs: inputsOf(job, at),
        state: 'queued',
        ended: null,
    }
    return run
}

/** The id of the run a schedule starts at a fire, the same wherever it is made, so a fire is run once. */
export function scheduledId(job: Pick<Job, 'id'>, fire: number): string {
    const mark = [...job.id].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 1296, 7)
    return `run_${Math.floor(fire / 1000).toString(36)}${mark.toString(36).padStart(2, '0')}`
}

/** Stamps the state a run stands at by `now`. */
export function settle(run: Run, now: number): Run {
    const at = runAt(run, now)
    return { ...run, state: at.state, ended: at.ended }
}

/**
 * The runs Tidevann's jobs had after `from`, up to `now`: one for each fire of each schedule, a few
 * of them skipped or cancelled, and about one an hour started by hand. Those not done by `now` are
 * still going.
 */
export function history(jobs: readonly Job[], from: number, now: number): Run[] {
    const random = seeded(Math.floor(from / 60_000))
    const runs: Run[] = []
    for (const job of jobs) {
        if (job.schedule === null || job.paused) continue
        for (const at of firesBetween(job.schedule, from, now)) {
            const run = planRun({ job, at, by: 'schedule', trigger: 'schedule' }, random, scheduledId(job, at))
            const roll = random()
            if (roll < 0.015) run.skipped = 'No worker slot was free within ten minutes.'
            else if (roll < 0.03) {
                const span = run.steps.reduce((sum, step) => sum + step.ms, 0)
                run.cancelledAt = at + run.wait + Math.round(span * random() * 0.8)
                run.cancelledBy = pick(PEOPLE, random())
            }
            runs.push(settle(run, now))
        }
    }
    const hours = Math.floor((now - from) / 3_600_000)
    for (let hour = 0; hour < hours; hour += 1) {
        if (random() < 0.45) continue
        const job = pick(jobs, random())
        if (job === undefined) continue
        const at = from + hour * 3_600_000 + Math.round(random() * 3_600_000)
        if (at > now) continue
        const by = pick(PEOPLE, random())
        runs.push(settle(planRun({ job, at, by, trigger: 'manual' }, random, `run_${Math.floor(at / 1000).toString(36)}m`), now))
    }
    return runs.sort((left, right) => right.created - left.created)
}

/** How far back the first runs go. */
export const HISTORY = 48 * 3_600_000
