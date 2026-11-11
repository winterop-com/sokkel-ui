/**
 * Orders imported per week by Tidevann's import-orders job, and a forecast of them: twelve weeks
 * observed from June 1, 2026, then eight weeks forecast from August 24 as the median and the 10th,
 * 25th, 75th and 90th percentiles, with the four weeks observed since. One row per project and
 * week; a field a week lacks is null. Worked out from fixed shapes, so every story draws the same.
 */

/** One project's week. */
export interface OrderWeek {
    [field: string]: unknown
    /** The Monday that starts the week, written as `Jun 1`. */
    week: string
    project: 'harbor' | 'larkspur'
    /** The orders imported that week, null for a week still to come. */
    observed: number | null
    /** The forecast's median and percentiles, null for a week before the forecast. */
    median: number | null
    q10: number | null
    q25: number | null
    q75: number | null
    q90: number | null
    /** How many weeks ahead of the last observed week the forecast reaches, null for a week before the forecast. */
    ahead: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** The Monday `weeks` after June 1, 2026, written as `Aug 24`. */
function weekLabel(weeks: number): string {
    let month = 5
    let day = 1 + weeks * 7
    while (day > MONTH_DAYS[month]) {
        day -= MONTH_DAYS[month]
        month += 1
    }
    return `${MONTHS[month]} ${String(day)}`
}

/** The weeks observed before the forecast starts, and the weeks it covers. */
const HISTORY = 12
const AHEAD = 8

/** Each project's level, weekly growth and swing, and how far its observed weeks fell off its typical week. */
const SHAPES = {
    harbor: {
        level: 4200,
        growth: 45,
        swing: 260,
        spread: 120,
        off: [-90, 140, 60, -170, 30, 210, -40, -120, 80, 150, -60, 20, -80, 150, 310, -60],
    },
    larkspur: {
        level: 2600,
        growth: 22,
        swing: 140,
        spread: 80,
        off: [40, -60, 90, 20, -110, 60, 130, -30, -70, 50, 10, -40, 70, -120, 40, 160],
    },
} as const

const typical = (shape: (typeof SHAPES)[keyof typeof SHAPES], week: number) =>
    Math.round(shape.level + shape.growth * week + shape.swing * Math.sin(week * 0.9))

/** The z-scores of the 10th and 25th percentiles of a normal spread. */
const Z10 = 1.2816
const Z25 = 0.6745

export const ORDER_WEEKS: OrderWeek[] = (Object.keys(SHAPES) as (keyof typeof SHAPES)[]).flatMap((project) => {
    const shape = SHAPES[project]
    return Array.from({ length: HISTORY + AHEAD }, (_, week): OrderWeek => {
        const middle = typical(shape, week)
        const observed = week < shape.off.length ? middle + shape.off[week] : null
        if (week < HISTORY)
            return { week: weekLabel(week), project, observed, median: null, q10: null, q25: null, q75: null, q90: null, ahead: null }
        const spread = shape.spread + 45 * (week - HISTORY + 1)
        return {
            week: weekLabel(week),
            project,
            observed,
            median: middle,
            q10: Math.round(middle - Z10 * spread),
            q25: Math.round(middle - Z25 * spread),
            q75: Math.round(middle + Z25 * spread),
            q90: Math.round(middle + Z10 * spread),
            ahead: week - HISTORY + 1,
        }
    })
})

/** Harbor's weeks alone, for a chart of one forecast. */
export const HARBOR_ORDER_WEEKS = ORDER_WEEKS.filter((row) => row.project === 'harbor')

/** The week the forecast starts. */
export const FORECAST_START = weekLabel(HISTORY)
