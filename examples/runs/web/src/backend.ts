/**
 * The console's server, faked in the page: the jobs, runs, saved views and preferences kept by the
 * shared backend, the calls that change them, and an engine that moves runs along and starts them on
 * their schedules while the console is open.
 */

import { EMPTY_VIEW } from '@winterop-com/sokkel-ui/lib/list-views'
import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Job, type Person, type Prefs, type Run, type RunView } from './model'
import { firesBetween } from './schedule'
import { HISTORY, history, JOBS, planRun, scheduledId, seeded, settle } from './seed'
import { isLive, runAt } from './timeline'

export const jobs = collection<Job>('jobs', () => JOBS.map((job) => ({ ...job })))
export const runs = collection<Run>('runs', () => history(JOBS, Date.now() - HISTORY, Date.now()))
export const views = collection<RunView>('views', () => [
    { id: 'all', name: 'All runs', state: EMPTY_VIEW, locked: true },
    {
        id: 'failed',
        name: 'Failures',
        state: {
            ...EMPTY_VIEW,
            filters: [{ field: 'state', operator: 'oneOf', values: ['failed'] }],
            sort: { column: 'started', direction: 'desc' },
        },
    },
    {
        id: 'mine',
        name: 'Started by me',
        state: { ...EMPTY_VIEW, filters: [{ field: 'by', operator: 'oneOf', values: ['ada'] }], hidden: ['by'] },
    },
])
export const prefs = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS }])

/** Runs started from the console go quickly, a second or two a step, so they settle while watched. */
const QUICK = { pace: 1.6, risk: 0.25 }

const random = seeded(Date.now())

/** Starts a run of `job` now, queued for a moment before its first step. */
export function startRun(job: Job, by: Person, retryOf: Run | null = null): Promise<Run> {
    const run = planRun(
        { job, at: Date.now(), by, trigger: retryOf === null ? 'manual' : 'retry', retryOf: retryOf?.id ?? null, ...QUICK },
        random,
    )
    return runs.insert([run]).then(() => run)
}

/** Stops a run that is queued or running: the step running is cancelled and those after it skipped. */
export function cancelRun(run: Run, by: Person): Promise<Run> {
    const now = Date.now()
    return runs.update(run.id, { cancelledAt: now, cancelledBy: by, state: 'cancelled', ended: now })
}

/** Runs the job of a run again, by `by`, with the same inputs. */
export function retryRun(run: Run, job: Job, by: Person): Promise<Run> {
    return startRun(job, by, run)
}

export function saveJob(job: Job, patch: Partial<Omit<Job, 'id'>>): Promise<Job> {
    return jobs.update(job.id, patch)
}

/** Deletes a job: its runs going are cancelled, and its runs stay in the history. */
export async function deleteJob(job: Job, by: Person): Promise<void> {
    const all = await runs.list()
    await Promise.all(all.filter((run) => run.job === job.id && isLive(runAt(run, Date.now()).state)).map((run) => cancelRun(run, by)))
    await jobs.remove(job.id)
}

/** What a new job is made from: its name and code, project and owner, and its steps from a starter. */
export interface NewJob {
    id: string
    name: string
    description: string
    project: Job['project']
    owner: Person
    starter: 'pipeline' | 'sync' | 'report'
    schedule: Job['schedule']
}

export const STARTERS: { value: NewJob['starter']; label: string; steps: Job['steps'] }[] = [
    {
        value: 'pipeline',
        label: 'Fetch, transform, validate, upload and notify',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'transform', kind: 'sql', needs: ['fetch'] },
            { code: 'validate', kind: 'schema', needs: ['transform'] },
            { code: 'upload', kind: 's3', needs: ['validate'] },
            { code: 'notify', kind: 'webhook', needs: ['upload'] },
        ],
    },
    {
        value: 'sync',
        label: 'Fetch, validate and upload',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'validate', kind: 'schema', needs: ['fetch'] },
            { code: 'upload', kind: 'sql', needs: ['validate'] },
        ],
    },
    {
        value: 'report',
        label: 'Fetch, transform and notify',
        steps: [
            { code: 'fetch', kind: 'http', needs: [] },
            { code: 'transform', kind: 'python', needs: ['fetch'] },
            { code: 'notify', kind: 'email', needs: ['transform'] },
        ],
    },
]

export async function createJob(fields: NewJob): Promise<Job> {
    const known = await jobs.list()
    if (known.some((job) => job.id === fields.id)) throw new Error(`A job with the code ${fields.id} is there already.`)
    const steps = STARTERS.find((one) => one.value === fields.starter)?.steps ?? []
    const { id, starter: _starter, ...rest } = fields
    return jobs.create({ ...rest, steps, paused: false, retries: 2, timeout: 30, pace: 20, risk: 0.08 }, id)
}

/** What the engine tells the console: a run that settled. */
export interface Settled {
    run: Run
    job: string
}

type Listener = (event: Settled) => void
const listeners = new Set<Listener>()

/** Hears each run that settles while the console is open; returns the call that stops it. */
export function onSettled(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** How often the engine looks, in milliseconds. */
const TICK = 1000

/**
 * Starts the engine: every second it stores the state each running run has reached and tells who
 * listens of those that settled, and it starts the runs whose schedules came due since it last
 * looked, or skips one whose job still has a run going. Runs the schedules fired while the console
 * was closed are filled in first, from the history, up to a day back. Returns the call that stops it.
 */
export function startEngine(): () => void {
    let looked = Date.now()
    let busy = false
    let stopped = false
    const tick = async () => {
        if (busy || stopped) return
        busy = true
        try {
            const now = Date.now()
            const [all, known, [mine]] = await Promise.all([runs.list(), jobs.list(), prefs.list()])
            for (const run of all) {
                if (!isLive(run.state)) continue
                const at = runAt(run, now)
                if (at.state === run.state && at.ended === run.ended) continue
                const next = await runs.update(run.id, { state: at.state, ended: at.ended })
                if (!isLive(at.state)) for (const listener of listeners) listener({ run: next, job: run.job })
            }
            if (mine?.scheduler !== false) {
                const due: Run[] = []
                for (const job of known) {
                    if (job.schedule === null || job.paused) continue
                    for (const fire of firesBetween(job.schedule, looked, now, 4)) {
                        const id = scheduledId(job, fire)
                        if (all.some((one) => one.id === id)) continue
                        const run = planRun({ job, at: fire, by: 'schedule', trigger: 'schedule' }, random, id)
                        const going = all.some((one) => one.job === job.id && isLive(one.state))
                        if (going) run.skipped = 'The run before was still going.'
                        due.push(settle(run, now))
                    }
                }
                if (due.length > 0) await runs.insert(due)
            }
            looked = now
        } finally {
            busy = false
        }
    }
    void (async () => {
        const all = await runs.list()
        const newest = all.reduce((most, run) => (run.by === 'schedule' ? Math.max(most, run.created) : most), 0)
        const from = Math.max(newest, Date.now() - 24 * 3_600_000)
        const missed = history(await jobs.list(), from, Date.now()).filter((run) => run.by === 'schedule')
        const ids = new Set(all.map((run) => run.id))
        const added = missed.filter((run) => !ids.has(run.id))
        if (added.length > 0) await runs.insert(added)
    })()
    const timer = window.setInterval(() => void tick(), TICK)
    return () => {
        stopped = true
        window.clearInterval(timer)
    }
}
