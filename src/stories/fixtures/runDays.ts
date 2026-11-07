/**
 * Tidevann's runs summed by day, one row per project and day from January to October 2026: how
 * many ran and failed, the rows they moved, how long they took and the workers each project's pool
 * held. Seeded, so every story draws the same.
 */

import { RUN_PROJECTS, seeded } from './runRows'

/** One project's day. */
export interface RunDay {
    [field: string]: unknown
    /** The day, `2026-01-01` to `2026-10-31`. */
    day: string
    /** The Monday that starts the day's week. */
    week: string
    /** The month, `2026-01` to `2026-10`. */
    month: string
    project: (typeof RUN_PROJECTS)[number]
    runs: number
    failed: number
    /** Rows moved by the day's runs. */
    rows: number
    /** The day's run durations in seconds: the 10th percentile, the median and the 90th percentile. */
    p10: number
    p50: number
    p90: number
    /** The workers in the project's pool that day. */
    workers: number
}

const SHAPE: Record<string, { runs: number; seconds: number; fails: number; pool: [string, number][] }> = {
    harbor: {
        runs: 9,
        seconds: 140,
        fails: 0.05,
        pool: [
            ['2026-01-01', 3],
            ['2026-03-02', 4],
            ['2026-06-01', 6],
            ['2026-09-14', 5],
        ],
    },
    juniper: {
        runs: 7,
        seconds: 120,
        fails: 0.07,
        pool: [
            ['2026-01-01', 2],
            ['2026-04-13', 3],
            ['2026-08-03', 4],
        ],
    },
    larkspur: {
        runs: 4,
        seconds: 380,
        fails: 0.1,
        pool: [
            ['2026-01-01', 2],
            ['2026-07-06', 3],
        ],
    },
}

const iso = (time: number) => new Date(time).toISOString().slice(0, 10)
const DAY = 86_400_000

/** The project days: fewer runs at weekends and in July, a slow climb through the year, and a bad week for juniper in March. */
export const RUN_DAYS: RunDay[] = (() => {
    const random = seeded(11)
    const rows: RunDay[] = []
    for (let time = Date.UTC(2026, 0, 1); time <= Date.UTC(2026, 9, 31); time += DAY) {
        const date = new Date(time)
        const weekday = (date.getUTCDay() + 6) % 7
        const day = iso(time)
        const month = date.getUTCMonth()
        for (const project of RUN_PROJECTS) {
            const shape = SHAPE[project]
            const weekend = weekday >= 5 ? 0.35 : 1
            const summer = month === 6 ? 0.7 : 1
            const runs = Math.round(shape.runs * weekend * summer * (1 + month * 0.04) * (0.75 + random() * 0.5))
            const incident = project === 'juniper' && day >= '2026-03-16' && day <= '2026-03-20' ? 0.45 : 0
            const failed = Math.min(runs, Math.round(runs * (shape.fails + incident) * (0.4 + random() * 1.2)))
            const p50 = Math.round(shape.seconds * (0.85 + random() * 0.3) * (1 + incident))
            rows.push({
                day,
                week: iso(time - weekday * DAY),
                month: day.slice(0, 7),
                project,
                runs,
                failed,
                rows: Math.round((runs - failed) * shape.seconds * (8 + random() * 4)),
                p10: Math.round(p50 * (0.45 + random() * 0.15)),
                p50,
                p90: Math.round(p50 * (1.5 + random() * 0.6)),
                workers: shape.pool.filter(([from]) => from <= day).at(-1)?.[1] ?? 0,
            })
        }
    }
    return rows
})()
