/** Fixed, neutral rows for the data table stories: Tidevann's runs, as many as a story asks for, the same every time. */

import type { Status } from '@winterop-com/sokkel-ui/StatusChip'

/** A seeded generator, so every story draws the same rows. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
export const STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const
export const PEOPLE = ['ada', 'grace', 'linus', 'margaret', 'schedule'] as const

/** The states, weighted the way a day of runs falls. */
const STATES: [Status, number][] = [
    ['succeeded', 0.72],
    ['failed', 0.09],
    ['running', 0.05],
    ['queued', 0.05],
    ['cancelled', 0.05],
    ['skipped', 0.04],
]

export interface TableRun {
    id: string
    job: (typeof JOBS)[number]
    project: (typeof PROJECTS)[number]
    state: Status
    step: (typeof STEPS)[number]
    by: (typeof PEOPLE)[number]
    /** Seconds before the newest run started, so later runs have smaller values. */
    ago: number
    /** Seconds the run took, or has taken so far. */
    duration: number
    records: number
    attempts: number
}

const pick = <V>(values: readonly V[], at: number) => values[Math.floor(at * values.length) % values.length]

function state(at: number): Status {
    let sum = 0
    for (const [value, weight] of STATES) {
        sum += weight
        if (at < sum) return value
    }
    return 'succeeded'
}

/** One run, numbered from the newest. */
function run(index: number, random: () => number): TableRun {
    const status = state(random())
    return {
        id: `run_${(0x8f3a00 + index).toString(16)}`,
        job: pick(JOBS, random()),
        project: pick(PROJECTS, random()),
        state: status,
        step: status === 'succeeded' ? 'notify' : pick(STEPS, random()),
        by: pick(PEOPLE, random() * 0.6 + (random() < 0.5 ? 0.4 : 0)),
        ago: index * 53 + Math.floor(random() * 50),
        duration: Math.round(2 + random() ** 3 * 3600),
        records: Math.round(random() ** 2 * 250_000),
        attempts: random() < 0.85 ? 1 : random() < 0.7 ? 2 : 3,
    }
}

const made = new Map<number, TableRun[]>()

/** The newest `count` runs; the same count always gives the same rows. */
export function makeRuns(count: number): TableRun[] {
    const cached = made.get(count)
    if (cached !== undefined) return cached
    const random = seeded(20261105)
    const runs = Array.from({ length: count }, (_, index) => run(index, random))
    made.set(count, runs)
    return runs
}

/** A row of the run tree: a project, a job in it, or a run of that job. */
export type TreeRow =
    | { kind: 'project'; id: string; name: string; children: TreeRow[] }
    | { kind: 'job'; id: string; name: string; project: string; children: TreeRow[] }
    | { kind: 'run'; id: string; run: TableRun }

/** The runs grouped by project and then job: `count` runs in all. */
export function makeRunTree(count: number): TreeRow[] {
    const runs = makeRuns(count)
    return PROJECTS.map((project) => ({
        kind: 'project' as const,
        id: project,
        name: project,
        children: JOBS.map((job) => ({
            kind: 'job' as const,
            id: `${project}/${job}`,
            name: job,
            project,
            children: runs
                .filter((one) => one.project === project && one.job === job)
                .map((one) => ({ kind: 'run' as const, id: one.id, run: one })),
        })),
    }))
}

const pad = (value: number) => String(value).padStart(2, '0')

/** When a run started, from a fixed newest time: `Nov 5, 14:02`. */
export function startedAt(ago: number): string {
    const newest = Date.UTC(2026, 10, 5, 14, 2)
    const at = new Date(newest - ago * 1000)
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][at.getUTCMonth()]
    return `${month} ${String(at.getUTCDate())}, ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`
}

/** A duration as a reader says it: `48s`, `4m 12s`, `1h 03m`. */
export function took(seconds: number): string {
    if (seconds < 60) return `${String(seconds)}s`
    if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m ${pad(seconds % 60)}s`
    return `${String(Math.floor(seconds / 3600))}h ${pad(Math.floor((seconds % 3600) / 60))}m`
}
