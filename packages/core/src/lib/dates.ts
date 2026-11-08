/**
 * Dates and times as the library's fields carry them: ISO strings with no zone. A date is
 * `YYYY-MM-DD`, a time `HH:mm` (or `HH:mm:ss`), and a date and time the two joined by `T`, as
 * `2026-11-09T02:00`: a time on the wall clock, read in whatever zone the app says it is in. Each is
 * written for a reader in one format and read back from what is typed by that format alone.
 */

/**
 * How a date is written for a reader: `YYYY`, `MM` and `DD` in their order with the marks between
 * them, as `DD.MM.YYYY` or `MM/DD/YYYY`. `M` and `D` write the month and the day without a leading
 * zero.
 */
export type DateFormat = string

/** The date format every field uses unless told otherwise. */
export const ISO_DATE: DateFormat = 'YYYY-MM-DD'

/** How a time is written: on a 24 or a 12-hour clock, with or without seconds, and the 12-hour clock's words for before and after noon. */
export interface TimeFormat {
    clock?: 12 | 24
    seconds?: boolean
    periods?: readonly [string, string]
}

const TOKENS = /YYYY|MM|M|DD|D/g
const pad = (number: number) => String(number).padStart(2, '0')

/** The number of days in a month, counted from 1 for January. */
export function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

/** A date written for a reader in `format`: `2026-11-09` as `09.11.2026`. */
export function formatDate(value: string, format: DateFormat = ISO_DATE): string {
    const [year, month, day] = value.split('-')
    const part: Record<string, string> = { YYYY: year, MM: month, M: String(Number(month)), DD: day, D: String(Number(day)) }
    return format.replace(TOKENS, (token) => part[token])
}

/**
 * The date typed in `text`, as `YYYY-MM-DD`, or null when it is not one. The year, month and day
 * are read in the format's order, split by any of `- . /` or spaces, or as eight digits in a row; a
 * year written first is read as year, month, day in any format, so a pasted ISO date always reads.
 * The year takes four digits, and the day must be in its month.
 */
export function readDate(text: string, format: DateFormat = ISO_DATE): string | null {
    const typed = text.trim()
    const order = [...format.matchAll(TOKENS)].map((match) => match[0][0])
    let parts: string[]
    if (/^\d{8}$/.test(typed)) {
        let at = 0
        parts = order.map((part) => {
            const width = part === 'Y' ? 4 : 2
            at += width
            return typed.slice(at - width, at)
        })
    } else if (/^\d+([-./\s]+\d+){2}$/.test(typed)) {
        parts = typed.split(/[-./\s]+/)
    } else return null
    const by: Record<string, string> = parts[0].length === 4 ? { Y: parts[0], M: parts[1], D: parts[2] } : {}
    if (parts[0].length !== 4) order.forEach((part, index) => (by[part] = parts[index]))
    if (by.Y?.length !== 4 || by.M === undefined || by.D === undefined || by.M.length > 2 || by.D.length > 2) return null
    const [year, month, day] = [Number(by.Y), Number(by.M), Number(by.D)]
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
    return `${by.Y}-${pad(month)}-${pad(day)}`
}

/** A time written for a reader: `14:30`, or `2:30 PM` on a 12-hour clock. */
export function formatTime(value: string, { clock = 24, seconds = false, periods = ['AM', 'PM'] }: TimeFormat = {}): string {
    const [hours, minutes, secs = '00'] = value.split(':')
    const tail = seconds ? `:${secs}` : ''
    if (clock === 24) return `${hours}:${minutes}${tail}`
    const hour = Number(hours)
    return `${String(hour % 12 === 0 ? 12 : hour % 12)}:${minutes}${tail} ${periods[hour < 12 ? 0 : 1]}`
}

/**
 * The time typed in `text`, as `HH:mm` (`HH:mm:ss` with `seconds`), or null when it is not one.
 * Hours, minutes and seconds are split by `:` or `.`, or typed as digits in a row (`930`, `0930`);
 * minutes and seconds take two digits. A period word at the end (`pm`, or its first letter) reads
 * the hour on a 12-hour clock, whichever clock the field writes; without one the hour is read
 * from 0 to 23. Seconds are read only when the time takes them.
 */
