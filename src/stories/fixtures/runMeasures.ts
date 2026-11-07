/**
 * Tidevann's runs shaped for the charts that read more than a run's own fields: rates as figures,
 * the rows each run carried through its steps, the index's daily change, and each job's goals.
 * Built from `RUN_ROWS`, and seeded where they add numbers, so every story draws the same.
 */
import { RUN_JOBS, RUN_ROWS, RUN_STEPS, seeded, type RunRow } from './runRows'

/** One run with its flags as figures, so their average is a rate in percent. */
export interface RunRateRow extends RunRow {
    /** Always 1, so a sum counts the runs. */
    runs: number
    /** 100 when the run succeeded, 0 when not. */
    succeeded: number
    /** 100 when the run failed, 0 when not. */
    'failure rate': number
}

/** The month's runs with their flags as figures. */
export const RUN_RATES: RunRateRow[] = RUN_ROWS.map((row) => ({
    ...row,
    runs: 1,
    succeeded: row.state === 'succeeded' ? 100 : 0,
    'failure rate': row.state === 'failed' ? 100 : 0,
}))

/** The steps a run's rows pass through, in order. */
export const CARRY_STEPS = RUN_STEPS.slice(0, 4)

/** The rows one run still held after one of its steps. */
export interface StepRow {
    [field: string]: unknown
    run: string
    job: RunRow['job']
    project: RunRow['project']
    step: (typeof RUN_STEPS)[number]
    rows: number
}

/** The share of a job's rows that pass validation, before a run's own spread. */
const VALID: Record<RunRow['job'], number> = {
    'nightly-export': 0.84,
    'sync-inventory': 0.8,
    'rebuild-index': 0.62,
    'send-digest': 0.86,
    'import-orders': 0.88,
}

/**
 * The rows each successful run carried through fetch, transform, validate and upload, one record
 * per run and step: fewer after each step, as transform drops duplicates, validate drops rows that
 * break the schema (rebuild-index the most) and upload drops the ones the target refuses.
 */
export const STEP_ROWS: StepRow[] = (() => {
    const random = seeded(11)
    return RUN_ROWS.filter((row) => row.state === 'succeeded').flatMap((row) => {
        const kept = [1.25 + random() * 0.2, 0.84 + random() * 0.1, VALID[row.job] + random() * 0.1, 0.95 + random() * 0.05]
        let rows = row.rows
        return CARRY_STEPS.map((step, index) => {
            rows = Math.round(rows * kept[index])
            return { run: row.id, job: row.job, project: row.project, step, rows }
        })
    })
})()

/** How a job changes the index: the share of its rows it adds, or removes when negative. */
const INDEX_EFFECT: Partial<Record<RunRow['job'], number>> = {
    'import-orders': 1,
    'sync-inventory': 1,
    'rebuild-index': -0.45,
    'nightly-export': -0.15,
}

/** One successful run's change to the rows in the search index. */
export interface IndexRow {
    [field: string]: unknown
    run: string
    job: RunRow['job']
    /** The day, as `Oct 1`. */
    date: string
    change: number
}

/** What each successful run that touches the index added to it or pruned from it. */
export const INDEX_ROWS: IndexRow[] = RUN_ROWS.flatMap((row) => {
    const effect = INDEX_EFFECT[row.job]
    if (effect === undefined || row.state !== 'succeeded') return []
    return [{ run: row.id, job: row.job, date: `Oct ${String(Number(row.day.slice(8)))}`, change: Math.round(row.rows * effect) }]
})

/** One job's month against its goals. */
export interface JobGoalRow {
    [field: string]: unknown
    job: RunRow['job']
    project: RunRow['project']
    /** The share of its runs that succeeded, in percent. */
    'success rate': number
    /** The success rate it aims for, in percent. */
    target: number
    /** Its runs' average wait in the queue, in seconds. */
    'queue wait': number
    /** The wait its runs should stay under, in seconds. */
    budget: number
}

const TARGETS: Record<RunRow['job'], { target: number; budget: number }> = {
    'nightly-export': { target: 90, budget: 30 },
    'sync-inventory': { target: 95, budget: 45 },
    'rebuild-index': { target: 85, budget: 40 },
    'send-digest': { target: 92, budget: 25 },
    'import-orders': { target: 90, budget: 30 },
}

/** Each job's month: its success rate and queue wait against what it aims for. */
export const JOB_GOALS: JobGoalRow[] = RUN_JOBS.map((job) => {
    const runs = RUN_ROWS.filter((row) => row.job === job)
    const share = runs.filter((row) => row.state === 'succeeded').length / runs.length
    const wait = runs.reduce((sum, row) => sum + row.wait, 0) / runs.length
    return {
        job,
        project: runs[0].project,
        'success rate': Math.round(share * 1000) / 10,
        target: TARGETS[job].target,
        'queue wait': Math.round(wait * 10) / 10,
        budget: TARGETS[job].budget,
    }
})
