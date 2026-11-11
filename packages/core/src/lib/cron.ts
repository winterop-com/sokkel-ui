/** A five-field cron expression, each field read into the values it allows. */
export interface Cron {
    minutes: readonly number[]
    hours: readonly number[]
    days: readonly number[]
    months: readonly number[]
    weekdays: readonly number[]
    /** Whether the day of the month and the weekday were each written as `*`. */
    anyDay: boolean
    anyWeekday: boolean
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const FIELDS = [
    { min: 0, max: 59, names: [] as string[], offset: 0 },
    { min: 0, max: 23, names: [] as string[], offset: 0 },
    { min: 1, max: 31, names: [] as string[], offset: 0 },
    { min: 1, max: 12, names: MONTHS, offset: 1 },
    { min: 0, max: 7, names: WEEKDAYS, offset: 0 },
] as const

function value(text: string, field: (typeof FIELDS)[number]): number | null {
    const named = field.names.indexOf(text.toLowerCase())
    if (named >= 0) return named + field.offset
    if (!/^\d+$/.test(text)) return null
    const number = Number(text)
    return number >= field.min && number <= field.max ? number : null
}

function field(text: string, at: (typeof FIELDS)[number]): number[] | null {
    const out = new Set<number>()
    for (const part of text.split(',')) {
        const [range, stepText, extra] = part.split('/')
        if (extra !== undefined || range === '') return null
        const step = stepText === undefined ? 1 : /^\d+$/.test(stepText) ? Number(stepText) : 0
        if (step < 1) return null
        let from: number
        let to: number
        if (range === '*') {
            from = at.min
            to = at.max
        } else {
            const [low, high, more] = range.split('-')
            if (more !== undefined) return null
            const start = value(low, at)
            const end = high === undefined ? (stepText === undefined ? start : at.max) : value(high, at)
            if (start === null || end === null || end < start) return null
            from = start
            to = end
        }
        for (let v = from; v <= to; v += step) out.add(v)
    }
    return [...out].sort((a, b) => a - b)
}

/** Reads a five-field cron expression, or null when it is not one. Names such as `mon` and `jan` are allowed. */
export function parseCron(expression: string): Cron | null {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return null
    const read = parts.map((part, index) => field(part, FIELDS[index]))
    if (read.some((one) => one === null)) return null
    const [minutes, hours, days, months, weekdays] = read as number[][]
    return {
        minutes,
        hours,
        days,
        months,
        weekdays: [...new Set(weekdays.map((day) => day % 7))].sort((a, b) => a - b),
        anyDay: parts[2] === '*',
        anyWeekday: parts[4] === '*',
    }
}

function dayMatches(cron: Cron, date: Date): boolean {
    if (!cron.months.includes(date.getUTCMonth() + 1)) return false
    const day = cron.days.includes(date.getUTCDate())
    const weekday = cron.weekdays.includes(date.getUTCDay())
    if (cron.anyDay && cron.anyWeekday) return true
    if (cron.anyDay) return weekday
    if (cron.anyWeekday) return day
    return day || weekday
}

/** A wall-clock time in a zone: the month counts from 1, the weekday from Sunday as 0. */
export interface ZonedTime {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    weekday: number
}

const MINUTE = 60_000
const DAY = 86_400_000
const formats = new Map<string, Intl.DateTimeFormat>()

function formatFor(timeZone: string): Intl.DateTimeFormat {
    let format = formats.get(timeZone)
    if (format === undefined) {
        format = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })
        formats.set(timeZone, format)
    }
    return format
}

/** The wall-clock time of an instant in an IANA zone; UTC when no zone is given. */
export function zonedTime(date: Date, timeZone?: string): ZonedTime {
    if (timeZone === undefined || timeZone === 'UTC') {
        return {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes(),
            weekday: date.getUTCDay(),
        }
    }
    const parts: Record<string, number> = {}
    for (const part of formatFor(timeZone).formatToParts(date)) if (part.type !== 'literal') parts[part.type] = Number(part.value)
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
    return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, weekday }
}

/** How far a zone's wall clock is ahead of UTC at an instant, in milliseconds, to the minute. */
export function zoneOffset(date: Date, timeZone?: string): number {
    if (timeZone === undefined || timeZone === 'UTC') return 0
    const at = zonedTime(date, timeZone)
    return Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute) - Math.floor(date.getTime() / MINUTE) * MINUTE
}

/**
 * The instant a wall-clock time, written as a UTC timestamp, names in a zone whose offset is
 * `before` on the day before and `after` on the day after. A time the clock skips is moved to the
 * instant the clock jumps; a time the clock passes twice is its first pass.
 */