export function readTime(text: string, { seconds = false, periods = ['AM', 'PM'] }: TimeFormat = {}): string | null {
    const plain = (word: string) => word.toLowerCase().replaceAll('.', '')
    const match = /^(.*?)\s*([a-z.]+)?$/i.exec(text.trim())
    if (match === null) return null
    let period: number | null = null
    if (match[2] !== undefined) {
        const said = plain(match[2])
        period = periods.findIndex((word) => plain(word) === said || plain(word)[0] === said)
        if (period < 0) return null
    }
    const time = match[1]
    let parts: string[]
    if (/^\d{1,6}$/.test(time))
        parts =
            time.length <= 2
                ? [time]
                : time.length <= 4
                  ? [time.slice(0, -2), time.slice(-2)]
                  : [time.slice(0, -4), time.slice(-4, -2), time.slice(-2)]
    else if (/^\d{1,2}([:.]\d{2}){1,2}$/.test(time)) parts = time.split(/[:.]/)
    else return null
    if (parts.length === 3 && !seconds) return null
    let hour = Number(parts[0])
    const [minute, second] = [Number(parts[1] ?? 0), Number(parts[2] ?? 0)]
    if (period !== null) {
        if (hour < 1 || hour > 12) return null
        hour = (hour % 12) + (period === 1 ? 12 : 0)
    }
    if (hour > 23 || minute > 59 || second > 59) return null
    return `${pad(hour)}:${pad(minute)}${seconds ? `:${pad(second)}` : ''}`
}

/** A date and time written for a reader: the date, a space, the time. */
export function formatDateTime(value: string, date: DateFormat = ISO_DATE, time: TimeFormat = {}): string {
    return `${formatDate(value.slice(0, 10), date)} ${formatTime(value.slice(11), time)}`
}

/**
 * The date and time typed in `text`, as `YYYY-MM-DDTHH:mm` (with `:ss` when the time takes
 * seconds), or null when it is not one: a date as `readDate` reads it, then a space, a comma or a
 * `T`, then a time as `readTime` reads it. Both are needed.
 */
export function readDateTime(text: string, date: DateFormat = ISO_DATE, time: TimeFormat = {}): string | null {
    const match = /^(\S+?)(?:\s*[Tt,]\s*|\s+)(\S.*)$/.exec(text.trim())
    if (match === null) return null
    const day = readDate(match[1], date)
    const clock = readTime(match[2], time)
    return day === null || clock === null ? null : `${day}T${clock}`
}

/** A date, a time or a date and time with its seconds written out, so two of a kind compare as text. */
const whole = (value: string) => (/(^|T)\d\d:\d\d$/.test(value) ? `${value}:00` : value)

/** Whether `value` comes before `other`: two dates, two times, or two dates and times. */
export function isBefore(value: string, other: string): boolean {
    return whole(value) < whole(other)
}

/** A time, or a date and time, with seconds when `seconds` and without them when not: `08:00` as `08:00:00`. */
export function fitSeconds<T extends string | undefined>(value: T, seconds: boolean): T {
    if (value === undefined) return value
    const short = /(^|T)\d\d:\d\d$/.test(value)
    return (seconds ? (short ? `${value}:00` : value) : short ? value : value.slice(0, -3)) as T
}

/** A day as the library's fields carry it, read off a `Date` in the zone it is shown in. */
export function isoDate(date: Date): string {
    return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A `YYYY-MM-DD` day as a `Date` at its local midnight, for a calendar that draws `Date`s. */
export function dateOf(value: string): Date {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

/** The times of a day every `step` minutes from midnight, as `HH:mm`. */
export function timesOfDay(step = 30): string[] {
    const times: string[] = []
    for (let minutes = 0; minutes < 24 * 60; minutes += Math.max(1, Math.round(step)))
        times.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
    return times
}
