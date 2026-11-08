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

/**
 * `date` said against `now` in words, such as "3 minutes ago" or "in 2 hours": the largest whole
 * unit the distance holds, and "now" under a minute.
 */
export function relativeTime(
    date: Date,
    now: Date,
    { locale, length = 'long' }: { locale?: string; length?: Intl.RelativeTimeFormatStyle } = {},
): string {
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: length })
    const distance = date.getTime() - now.getTime()
    for (const [unit, size] of UNITS) {
        const count = Math.trunc(distance / size)
        if (count !== 0) return format.format(count, unit)
    }
    return format.format(0, 'second')
}

/** How long until the words for a date this far off may change, so a clock reads them again. */
export function tickFor(distance: number): number {
    const far = Math.abs(distance)
    if (far < HOUR) return 15 * SECOND
    if (far < DAY) return MINUTE
    return HOUR
}

export interface RelativeTimeProps {
    date: Date | string | number
    /** The moment to count from; without it, the clock. */
    now?: Date
    locale?: string
    timeZone?: string
    length?: Intl.RelativeTimeFormatStyle
    className?: string
}

/**
 * A time said relative to now, "3 minutes ago", with the exact instant on hover and on focus. With
 * no `now` it keeps its own clock and reads itself again as the words may change: every 15 seconds
 * within an hour, every minute within a day, then hourly. An app that holds one clock for a whole
 * list, or a story that must render the same each time, passes `now`. `locale` and `timeZone` say
 * the words and the instant as the reader wants them; `length` is Intl's style, `short` giving
 * "3 min. ago".
 */
export function RelativeTime({ date, now: given, locale, timeZone, length = 'long', className }: RelativeTimeProps) {
    const when = date instanceof Date ? date : new Date(date)
    const [clock, setClock] = useState(() => given ?? new Date())
    const now = given ?? clock
    const distance = when.getTime() - now.getTime()

    useEffect(() => {
        if (given !== undefined) return
        const timer = setTimeout(() => setClock(new Date()), tickFor(distance))
        return () => clearTimeout(timer)
    }, [given, distance])

    if (Number.isNaN(when.getTime())) return null
    const exact = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'medium', timeZone }).format(when)
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
                {relativeTime(when, now, { locale, length })}
            </TooltipTrigger>
            <TooltipContent>{exact}</TooltipContent>
        </Tooltip>
    )
}