function instantOf(wall: number, before: number, after: number, timeZone: string): number {
    if (before === after) return wall - before
    const passes = [wall - before, wall - after].filter((at) => at + zoneOffset(new Date(at), timeZone) === wall)
    if (passes.length > 0) return Math.min(...passes)
    let low = Math.min(wall - before, wall - after)
    let high = Math.max(wall - before, wall - after)
    while (high - low > MINUTE) {
        const middle = low + Math.floor((high - low) / 2 / MINUTE) * MINUTE
        if (zoneOffset(new Date(middle), timeZone) === after) high = middle
        else low = middle
    }
    return high
}

/**
 * The next times the expression fires after `from`, fewer when none come within eight years. The
 * expression is read as wall-clock time in `timeZone`, an IANA name such as Europe/Oslo, and in UTC
 * without one. Across a change of clocks it does what Vixie cron and cronie do: a time the clock
 * skips in spring runs once, at the instant the clock jumps (02:30 runs at 03:00), and a time the
 * clock passes twice in autumn runs once, at its first pass.
 */
export function nextRuns(expression: string | Cron, from: Date, count = 5, timeZone?: string): Date[] {
    const cron = typeof expression === 'string' ? parseCron(expression) : expression
    if (cron === null) return []
    const zone = timeZone === 'UTC' ? undefined : timeZone
    const runs: Date[] = []
    const local = zonedTime(from, zone)
    const start = Date.UTC(local.year, local.month - 1, local.day)
    for (let offset = 0; offset < 366 * 8 && runs.length < count; offset++) {
        const day = start + offset * DAY
        if (!dayMatches(cron, new Date(day))) continue
        const before = zoneOffset(new Date(day - DAY / 2), zone)
        const after = zoneOffset(new Date(day + DAY * 1.5), zone)
        for (const hour of cron.hours) {
            for (const minute of cron.minutes) {
                const wall = day + hour * 3_600_000 + minute * MINUTE
                const at = zone === undefined ? wall : instantOf(wall, before, after, zone)
                const last = runs.at(-1)
                if (at > from.getTime() && (last === undefined || at > last.getTime())) runs.push(new Date(at))
                if (runs.length === count) return runs
            }
        }
    }
    return runs
}

const pad = (number: number) => String(number).padStart(2, '0')

function ordinal(number: number): string {
    const tens = number % 100
    if (tens >= 11 && tens <= 13) return `${String(number)}th`
    return `${String(number)}${['th', 'st', 'nd', 'rd'][number % 10] ?? 'th'}`
}

/**
 * The words `describeCron` reads an expression back in, a phrase at a time. Times come to them as
 * `02:00`, and days of the week and months by their names in `dayNames` and `monthNames`. A list
 * comes to a phrase already joined with `separator` and `lastSeparator`, so every word is a string
 * an app's catalogue holds.
 */
export interface CronWords {
    /** The days of the week, Sunday first. */
    dayNames: readonly string[]
    monthNames: readonly string[]
    /** Between the items of a list but the last two: the ", " of "Monday, Tuesday and Friday". */
    separator: string
    /** Between the last two items of a list: the " and " of "Monday, Tuesday and Friday". */
    lastSeparator: string
    /** A day of the month as an ordinal: "1st". */
    ordinal: (day: number) => string
    everyMinute: string
    everyMinutes: (step: number) => string
    /** Once an hour, at a minute past it, 0 being on the hour. */
    everyHour: (minute: number) => string
    /** Every few hours from midnight, at a minute past each. */
    everyHours: (step: number, minute: number) => string
    /** Once an hour between two times. */
    hourly: (from: string, to: string) => string
    /** At a few times of day, joined: "02:00 and 14:00". */
    at: (times: string) => string
    /** Every few minutes between two times. */
    minutesBetween: (step: number, from: string, to: string) => string
    /** Any other set of minutes and hours, each joined. */
    minutesOfHours: (minutes: string, hours: string) => string
    /** Times of day, on every day: "every day at 02:00". */
    daily: (time: string) => string
    /** Days of the month as ordinals, joined: "1st and 15th". */
    onDays: (days: string) => string
    weekdays: string
    weekends: string
    /** A run of days of the week: "on Monday to Thursday". */
    weekdayRange: (from: string, to: string) => string
    /** Days of the week by name, joined. */
    onWeekdays: (days: string) => string
    /** Days of the month or days of the week, when the expression names both. */
    either: (days: string, weekdays: string) => string
    /** Months by name, joined. */
    inMonths: (months: string) => string
    /** Puts the parts that apply together as a sentence. */
    sentence: (parts: readonly string[]) => string
}

