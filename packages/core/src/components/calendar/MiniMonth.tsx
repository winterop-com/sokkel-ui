import { addMonths, format, isSameDay, isSameMonth, isWithinInterval, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../lib/cn'
import { monthDays } from './MonthGrid'

export interface MiniMonthWords {
    previous: string
    next: string
    /** The month's title over the grid. */
    title: (month: Date) => string
    /** A weekday's one-letter name over its column. */
    weekday: (date: Date) => string
    /** A day's number in its month. */
    dayNumber: (date: Date) => string
    /** A day's full name, for a screen reader. */
    day: (date: Date) => string
}

const WORDS: MiniMonthWords = {
    previous: 'Previous month',
    next: 'Next month',
    title: (month) => format(month, 'MMMM yyyy'),
    weekday: (date) => format(date, 'EEEEE'),
    dayNumber: (date) => format(date, 'd'),
    day: (date) => format(date, 'EEEE d MMMM yyyy'),
}

export interface MiniMonthProps {
    month: Date
    onMonthChange?: (month: Date) => void
    /** The chosen day. */
    value?: Date
    onValueChange?: (day: Date) => void
    now?: Date
    /** The days in view in the main calendar, washed. */
    range?: { start: Date; end: Date }
    /** Days that carry a dot. */
    marked?: readonly Date[]
    weekStartsOn?: 0 | 1
    className?: string
    words?: Partial<MiniMonthWords>
}

/**
 * A small month for a calendar's sidebar: the month's title with back and forward, and its days
 * in whole weeks. Today wears the accent, the chosen day a ring, and the days in `range`, such as
 * the week in view, a faint wash. A day in `marked` carries a dot under its number, for a day with
 * events. Pressing a day chooses it.
 */
export function MiniMonth({
    month,
    onMonthChange,
    value,
    onValueChange,
    now,
    range,
    marked = [],
    weekStartsOn = 1,
    className,
    words: given,
}: MiniMonthProps) {
    const words = { ...WORDS, ...given }
    const days = monthDays(month, weekStartsOn)
    const inRange = (day: Date) =>
        range !== undefined && isWithinInterval(day, { start: startOfDay(range.start), end: startOfDay(range.end) })
    return (
        <div className={cn('flex w-full flex-col gap-1 text-sm', className)}>
            <div className="flex items-center gap-1 pl-1.5">
                <span className="flex-1 truncate font-medium">{words.title(month)}</span>
                <button
                    type="button"
                    aria-label={words.previous}
                    title={words.previous}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
                    onClick={() => onMonthChange?.(addMonths(month, -1))}
                >
                    <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                    type="button"
                    aria-label={words.next}
                    title={words.next}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
                    onClick={() => onMonthChange?.(addMonths(month, 1))}
                >
                    <ChevronRight className="size-4" aria-hidden />
                </button>
            </div>
            <div className="grid grid-cols-7 text-center">
                {days.slice(0, 7).map((day) => (
                    <span key={day.toISOString()} aria-hidden className="py-1 text-xs text-faint">
                        {words.weekday(day)}
                    </span>
                ))}
                {days.map((day, index) => {
                    const today = now !== undefined && isSameDay(day, now)
                    const chosen = value !== undefined && isSameDay(day, value)
                    const washed = inRange(day)
                    const startOfRow = index % 7 === 0 || (index > 0 && !inRange(days[index - 1]))
                    const endOfRow = index % 7 === 6 || (index < days.length - 1 && !inRange(days[index + 1]))
                    return (
                        <span
                            key={day.toISOString()}
                            className={cn(
                                'flex justify-center py-px',
                                washed && 'bg-secondary',
                                washed && startOfRow && 'rounded-l-md',
                                washed && endOfRow && 'rounded-r-md',
                            )}
                        >
                            <button
                                type="button"
                                aria-label={words.day(day)}
                                aria-pressed={chosen}
                                aria-current={today ? 'date' : undefined}
                                className={cn(
                                    'relative flex size-7 items-center justify-center rounded-md text-xs tabular-nums outline-none hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid',
                                    !isSameMonth(day, month) && 'text-faint',
                                    chosen && !today && 'ring-1 ring-primary',
                                    today && 'bg-primary font-medium text-primary-foreground hover:bg-primary',
                                )}
                                onClick={() => onValueChange?.(day)}
                            >
                                {words.dayNumber(day)}
                                {marked.some((mark) => isSameDay(mark, day)) && (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute bottom-0.5 size-1 rounded-full',
                                            today ? 'bg-primary-foreground' : 'bg-muted-foreground',
                                        )}
                                    />
                                )}
                            </button>
                        </span>
                    )
                })}
            </div>
        </div>
    )
}
