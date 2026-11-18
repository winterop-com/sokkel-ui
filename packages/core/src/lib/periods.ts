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
import type { WordMessages, WordsPart } from './words'

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

/**
 * The words a period's label is made of, in English unless an app passes its own: months come to
 * the phrases by their names in `monthNames` (or `shortMonthNames`), numbers as numbers.
 */
export interface PeriodLabelWords {
    monthNames: readonly string[]
    shortMonthNames: readonly string[]
    /** What each type is called: "Daily", "Two-monthly". */
    types: Readonly<Record<PeriodType, string>>
    /** A day: "November 8, 2026". */
    day: (month: string, date: number, year: number) => string
    /** An ISO week, with the Monday it starts on: "Week 45, 2026 (from Mon, Nov 2)". */
    week: (week: number, year: number, startMonth: string, startDate: number) => string
    /** A month: "November 2026". */
    month: (month: string, year: number) => string
    /** Two, three or six months: "November to December 2026". */
    months: (first: string, last: string, year: number) => string
    /** A year: "2026". */
    year: (year: number) => string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const PERIOD_LABEL_WORDS: PeriodLabelWords = {
    monthNames: MONTHS,
    shortMonthNames: MONTHS.map((name) => name.slice(0, 3)),
    types: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        bimonthly: 'Two-monthly',
        quarterly: 'Quarterly',
        sixmonthly: 'Six-monthly',
        yearly: 'Yearly',
    },
    day: (month, date, year) => `${month} ${String(date)}, ${String(year)}`,
    week: (week, year, startMonth, startDate) => `Week ${String(week)}, ${String(year)} (from Mon, ${startMonth} ${String(startDate)})`,
    month: (month, year) => `${month} ${String(year)}`,
    months: (first, last, year) => `${first} to ${last} ${String(year)}`,
    year: (year) => String(year),
}

/** Where a catalog holds a period label's words, and the arguments its phrases name. */
export const PERIOD_LABEL_PART: WordsPart<PeriodLabelWords> = {
    id: 'periodLabel',
    words: PERIOD_LABEL_WORDS,
    args: { day: 'month date year', week: 'week year startMonth startDate', month: 'month year', months: 'first last year', year: 'year' },
}

/** A period label's phrases as ICU messages in English, for the catalog. */
export const PERIOD_LABEL_MESSAGES: WordMessages<PeriodLabelWords> = {
    day: '{month} {date}, {year, number, ::group-off}',
    week: 'Week {week}, {year, number, ::group-off} (from Mon, {startMonth} {startDate})',
    month: '{month} {year, number, ::group-off}',
    months: '{first} to {last} {year, number, ::group-off}',
    year: '{year, number, ::group-off}',
}

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

function make(type: PeriodType, id: string, start: Date, end: Date, label: string): Period {
    return { id, type, label, start: asDay(start), end: asDay(end) }
}

/** The period of a type that holds a day. */
function periodHolding(type: PeriodType, at: Date, w: PeriodLabelWords): Period {
    const year = at.getUTCFullYear()
    const month = at.getUTCMonth() + 1
    if (type === 'daily') return dailyPeriod(year, month, at.getUTCDate(), w)
    if (type === 'weekly') {
        const week = weekOf(at)
        return weeklyPeriod(week.year, week.week, w)
    }
    if (type === 'monthly') return monthlyPeriod(year, month, w)
    if (type === 'bimonthly') return spanPeriod('bimonthly', year, month - ((month - 1) % 2), 2, w)
    if (type === 'quarterly') return spanPeriod('quarterly', year, month - ((month - 1) % 3), 3, w)
    if (type === 'sixmonthly') return spanPeriod('sixmonthly', year, month <= 6 ? 1 : 7, 6, w)
    return make('yearly', String(year), utc(year, 1, 1), utc(year, 12, 31), w.year(year))
}

function dailyPeriod(year: number, month: number, date: number, w: PeriodLabelWords): Period {
    const at = utc(year, month, date)
    return make('daily', `${String(year)}${pad(month)}${pad(date)}`, at, at, w.day(w.monthNames[month - 1], date, year))
}

function weeklyPeriod(year: number, week: number, w: PeriodLabelWords): Period {
    const start = new Date(weekOne(year).getTime() + (week - 1) * 7 * 86_400_000)
    const end = new Date(start.getTime() + 6 * 86_400_000)
    return make(
        'weekly',
        `${String(year)}W${String(week)}`,
        start,
        end,
        w.week(week, year, w.shortMonthNames[start.getUTCMonth()], start.getUTCDate()),
    )
}

function monthlyPeriod(year: number, month: number, w: PeriodLabelWords): Period {
    return make(
        'monthly',
        `${String(year)}${pad(month)}`,
        utc(year, month, 1),
        utc(year, month, lastDate(year, month)),
        w.month(w.monthNames[month - 1], year),
    )
}

/** A run of months from `first`: two, three or six of them. */
function spanPeriod(
    type: 'bimonthly' | 'quarterly' | 'sixmonthly',
    year: number,
    first: number,
    months: number,
    w: PeriodLabelWords,
): Period {
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
        w.months(w.monthNames[first - 1], w.monthNames[last - 1], year),
    )
}

