import { lazy, Suspense } from 'react'

import { dateOf, isoDate } from '../lib/dates'
import { Spinner } from './ui/spinner'

/** The calendar and its date library, fetched when a date field is first pointed at, focused or opened. */
const loadCalendar = () => import('./ui/calendar')
const Calendar = lazy(() => loadCalendar().then((module) => ({ default: module.Calendar })))
/** Fetches the calendar ahead, so it is there when the picker opens. */
export const prefetchCalendar = () => void loadCalendar()

export interface DayPickProps {
    /** The chosen day, as `YYYY-MM-DD`. */
    value: string | null
    onPick: (day: string) => void
    min?: string
    max?: string
    /** The day marked as today, as `YYYY-MM-DD`; the clock's day when omitted. */
    today?: string
    weekStartsOn?: 0 | 1
}

/**
 * A month of days to pick one from, opening on the chosen day's month (else today's, kept within
 * the bounds) with the chosen day focused. Days outside `min` and `max` cannot be picked, and the
 * months beyond them are not offered. The calendar loads on first use, a spinner in its place.
 */
export function DayPick({ value, onPick, min, max, today, weekStartsOn = 1 }: DayPickProps) {
    const marked = today ?? isoDate(new Date())
    const shown = value ?? (min !== undefined && marked < min ? min : max !== undefined && marked > max ? max : marked)
    return (
        <Suspense
            fallback={
                <div className="flex h-72 w-56 items-center justify-center">
                    <Spinner className="text-muted-foreground" />
                </div>
            }
        >
            <Calendar
                mode="single"
                required
                autoFocus
                selected={value === null ? undefined : dateOf(value)}
                onSelect={(day: Date) => onPick(isoDate(day))}
                defaultMonth={dateOf(shown)}
                today={dateOf(marked)}
                weekStartsOn={weekStartsOn}
                startMonth={min === undefined ? undefined : dateOf(min)}
                endMonth={max === undefined ? undefined : dateOf(max)}
                disabled={[...(min === undefined ? [] : [{ before: dateOf(min) }]), ...(max === undefined ? [] : [{ after: dateOf(max) }])]}
            />
        </Suspense>
    )
}
