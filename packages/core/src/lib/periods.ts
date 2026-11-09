/**
 * Reporting periods by their ids: the recent periods of a type, newest first, and any id read back
 * into the period it names. Pure, so `PeriodPicker` and an app's own checks share one reading.
 *
 *   daily       20261108     weekly      2026W45     monthly     202611
 *   bimonthly   202611B      quarterly   2026Q4      sixmonthly  2026S2
 *   yearly      2026
 *
 * A week is an ISO week, starting on a Monday, numbered by the year its Thursday falls in. A
 * two-month period is named by its first month, which is odd. Days are `YYYY-MM-DD`, as the date
 * fields hold them, never a `Date`, so a period never moves across a time zone.
 */

/** The kinds of period a report may be made for. */
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'sixmonthly' | 'yearly'

/** One period: its id, what it is called, and its first and last days as `YYYY-MM-DD`. */
export interface Period {
    id: string
    type: PeriodType
    label: string
    start: string
    end: string
}

/** What each type is called, how many recent periods it lists, and an id of its shape. */
export const PERIOD_TYPES: Readonly<Record<PeriodType, { label: string; recent: number; example: string }>> = {
    daily: { label: 'Daily', recent: 13, example: '20261108' },
    weekly: { label: 'Weekly', recent: 13, example: '2026W45' },
    monthly: { label: 'Monthly', recent: 13, example: '202611' },
    bimonthly: { label: 'Two-monthly', recent: 9, example: '202611B' },
    quarterly: { label: 'Quarterly', recent: 9, example: '2026Q4' },
    sixmonthly: { label: 'Six-monthly', recent: 9, example: '2026S2' },
    yearly: { label: 'Yearly', recent: 6, example: '2026' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (value: number) => String(value).padStart(2, '0')

/** A day as `YYYY-MM-DD`, from its year, month (1 to 12) and day of the month. */
function day(year: number, month: number, date: number): string {
    return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(date)}`
}

/** A `YYYY-MM-DD` day as its year, month and day of the month, read in UTC so no zone moves it. */
function partsOf(text: string): { year: number; month: number; date: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
    if (match === null) return null
    const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const at = new Date(Date.UTC(year, month - 1, date))
    return at.getUTCMonth() === month - 1 && at.getUTCDate() === date ? { year, month, date } : null
}

const utc = (year: number, month: number, date: number) => new Date(Date.UTC(year, month - 1, date))
const asDay = (at: Date) => day(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate())
const lastDate = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** The Monday that starts ISO week 1 of `year`: the week that holds the year's first Thursday. */
function weekOne(year: number): Date {
    const fourth = utc(year, 1, 4)
    const weekday = (fourth.getUTCDay() + 6) % 7
    return new Date(fourth.getTime() - weekday * 86_400_000)
}

/** How many ISO weeks `year` has: 53 when it starts or, in a leap year, ends on a Thursday. */
function weeksIn(year: number): number {
    return Math.round((weekOne(year + 1).getTime() - weekOne(year).getTime()) / (7 * 86_400_000))
}

/** The ISO year and week a day falls in. */
function weekOf(at: Date): { year: number; week: number } {
    const thursday = new Date(at.getTime() + (3 - ((at.getUTCDay() + 6) % 7)) * 86_400_000)
    const year = thursday.getUTCFullYear()
    return { year, week: Math.floor((thursday.getTime() - weekOne(year).getTime()) / (7 * 86_400_000)) + 1 }
}

const SHORT = (at: Date) => `${MONTHS[at.getUTCMonth()].slice(0, 3)} ${String(at.getUTCDate())}`

function make(type: PeriodType, id: string, start: Date, end: Date, label: string): Period {
    return { id, type, label, start: asDay(start), end: asDay(end) }
}

/** The period of a type that holds a day. */
function periodHolding(type: PeriodType, at: Date): Period {
    const year = at.getUTCFullYear()
    const month = at.getUTCMonth() + 1
    if (type === 'daily') return dailyPeriod(year, month, at.getUTCDate())
    if (type === 'weekly') {
        const week = weekOf(at)
        return weeklyPeriod(week.year, week.week)
    }
    if (type === 'monthly') return monthlyPeriod(year, month)
    if (type === 'bimonthly') return spanPeriod('bimonthly', year, month - ((month - 1) % 2), 2)
    if (type === 'quarterly') return spanPeriod('quarterly', year, month - ((month - 1) % 3), 3)
    if (type === 'sixmonthly') return spanPeriod('sixmonthly', year, month <= 6 ? 1 : 7, 6)
    return make('yearly', String(year), utc(year, 1, 1), utc(year, 12, 31), String(year))
}

function dailyPeriod(year: number, month: number, date: number): Period {
    const at = utc(year, month, date)
    return make('daily', `${String(year)}${pad(month)}${pad(date)}`, at, at, `${MONTHS[month - 1]} ${String(date)}, ${String(year)}`)
}

function weeklyPeriod(year: number, week: number): Period {
    const start = new Date(weekOne(year).getTime() + (week - 1) * 7 * 86_400_000)
    const end = new Date(start.getTime() + 6 * 86_400_000)
    return make(
        'weekly',
        `${String(year)}W${String(week)}`,
        start,
        end,
        `Week ${String(week)}, ${String(year)} (from Mon, ${SHORT(start)})`,
    )
}

function monthlyPeriod(year: number, month: number): Period {
    return make(
        'monthly',
        `${String(year)}${pad(month)}`,
        utc(year, month, 1),
        utc(year, month, lastDate(year, month)),
        `${MONTHS[month - 1]} ${String(year)}`,
    )
}

/** A run of months from `first`: two, three or six of them. */
function spanPeriod(type: 'bimonthly' | 'quarterly' | 'sixmonthly', year: number, first: number, months: number): Period {
    const last = first + months - 1
    const id =
        type === 'bimonthly'
            ? `${String(year)}${pad(first)}B`
            : type === 'quarterly'
              ? `${String(year)}Q${String((first - 1) / 3 + 1)}`
              : `${String(year)}S${String((first - 1) / 6 + 1)}`
    return make(
        type,
        id,
        utc(year, first, 1),
        utc(year, last, lastDate(year, last)),
        `${MONTHS[first - 1]} to ${MONTHS[last - 1]} ${String(year)}`,
    )
}

/** The period just before one of the same type. */
function before(period: Period): Period {
    const start = partsOf(period.start)
    if (start === null) return period
    return periodHolding(period.type, new Date(utc(start.year, start.month, start.date).getTime() - 86_400_000))
}

/**
 * The recent periods of a type, newest first: the one holding `today` (a `YYYY-MM-DD` day) and as
 * many before it as the type lists (`PERIOD_TYPES[type].recent`), or `count`.
 */
export function recentPeriods(type: PeriodType, today: string, count: number = PERIOD_TYPES[type].recent): Period[] {
    const parts = partsOf(today)
    if (parts === null || count <= 0) return []
    const periods = [periodHolding(type, utc(parts.year, parts.month, parts.date))]
    while (periods.length < count) periods.push(before(periods[periods.length - 1]))
    return periods
}

/** The period that holds a day (`YYYY-MM-DD`), or null for text that is not a day. */
export function periodOf(type: PeriodType, today: string): Period | null {
    const parts = partsOf(today)
    return parts === null ? null : periodHolding(type, utc(parts.year, parts.month, parts.date))
}

/**
 * The period an id names, read by its shape, or null when it names none: a month past 12, a day
 * past the month's end, a week past the year's last, a two-month period on an even month. With
 * `type`, an id of any other type is null too.
 */
export function parsePeriod(id: string, type?: PeriodType): Period | null {
    const text = id.trim()
    const read = (): Period | null => {
        let match = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
        if (match !== null) {
            const parts = partsOf(`${match[1]}-${match[2]}-${match[3]}`)
            return parts === null ? null : dailyPeriod(parts.year, parts.month, parts.date)
        }
        match = /^(\d{4})W(\d{1,2})$/.exec(text)
        if (match !== null) {
            const [year, week] = [Number(match[1]), Number(match[2])]
            return week >= 1 && week <= weeksIn(year) && !match[2].startsWith('0') ? weeklyPeriod(year, week) : null
        }
        match = /^(\d{4})(\d{2})B$/.exec(text)
        if (match !== null) {
            const month = Number(match[2])
            return month >= 1 && month <= 11 && month % 2 === 1 ? spanPeriod('bimonthly', Number(match[1]), month, 2) : null
        }
        match = /^(\d{4})(\d{2})$/.exec(text)
        if (match !== null) {
            const month = Number(match[2])
            return month >= 1 && month <= 12 ? monthlyPeriod(Number(match[1]), month) : null
        }
        match = /^(\d{4})Q([1-4])$/.exec(text)
        if (match !== null) return spanPeriod('quarterly', Number(match[1]), (Number(match[2]) - 1) * 3 + 1, 3)
        match = /^(\d{4})S([12])$/.exec(text)
        if (match !== null) return spanPeriod('sixmonthly', Number(match[1]), Number(match[2]) === 1 ? 1 : 7, 6)
        match = /^(\d{4})$/.exec(text)
        if (match !== null) return periodHolding('yearly', utc(Number(match[1]), 1, 1))
        return null
    }
    const period = read()
    return period === null || (type !== undefined && period.type !== type) ? null : period
}

/** The sentences `periodIssue` says, in English unless an app passes its own. */
export interface PeriodIssueWords {
    empty: string
    /** An id of another type: the id, its type's label, the type wanted and an id of its shape. */
    otherType: (id: string, its: string, wanted: string, example: string) => string
    /** Text that names no period: the text, the type wanted and an id of its shape. */
    notPeriod: (text: string, wanted: string, example: string) => string
}

export const PERIOD_ISSUE_WORDS: PeriodIssueWords = {
    empty: 'Type a period id.',
    otherType: (id, its, wanted, example) => `${id} is a ${its} period; this one is ${wanted}, such as ${example}.`,
    notPeriod: (text, wanted, example) => `${text} is not a period id. A ${wanted} period is written like ${example}.`,
}

/** What is wrong with a typed id for a type, in a sentence, or null when it names a period of that type. */
export function periodIssue(id: string, type: PeriodType, words: PeriodIssueWords = PERIOD_ISSUE_WORDS): string | null {
    const text = id.trim()
    if (text === '') return words.empty
    if (parsePeriod(text, type) !== null) return null
    const other = parsePeriod(text)
    const want = PERIOD_TYPES[type]
    if (other !== null) return words.otherType(text, PERIOD_TYPES[other.type].label.toLowerCase(), want.label.toLowerCase(), want.example)
    return words.notPeriod(text, want.label.toLowerCase(), want.example)
}
