import { differenceInCalendarDays, format } from 'date-fns'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** Where a date falls against today: passed, near, or later. */
export type DueState = 'overdue' | 'near' | 'later'

export interface DueTextWords {
    /** How the date is written, given today. */
    date: (date: Date, now: Date) => string
    /** The tooltip, with where the date falls; none when it returns undefined. */
    title: (date: Date, state: DueState) => string | undefined
    /** What it says when there is no date. */
    none: string
}

export const DUE_TEXT_WORDS: DueTextWords = {
    date: (date) => format(date, 'MMM d'),
    title: (date, state) => `${state === 'overdue' ? 'Overdue, was due' : 'Due'} ${format(date, 'EEEE d MMMM')}`,
    none: 'None',
}

/** Where `date` falls against `now`: before today is overdue, today up to `nearDays` ahead is near. */
export function dueState(date: Date, now: Date, nearDays = 0): DueState {
    const days = differenceInCalendarDays(date, now)
    if (days < 0) return 'overdue'
    return days <= nearDays ? 'near' : 'later'
}

export interface DueTextProps {
    /** The date; without one the text says `words.none`. */
    date: Date | undefined
    now: Date
    nearDays?: number
    done?: boolean
    quiet?: boolean
    icon?: ReactNode
    alert?: boolean
    words?: Partial<DueTextWords>
    className?: string
}

/**
 * A date toned by how near it is: one that has passed in the critical ink and one that is near in
 * the warning ink, both in medium weight, and any other in the muted ink (or the surrounding color
 * with `quiet={false}`). `now` is today, so the tone never depends on the clock; `nearDays` is how
 * many days ahead still count as near, with 0 meaning today only. A `done` thing's date is never
 * toned. `icon` sits before the date always, and `alert` puts a warning mark there while the date
 * is toned.
 */
export function DueText({
    date,
    now,
    nearDays = 0,
    done = false,
    quiet = true,
    icon,
    alert = false,
    words: given,
    className,
}: DueTextProps) {
    const words = { ...DUE_TEXT_WORDS, ...given }
    const state = date === undefined || done ? 'later' : dueState(date, now, nearDays)
    const toned = state !== 'later'
    const mark = alert && toned ? <TriangleAlert aria-hidden /> : icon
    return (
        <span
            title={date === undefined ? undefined : words.title(date, state)}
            className={cn(
                'inline-flex max-w-full min-w-0 items-center gap-1 tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0',
                state === 'overdue' && 'font-medium text-critical-ink',
                state === 'near' && 'font-medium text-warning-ink',
                !toned && quiet && 'text-muted-foreground',
                className,
            )}
        >
            {mark}
            <span className="truncate">{date === undefined ? words.none : words.date(date, now)}</span>
        </span>
    )
}