/** The period just before one of the same type. */
function before(period: Period, w: PeriodLabelWords): Period {
    const start = partsOf(period.start)
    if (start === null) return period
    return periodHolding(period.type, new Date(utc(start.year, start.month, start.date).getTime() - 86_400_000), w)
}

/**
 * The recent periods of a type, newest first: the one holding `today` (a `YYYY-MM-DD` day) and as
 * many before it as the type lists (`PERIOD_TYPES[type].recent`), or `count`. `words` labels them
 * in another language.
 */
export function recentPeriods(
    type: PeriodType,
    today: string,
    count: number = PERIOD_TYPES[type].recent,
    words?: Partial<PeriodLabelWords>,
): Period[] {
    const parts = partsOf(today)
    if (parts === null || count <= 0) return []
    const w = { ...PERIOD_LABEL_WORDS, ...words }
    const periods = [periodHolding(type, utc(parts.year, parts.month, parts.date), w)]
    while (periods.length < count) periods.push(before(periods[periods.length - 1], w))
    return periods
}

/** The period that holds a day (`YYYY-MM-DD`), or null for text that is not a day. `words` labels it in another language. */
export function periodOf(type: PeriodType, today: string, words?: Partial<PeriodLabelWords>): Period | null {
    const parts = partsOf(today)
    return parts === null ? null : periodHolding(type, utc(parts.year, parts.month, parts.date), { ...PERIOD_LABEL_WORDS, ...words })
}

/**
 * The period an id names, read by its shape, or null when it names none: a month past 12, a day
 * past the month's end, a week past the year's last, a two-month period on an even month. With
 * `type`, an id of any other type is null too. `words` labels it in another language.
 */
export function parsePeriod(id: string, type?: PeriodType, words?: Partial<PeriodLabelWords>): Period | null {
    const text = id.trim()
    const w = { ...PERIOD_LABEL_WORDS, ...words }
    const read = (): Period | null => {
        let match = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
        if (match !== null) {
            const parts = partsOf(`${match[1]}-${match[2]}-${match[3]}`)
            return parts === null ? null : dailyPeriod(parts.year, parts.month, parts.date, w)
        }
        match = /^(\d{4})W(\d{1,2})$/.exec(text)
        if (match !== null) {
            const [year, week] = [Number(match[1]), Number(match[2])]
            return week >= 1 && week <= weeksIn(year) && !match[2].startsWith('0') ? weeklyPeriod(year, week, w) : null
        }
        match = /^(\d{4})(\d{2})B$/.exec(text)
        if (match !== null) {
            const month = Number(match[2])
            return month >= 1 && month <= 11 && month % 2 === 1 ? spanPeriod('bimonthly', Number(match[1]), month, 2, w) : null
        }
        match = /^(\d{4})(\d{2})$/.exec(text)
        if (match !== null) {
            const month = Number(match[2])
            return month >= 1 && month <= 12 ? monthlyPeriod(Number(match[1]), month, w) : null
        }
        match = /^(\d{4})Q([1-4])$/.exec(text)
        if (match !== null) return spanPeriod('quarterly', Number(match[1]), (Number(match[2]) - 1) * 3 + 1, 3, w)
        match = /^(\d{4})S([12])$/.exec(text)
        if (match !== null) return spanPeriod('sixmonthly', Number(match[1]), Number(match[2]) === 1 ? 1 : 7, 6, w)
        match = /^(\d{4})$/.exec(text)
        if (match !== null) return periodHolding('yearly', utc(Number(match[1]), 1, 1), w)
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

/** Where a catalog holds the sentences a period issue says, and the arguments its phrases name. */
export const PERIOD_ISSUE_PART: WordsPart<PeriodIssueWords> = {
    id: 'periodIssue',
    words: PERIOD_ISSUE_WORDS,
    args: { otherType: 'id its wanted example', notPeriod: 'text wanted example' },
}

/** A period issue's phrases as ICU messages in English, for the catalog. */
export const PERIOD_ISSUE_MESSAGES: WordMessages<PeriodIssueWords> = {
    otherType: '{id} is a {its} period; this one is {wanted}, such as {example}.',
    notPeriod: '{text} is not a period id. A {wanted} period is written like {example}.',
}

/**
 * What is wrong with a typed id for a type, in a sentence, or null when it names a period of that
 * type. The types are named by `words.types` when given, lowercased into the sentence.
 */
export function periodIssue(
    id: string,
    type: PeriodType,
    words: PeriodIssueWords & { types?: PeriodLabelWords['types'] } = PERIOD_ISSUE_WORDS,
): string | null {
    const text = id.trim()
    if (text === '') return words.empty
    if (parsePeriod(text, type) !== null) return null
    const other = parsePeriod(text)
    const named = (of: PeriodType) => (words.types ?? PERIOD_LABEL_WORDS.types)[of].toLowerCase()
    const example = PERIOD_TYPES[type].example
    if (other !== null) return words.otherType(text, named(other.type), named(type), example)
    return words.notPeriod(text, named(type), example)
}
