/**
 * The tables a query reads: the jobs, three weeks of their runs and the steps of each, made the same
 * every time from a fixed seed, with the runs started in the studio added as they happen.
 */

import type { Run } from './model'
import type { Table, Value } from './sql'

/** The same sequence of numbers from 0 to 1 every time. */
function seeded(seed: number): () => number {
    let state = seed
    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
        return state / 4_294_967_296
    }
}

const JOBS = [
    {
        name: 'nightly-export',
        project: 'harbor',
        owner: 'ada',
        schedule: '0 2 * * *',
        steps: ['fetch', 'transform', 'validate', 'upload', 'notify'],
    },
    { name: 'import-orders', project: 'harbor', owner: 'grace', schedule: '*/30 * * * *', steps: ['fetch', 'validate', 'upload'] },
    { name: 'sync-inventory', project: 'juniper', owner: 'linus', schedule: '0 * * * *', steps: ['fetch', 'transform', 'upload'] },
    {
        name: 'rebuild-index',
        project: 'juniper',
        owner: 'margaret',
        schedule: '0 4 * * 0',
        steps: ['fetch', 'transform', 'upload', 'notify'],
    },
    { name: 'send-digest', project: 'larkspur', owner: 'ada', schedule: '0 8 * * 1-5', steps: ['fetch', 'transform', 'notify'] },
]

/** About how long each step takes, in milliseconds. */
const SLOW: Record<string, number> = { fetch: 1800, transform: 900, validate: 600, upload: 1400, notify: 200 }

interface HistoryRun {
    id: number
    pipeline: string
    project: string
    state: string
    started_at: string
    duration_ms: number
    triggered_by: string
}

function history(): { runs: HistoryRun[]; steps: Record<string, Value>[] } {
    const random = seeded(4181)
    const runs: HistoryRun[] = []
    const steps: Record<string, Value>[] = []
    const base = Date.UTC(2026, 9, 20, 0, 0, 0)
    const people = ['ada', 'grace', 'linus', 'margaret', 'scheduler']
    for (let index = 0; index < 160; index += 1) {
        const job = JOBS[Math.floor(random() * JOBS.length)] as (typeof JOBS)[number]
        const started = base + Math.floor((index / 160) * 21 * 86_400_000 + random() * 3_600_000)
        const roll = random()
        const failAt = roll < 0.16 ? Math.floor(random() * job.steps.length) : -1
        const cancelled = failAt === -1 && roll > 0.97
        let duration = 0
        const id = 4000 + index
        for (const [at, step] of job.steps.entries()) {
            const ran = failAt === -1 || at <= failAt
            const took = Math.round((SLOW[step] ?? 500) * (0.5 + random()))
            const state = cancelled && at === job.steps.length - 1 ? 'cancelled' : !ran ? 'skipped' : at === failAt ? 'failed' : 'succeeded'
            if (ran) duration += took
            steps.push({
                run_id: id,
                step,
                kind: step,
                state,
                duration_ms: ran ? took : null,
                rows: ran && state !== 'failed' ? Math.round(200 + random() * 4800) : null,
            })
        }
        runs.push({
            id,
            pipeline: job.name,
            project: job.project,
            state: failAt >= 0 ? 'failed' : cancelled ? 'cancelled' : 'succeeded',
            started_at: new Date(started).toISOString().slice(0, 19).replace('T', ' '),
            duration_ms: duration,
            triggered_by: random() < 0.75 ? 'scheduler' : (people[Math.floor(random() * 4)] as string),
        })
    }
    return { runs, steps }
}

const HISTORY = history()

/** The tables as they stand, the studio's own runs among them. */
export function tablesWith(studioRuns: readonly Run[]): Table[] {
    const ours = [...studioRuns].sort((a, b) => a.number - b.number)
    const runRows: Record<string, Value>[] = [
        ...HISTORY.runs.map((run) => ({ ...run })),
        ...ours.map((run) => ({
            id: 5000 + run.number,
            pipeline: run.pipeline,
            project: run.project,
            state: run.state,
            started_at: new Date(run.started).toISOString().slice(0, 19).replace('T', ' '),
            duration_ms: run.finished === undefined ? null : run.finished - run.started,
            triggered_by: run.by,
        })),
    ]
    const stepRows: Record<string, Value>[] = [
        ...HISTORY.steps,
        ...ours.flatMap((run) =>
            run.steps.map((step) => ({
                run_id: 5000 + run.number,
                step: step.id,
                kind: step.kind,
                state: step.state,
                duration_ms: step.duration_ms ?? null,
                rows: step.rows ?? null,
            })),
        ),
    ]
    return [
        {
            name: 'runs',
            description: 'Every run of every pipeline, the scheduled ones and those started here.',
            columns: [
                { name: 'id', type: 'integer', description: "The run's number." },
                { name: 'pipeline', type: 'text', description: 'The pipeline it ran.' },
                { name: 'project', type: 'text', description: 'harbor, juniper or larkspur.' },
                { name: 'state', type: 'text', description: 'running, succeeded, failed or cancelled.' },
                { name: 'started_at', type: 'text', description: 'When it started, in UTC: 2026-11-02 02:00:14.' },
                { name: 'duration_ms', type: 'integer', description: 'How long it took; null while it runs.' },
                { name: 'triggered_by', type: 'text', description: 'The scheduler, or the person who started it.' },
            ],
            rows: runRows,
        },
        {
            name: 'steps',
            description: 'Each step of each run, as far as it got.',
            columns: [
                { name: 'run_id', type: 'integer', description: 'The run, as runs.id.' },
                { name: 'step', type: 'text', description: "The step's id in its pipeline." },
                { name: 'kind', type: 'text', description: 'fetch, transform, validate, upload or notify.' },
                { name: 'state', type: 'text', description: 'succeeded, failed, skipped, cancelled or running.' },
                { name: 'duration_ms', type: 'integer', description: 'How long it ran; null when it did not.' },
                { name: 'rows', type: 'integer', description: 'How many rows it gave.' },
            ],
            rows: stepRows,
        },
        {
            name: 'jobs',
            description: 'The scheduled pipelines and who looks after each.',
            columns: [
                { name: 'name', type: 'text', description: "The pipeline's name, as runs.pipeline." },
                { name: 'project', type: 'text', description: 'harbor, juniper or larkspur.' },
                { name: 'owner', type: 'text', description: 'Who looks after it.' },
                { name: 'schedule', type: 'text', description: 'When it runs, as a cron line.' },
            ],
            rows: JOBS.map(({ name, project, owner, schedule }) => ({ name, project, owner, schedule })),
        },
    ]
}
