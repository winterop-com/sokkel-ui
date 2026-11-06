/** Fixed, neutral data for the scorecard, combined, share and radar stories: Tidevann's runs over twelve weeks, by place and by project. */

/** The weeks covered, oldest first. */
export const WEEKS = ['W14', 'W15', 'W16', 'W17', 'W18', 'W19', 'W20', 'W21', 'W22', 'W23', 'W24', 'W25'] as const

/** Runs finished each week, by state. */
export const WEEKLY_BY_STATE = {
    succeeded: [21840, 22410, 23120, 22980, 24150, 25020, 24610, 25880, 26340, 25910, 27120, 27850],
    failed: [412, 388, 455, 602, 371, 344, 498, 362, 331, 356, 318, 297],
    cancelled: [120, 134, 118, 141, 126, 119, 152, 131, 124, 117, 129, 122],
    skipped: [260, 248, 271, 255, 266, 282, 259, 274, 288, 279, 291, 296],
} as const

/** Runs finished each week, every state together. */
export const WEEKLY_RUNS: number[] = WEEKS.map((_, index) => Object.values(WEEKLY_BY_STATE).reduce((sum, values) => sum + values[index], 0))

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

/** The share of each week's runs that failed, in percent. */
export const WEEKLY_FAILURE_RATE: number[] = WEEKS.map((_, index) => round((WEEKLY_BY_STATE.failed[index] / WEEKLY_RUNS[index]) * 100, 2))

/** The share of each week's runs that succeeded, in percent. */
export const WEEKLY_SUCCESS_RATE: number[] = WEEKS.map((_, index) =>
    round((WEEKLY_BY_STATE.succeeded[index] / WEEKLY_RUNS[index]) * 100, 1),
)

/** The failure rate aimed for, each week. */
export const FAILURE_TARGET: number[] = WEEKS.map(() => 1.5)

/** The jobs, and how their runs this week ended. */
export const SHARE_JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const

export const JOB_STATES = {
    succeeded: [682, 4210, 318, 1904, 5120],
    failed: [14, 182, 41, 12, 96],
    cancelled: [6, 38, 22, 4, 51],
    skipped: [28, 95, 12, 160, 44],
} as const

/** The months a scorecard covers. */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const

/** Runs each month, by project. */
export const PROJECT_MONTHLY = {
    harbor: [41200, 43800, 39600, 45100, 52300, 55800],
    juniper: [28400, 27100, 33900, 36200, 34800, 31500],
    larkspur: [12100, 15800, 19400, 24700, 29900, 35200],
} as const

/** A site's success rate in each month, in percent, with the region it is in. */
export const SITES: { site: string; region: string; rates: (number | null)[] }[] = [
    { site: 'Oslo', region: 'Europe', rates: [98.4, 98.9, 97.2, 98.1, 99.0, 99.2] },
    { site: 'Lisbon', region: 'Europe', rates: [96.1, 95.4, 96.8, 97.3, 97.1, 98.0] },
    { site: 'Vienna', region: 'Europe', rates: [99.1, 99.3, 99.0, 98.7, 99.4, 99.5] },
    { site: 'Toronto', region: 'Americas', rates: [93.8, 92.1, 89.6, 91.4, 94.2, 95.7] },
    { site: 'Lima', region: 'Americas', rates: [null, 88.2, 90.5, 92.8, 93.1, 96.4] },
    { site: 'Osaka', region: 'Asia', rates: [97.8, 98.2, 98.6, 97.9, 98.8, 99.1] },
    { site: 'Pune', region: 'Asia', rates: [91.2, 93.6, 95.1, 94.4, 96.2, 97.4] },
]

/** Each job's figures this week, by measure. */
export const JOB_MEASURES: { job: string; success: number; p90: number; failures: number; freshness: number | null }[] = [
    { job: 'nightly-export', success: 97.2, p90: 48.1, failures: 14, freshness: 22 },
    { job: 'sync-inventory', success: 94.8, p90: 12.4, failures: 182, freshness: 6 },
    { job: 'rebuild-index', success: 81.4, p90: 210.5, failures: 41, freshness: 95 },
    { job: 'send-digest', success: 99.4, p90: 3.2, failures: 12, freshness: null },
    { job: 'import-orders', success: 97.4, p90: 27.8, failures: 96, freshness: 11 },
]

/** What each project scores on five measures, from 0 to 100. */
export const PROJECT_SPOKES = ['Success', 'Speed', 'Freshness', 'Coverage', 'Cost'] as const

export const PROJECT_SCORES: Record<'harbor' | 'juniper' | 'larkspur', number[]> = {
    harbor: [96, 72, 88, 64, 70],
    juniper: [84, 91, 62, 80, 58],
    larkspur: [90, 58, 76, 92, 84],
}

export const PROJECT_TARGET: number[] = [95, 80, 80, 80, 75]
