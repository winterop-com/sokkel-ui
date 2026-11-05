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

/** The next times the expression fires after `from`, in UTC; fewer when none come within eight years. */
export function nextRuns(expression: string | Cron, from: Date, count = 5): Date[] {
    const cron = typeof expression === 'string' ? parseCron(expression) : expression
    if (cron === null) return []
    const runs: Date[] = []
    const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
    for (let offset = 0; offset < 366 * 8 && runs.length < count; offset++) {
        const day = new Date(start + offset * 86_400_000)
        if (!dayMatches(cron, day)) continue
        for (const hour of cron.hours) {
            for (const minute of cron.minutes) {
                const at = new Date(day.getTime() + hour * 3_600_000 + minute * 60_000)
                if (at.getTime() > from.getTime()) runs.push(at)
                if (runs.length === count) return runs
            }
        }
    }
    return runs
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

const pad = (number: number) => String(number).padStart(2, '0')

function list(words: readonly string[]): string {
    if (words.length <= 1) return words.join('')
    return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
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

function weekdays(days: readonly number[]): string {
    if (days.length === 5 && days.join() === '1,2,3,4,5') return 'on weekdays'
    if (days.length === 2 && days.join() === '0,6') return 'on weekends'
    const order = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    if (contiguous(order.map((d) => (d + 6) % 7))) return `on ${DAY_NAMES[order[0]]} to ${DAY_NAMES[order[order.length - 1]]}`
    return `on ${list(order.map((d) => DAY_NAMES[d]))}`
}

function ordinal(number: number): string {
    const tens = number % 100
    if (tens >= 11 && tens <= 13) return `${String(number)}th`
    return `${String(number)}${['th', 'st', 'nd', 'rd'][number % 10] ?? 'th'}`
}

/**
 * The expression read back in plain English: "Every weekday at 02:00". Null when it is not a cron
 * expression. An app in another language passes its own reader where this one is offered.
 */
export function describeCron(expression: string): string | null {
    const cron = parseCron(expression)
    if (cron === null) return null
    const everyMinute = cron.minutes.length === 60
    const everyHour = cron.hours.length === 24
    const minuteStep = stepOf(cron.minutes, 0, 59)
    const hourStep = stepOf(cron.hours, 0, 23)

    let time: string
    if (everyMinute && everyHour) time = 'every minute'
    else if (minuteStep !== null && everyHour) time = `every ${String(minuteStep)} minutes`
    else if (cron.minutes.length === 1 && everyHour)
        time = cron.minutes[0] === 0 ? 'every hour, on the hour' : `every hour at ${String(cron.minutes[0])} minutes past`
    else if (cron.minutes.length === 1 && hourStep !== null)
        time = `every ${String(hourStep)} hours${cron.minutes[0] === 0 ? '' : ` at ${String(cron.minutes[0])} minutes past`}`
    else if (cron.minutes.length === 1 && contiguous(cron.hours))
        time = `every hour from ${pad(cron.hours[0])}:${pad(cron.minutes[0])} to ${pad(cron.hours[cron.hours.length - 1])}:${pad(cron.minutes[0])}`
    else if (cron.hours.length * cron.minutes.length <= 4)
        time = `at ${list(cron.hours.flatMap((hour) => cron.minutes.map((minute) => `${pad(hour)}:${pad(minute)}`)))}`
    else if (minuteStep !== null && contiguous(cron.hours))
        time = `every ${String(minuteStep)} minutes from ${pad(cron.hours[0])}:00 to ${pad(cron.hours[cron.hours.length - 1])}:59`
    else time = `at minute ${list(cron.minutes.map(String))} of hour ${list(cron.hours.map(String))}`

    const parts: string[] = []
    if (!cron.anyDay) parts.push(`on the ${list(cron.days.map(ordinal))}`)
    if (!cron.anyWeekday) parts.push(weekdays(cron.weekdays))
    let day = parts.join(' or ')
    if (day === '' && !time.startsWith('every')) day = 'every day'
    const month = cron.months.length === 12 ? '' : `in ${list(cron.months.map((m) => MONTH_NAMES[m - 1]))}`

    const sentence = day === 'every day' ? `every day ${time}` : [time, day, month].filter((part) => part !== '').join(' ')
    const full = day === 'every day' && month !== '' ? `${sentence} ${month}` : sentence
    return full.charAt(0).toUpperCase() + full.slice(1)
}