/** The English words `describeCron` uses when given none. */
export const CRON_WORDS: CronWords = {
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    separator: ', ',
    lastSeparator: ' and ',
    ordinal,
    everyMinute: 'every minute',
    everyMinutes: (step) => `every ${String(step)} minutes`,
    everyHour: (minute) => (minute === 0 ? 'every hour, on the hour' : `every hour at ${String(minute)} minutes past`),
    everyHours: (step, minute) => `every ${String(step)} hours${minute === 0 ? '' : ` at ${String(minute)} minutes past`}`,
    hourly: (from, to) => `every hour from ${from} to ${to}`,
    at: (times) => `at ${times}`,
    minutesBetween: (step, from, to) => `every ${String(step)} minutes from ${from} to ${to}`,
    minutesOfHours: (minutes, hours) => `at minute ${minutes} of hour ${hours}`,
    daily: (time) => `every day ${time}`,
    onDays: (days) => `on the ${days}`,
    weekdays: 'on weekdays',
    weekends: 'on weekends',
    weekdayRange: (from, to) => `on ${from} to ${to}`,
    onWeekdays: (days) => `on ${days}`,
    either: (days, weekdays) => `${days} or ${weekdays}`,
    inMonths: (months) => `in ${months}`,
    sentence: (parts) => {
        const full = parts.join(' ')
        return full.charAt(0).toUpperCase() + full.slice(1)
    },
}

/** A run of whole numbers with an even step from the field's start, as `*` or `a-b/n` writes it. */
function stepOf(values: readonly number[], min: number, max: number): number | null {
    if (values.length < 2 || values[0] !== min) return null
    const step = values[1] - values[0]
    if (values.some((v, index) => v !== min + index * step)) return null
    return max - values[values.length - 1] < step ? step : null
}

function contiguous(values: readonly number[]): boolean {
    return values.length > 2 && values.every((v, index) => index === 0 || v === values[index - 1] + 1)
}

/** A list joined in the words' separators. */
function joined(items: readonly string[], words: CronWords): string {
    if (items.length <= 1) return items.join('')
    return items.slice(0, -1).join(words.separator) + words.lastSeparator + items[items.length - 1]
}

function weekdays(days: readonly number[], words: CronWords): string {
    if (days.length === 5 && days.join() === '1,2,3,4,5') return words.weekdays
    if (days.length === 2 && days.join() === '0,6') return words.weekends
    const order = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    if (contiguous(order.map((d) => (d + 6) % 7)))
        return words.weekdayRange(words.dayNames[order[0]], words.dayNames[order[order.length - 1]])
    return words.onWeekdays(
        joined(
            order.map((d) => words.dayNames[d]),
            words,
        ),
    )
}

/**
 * The expression read back in words, English by default: "At 02:00 on weekdays". Null when it is
 * not a five-field cron expression. `words` puts it in another language, a phrase at a time.
 */
export function describeCron(expression: string, words?: Partial<CronWords>): string | null {
    const cron = parseCron(expression)
    if (cron === null) return null
    const said: CronWords = { ...CRON_WORDS, ...words }
    const everyMinute = cron.minutes.length === 60
    const everyHour = cron.hours.length === 24
    const minuteStep = stepOf(cron.minutes, 0, 59)
    const hourStep = stepOf(cron.hours, 0, 23)
    const clock = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`
    const first = cron.hours[0]
    const last = cron.hours[cron.hours.length - 1]
    const times = cron.hours.length * cron.minutes.length

    let time: string
    let recurs = true
    if (everyMinute && everyHour) time = said.everyMinute
    else if (minuteStep !== null && everyHour) time = said.everyMinutes(minuteStep)
    else if (cron.minutes.length === 1 && everyHour) time = said.everyHour(cron.minutes[0])
    else if (cron.minutes.length === 1 && hourStep !== null) time = said.everyHours(hourStep, cron.minutes[0])
    else if (cron.minutes.length === 1 && contiguous(cron.hours))
        time = said.hourly(clock(first, cron.minutes[0]), clock(last, cron.minutes[0]))
    else if (times > 4 && minuteStep !== null && contiguous(cron.hours))
        time = said.minutesBetween(minuteStep, clock(first, 0), clock(last, 59))
    else {
        recurs = false
        time =
            times <= 4
                ? said.at(
                      joined(
                          cron.hours.flatMap((hour) => cron.minutes.map((minute) => clock(hour, minute))),
                          said,
                      ),
                  )
                : said.minutesOfHours(joined(cron.minutes.map(String), said), joined(cron.hours.map(String), said))
    }

    const days = cron.anyDay ? '' : said.onDays(joined(cron.days.map(said.ordinal), said))
    const week = cron.anyWeekday ? '' : weekdays(cron.weekdays, said)
    const day = days !== '' && week !== '' ? said.either(days, week) : days + week
    const month =
        cron.months.length === 12
            ? ''
            : said.inMonths(
                  joined(
                      cron.months.map((m) => said.monthNames[m - 1]),
                      said,
                  ),
              )
    const lead = day === '' && !recurs ? said.daily(time) : time
    return said.sentence([lead, day, month].filter((part) => part !== ''))
}
