import type { RunTimelineLane, RunTimelineRun } from '@winterop-com/sokkel-ui/RunTimeline'

/** Tidevann's scheduled jobs and their runs, for the run timeline's stories and the app's Schedules page. */

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
/** The current time every story is drawn at. */
export const NOW = Date.UTC(2026, 10, 14, 12, 0)

/** A run each `every` milliseconds from `first`, until `last`, in the state `state` gives its index, or scheduled after now. */
function runs(prefix: string, first: number, last: number, every: number, state: (index: number) => string, minutes = 0): RunTimelineRun[] {
    const made: RunTimelineRun[] = []
    for (let at = first, index = 0; at <= last; at += every, index++) {
        made.push({
            id: `${prefix}-${String(index)}`,
            at,
            end: minutes > 0 ? at + minutes * 60_000 : undefined,
            status: at > NOW ? undefined : state(index),
        })
    }
    return made
}

/** Every run succeeded but the ones at the indexes in `failed` and `skipped`. */
const mostly =
    (failed: number[], skipped: number[] = []) =>
    (index: number): string =>
        failed.includes(index) ? 'failed' : skipped.includes(index) ? 'skipped' : 'succeeded'

/** The jobs' lanes from `from` to `to`; with `minutes`, each run a bar about that long. */
export function lanesFrom(from: number, to: number, minutes = 0): RunTimelineLane[] {
    return [
        {
            id: 'nightly-export',
            name: 'nightly-export',
            detail: 'Every day at 02:00',
            runs: runs('export', Date.UTC(2026, 9, 1, 2), to, DAY, mostly([20, 39], [31]), minutes * 4),
        },
        {
            id: 'sync-inventory',
            name: 'sync-inventory',
            detail: 'Every 6 hours',
            runs: runs('sync', Date.UTC(2026, 9, 1, 0), to, 6 * HOUR, mostly([150, 151, 170], [140]), minutes),
        },
        {
            id: 'rebuild-index',
            name: 'rebuild-index',
            detail: 'Paused',
            runs: runs('index', Date.UTC(2026, 9, 1, 4), NOW - 3 * DAY, 2 * DAY, mostly([18])).filter((run) => Number(run.at) < NOW),
        },
        {
            id: 'send-digest',
            name: 'send-digest',
            detail: 'Mondays at 08:00',
            runs: runs('digest', Date.UTC(2026, 9, 5, 8), to, 7 * DAY, mostly([])),
        },
        { id: 'running', name: 'Concurrency', detail: 'at most 2 at once', total: true, runs: [] },
    ].map((lane) => ({ ...lane, runs: lane.runs.filter((run) => Number(run.at) >= from - DAY && Number(run.at) <= to) }))
}
