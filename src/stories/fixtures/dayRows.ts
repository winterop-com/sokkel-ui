/** Tidevann's day of runs from `runs.ts` as rows, for the stories drawn with `Chart`. */
import { STATE_COLORS } from './runRows'
import {
    BUCKETS,
    BY_STATE,
    DURATIONS,
    FAILURES,
    HEATMAP,
    HOURS,
    JOBS,
    QUEUE,
    RUNS,
    RUNS_BY_JOB,
    SCATTER,
    STATE_LABELS,
    STATES,
    TIMES,
    WORKERS,
} from './runs'

/** Each fifteen-minute step: the runs started and failed, and the run duration percentiles in seconds. */
export const STEP_ROWS = TIMES.map((time, index) => ({
    time,
    Runs: RUNS[index],
    Failures: FAILURES[index],
    p50: DURATIONS.p50[index],
    p90: DURATIONS.p90[index],
    p99: DURATIONS.p99[index],
}))

/** The color token each of a step's figures is drawn in. */
export const STEP_COLORS: Record<string, string> = {
    Runs: 'chart-2',
    Failures: 'status-failed',
    p50: 'chart-3',
    p90: 'warning',
    p99: 'status-failed',
}

/** The runs each job started in each step. */
export const JOB_STEP_ROWS = JOBS.flatMap((job) => TIMES.map((time, index) => ({ time, job, runs: RUNS_BY_JOB[job][index] })))

/** The runs waiting for a slot on each worker in each step. */
export const WORKER_STEP_ROWS = WORKERS.flatMap((worker) => TIMES.map((time, index) => ({ time, worker, waiting: QUEUE[worker][index] })))

/** The color token each worker is drawn in. */
export const WORKER_COLORS: Record<string, string> = {
    'worker-1': 'chart-2',
    'worker-2': 'chart-3',
    'worker-3': 'warning',
    'worker-4': 'chart-4',
}

/** The runs that ended in each state in each hour, the state as a reader sees it. */
export const STATE_HOUR_ROWS = STATES.flatMap((state) =>
    HOURS.map((hour, index) => ({ hour, state: STATE_LABELS[state], runs: BY_STATE[state][index] })),
)

/** The color token each state, as a reader sees it, is drawn in. */
export const STATE_LABEL_COLORS: Record<string, string> = Object.fromEntries(
    STATES.map((state) => [STATE_LABELS[state], STATE_COLORS[state]]),
)

/** The runs in each hour by how long they took. */
export const DURATION_ROWS = HEATMAP.map(([hour, bucket, runs]) => ({ hour: HOURS[hour], bucket: BUCKETS[bucket], runs }))

/** Every run of import-orders: the rows it read and the seconds it took. */
export const IMPORT_ROWS = SCATTER.map(([rows, seconds]) => ({ job: 'import-orders', rows, seconds }))
