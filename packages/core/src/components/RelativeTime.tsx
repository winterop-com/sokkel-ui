import { useEffect, useState } from 'react'

import { cn } from '../lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The unit a distance is said in, the largest it holds once, and how many ms that unit is. */
const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * DAY],
    ['month', 30 * DAY],
    ['week', 7 * DAY],
    ['day', DAY],
    ['hour', HOUR],
    ['minute', MINUTE],
]

/** How a time is said relative to now; every option leaves the words as they were when left out. */
export interface RelativeTimeOptions {
    locale?: string
    /** Intl's style: `long` "3 minutes ago", `short` "3 min. ago", `narrow` the shortest. */
    length?: Intl.RelativeTimeFormatStyle
    /** `auto` says "yesterday" and "last week"; `always` keeps to numbers, "1 day ago". */
    numeric?: Intl.RelativeTimeFormatNumeric
    /** How a distance is cut to a whole unit: `trunc` drops the part (89 minutes is 1 hour), `round` takes the nearest. */
    rounding?: 'trunc' | 'round'
    /** Within this many milliseconds either way the time is said as now; a minute when left out. */
    nowWithin?: number
    /** The word for now; Intl's own ("now") when left out. */
    now?: string
    /** Past this many milliseconds either way the time is said as its date rather than a distance. */
    horizon?: number
    /** How the date past the horizon is spelled: Intl options or a function; a medium date when left out. */
    horizonDate?: Intl.DateTimeFormatOptions | ((date: Date) => string)
    /** The zone the date past the horizon is spelled in. */
    timeZone?: string
}

/** A date spelled with Intl options or by the app's own function. */
function spell(date: Date, format: Intl.DateTimeFormatOptions | ((date: Date) => string), locale?: string, timeZone?: string): string {
    return typeof format === 'function' ? format(date) : new Intl.DateTimeFormat(locale, { timeZone, ...format }).format(date)
}

/**
 * `date` said against `now` in words, such as "3 minutes ago" or "in 2 hours": the largest whole
 * unit the distance holds, "now" within a minute, and past a `horizon` the date itself.
 */
export function relativeTime(
    date: Date,
    now: Date,
    {
        locale,
        length = 'long',
        numeric = 'auto',
        rounding = 'trunc',
        nowWithin = MINUTE,
        now: nowWord,
        horizon,
        horizonDate = { dateStyle: 'medium' },
        timeZone,
    }: RelativeTimeOptions = {},
): string {
    const format = new Intl.RelativeTimeFormat(locale, { numeric, style: length })
    const distance = date.getTime() - now.getTime()
    if (Math.abs(distance) < nowWithin) return nowWord ?? format.format(0, 'second')
    if (horizon !== undefined && Math.abs(distance) >= horizon) return spell(date, horizonDate, locale, timeZone)
    // A half rounds away from now either way, so 90 minutes ago and ahead are both 2 hours.
    const cut = rounding === 'round' ? (value: number) => Math.sign(value) * Math.round(Math.abs(value)) : Math.trunc
    for (const [unit, size] of UNITS) {
        const count = cut(distance / size)
        if (count !== 0) return format.format(count, unit)
    }
    return format.format(cut(distance / SECOND), 'second')
}

/** The exact instant a relative time shows on hover: Intl options or the app's own function. */
export function exactTime(
    date: Date,
    {
        locale,
        timeZone,
        exact = { dateStyle: 'full', timeStyle: 'medium' },
    }: { locale?: string; timeZone?: string; exact?: Intl.DateTimeFormatOptions | ((date: Date) => string) } = {},
): string {
    return spell(date, exact, locale, timeZone)
}

/** How long until the words for a date this far off may change, so a clock reads them again. */
export function tickFor(distance: number): number {
    const far = Math.abs(distance)
    if (far < HOUR) return 15 * SECOND
    if (far < DAY) return MINUTE
    return HOUR
}

export interface RelativeTimeWords {
    /** The word for a time within `nowWithin` of now; Intl's own ("now") when left out. */
    now?: string
}

export interface RelativeTimeProps extends Omit<RelativeTimeOptions, 'now' | 'locale' | 'timeZone'> {
    date: Date | string | number
    /** The moment to count from; without it, the clock. */
    now?: Date
    locale?: string
    timeZone?: string
    /** How the exact instant on hover is spelled: Intl options or the app's own function; a full date and time when left out. */
    exact?: Intl.DateTimeFormatOptions | ((date: Date) => string)
    /** False drops its own focus stop, for a time inside a row that is already one (a link); its instant is still its title. */
    focusable?: boolean
    words?: RelativeTimeWords
    className?: string
}

/**
 * A time said relative to now, "3 minutes ago", with the exact instant on hover and on focus. With
 * no `now` it keeps its own clock and reads itself again as the words may change: every 15 seconds
 * within an hour, every minute within a day, then hourly. An app that holds one clock for a whole
 * list, or a story that must render the same each time, passes `now`. `locale` and `timeZone` say
 * the words and the instant as the reader wants them; `length` is Intl's style, `short` giving
 * "3 min. ago". `numeric`, `rounding`, `nowWithin`, `horizon` and `exact` carry an app's own
 * conventions; `relativeTime` and `exactTime` spell the same in a sentence.
 */
export function RelativeTime({
    date,
    now: given,
    locale,
    timeZone,
    exact: exactFormat,
    focusable = true,
    words,
    className,
    ...options
}: RelativeTimeProps) {
    const when = date instanceof Date ? date : new Date(date)
    const [clock, setClock] = useState(() => given ?? new Date())
    const now = given ?? clock
    const distance = when.getTime() - now.getTime()

    useEffect(() => {
        if (given !== undefined) return
        const timer = setTimeout(() => setClock(new Date()), tickFor(distance))
        return () => clearTimeout(timer)
    }, [given, distance])

    // A date that cannot be read is shown as it was given, so a reader still sees what the app had.
    if (Number.isNaN(when.getTime()))
        return typeof date === 'string' && date !== '' ? <span className={cn('whitespace-nowrap', className)}>{date}</span> : null
    const exact = exactTime(when, { locale, timeZone, exact: exactFormat })
    const text = relativeTime(when, now, { ...options, locale, timeZone, now: words?.now })
    if (!focusable)
        return (
            <time dateTime={when.toISOString()} title={exact} className={cn('whitespace-nowrap tabular-nums', className)}>
                {text}
            </time>
        )
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <time
                        dateTime={when.toISOString()}
                        tabIndex={0}
                        className={cn(
                            'rounded-mini whitespace-nowrap tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            className,
                        )}
                    />
                }
            >
                {text}
            </TooltipTrigger>
            <TooltipContent>{exact}</TooltipContent>
        </Tooltip>
    )
}
