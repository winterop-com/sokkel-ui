/**
 * Tidevann's runs per month from January 2025 to June 2026, by project: how many ran, how many
 * failed, were cancelled or skipped, and the median seconds a run took. Periods are written as
 * `2025-01`. Worked out from fixed shapes, so every story draws the same.
 */

/** One project's month. */
export interface MonthRuns {
    [field: string]: unknown
    /** The month, written as `2025-01`. */
    period: string
    project: 'harbor' | 'juniper'
    runs: number
    failed: number
    cancelled: number
    skipped: number
    seconds: number
}

const PROJECTS = [
    { project: 'harbor', base: 1180, step: 23, swing: 140 },
    { project: 'juniper', base: 640, step: 11, swing: 90 },
] as const

/** Runs per month by project, eighteen months from 2025-01. */
export const MONTH_RUNS: readonly MonthRuns[] = Array.from({ length: 18 }, (_, at) => {
    const period = `${String(2025 + Math.floor(at / 12))}-${String((at % 12) + 1).padStart(2, '0')}`
    return PROJECTS.map(({ project, base, step, swing }) => {
        const runs = Math.round(base + step * at + swing * Math.sin((at / 12) * 2 * Math.PI))
        return {
            period,
            project,
            runs,
            failed: Math.round(runs * (0.02 + 0.01 * Math.cos(at))),
            cancelled: Math.round(runs * 0.006),
            skipped: Math.round(runs * (0.01 + 0.004 * Math.sin(at * 1.7))),
            seconds: Math.round((41 + 6 * Math.sin(at / 3)) * 10) / 10,
        }
    })
}).flat()
