import { format, isSameDay } from 'date-fns'

import { cn } from '../../lib/cn'

/** The words a day strip says, each a formatter so an app can write dates its own way. */
export interface DayStripWords {
    /** A weekday's one-letter name over its number. */
    weekday: (date: Date) => string
    /** A day's number in its month. */
    dayNumber: (date: Date) => string
    /** A day's full name, for a screen reader. */
    day: (date: Date) => string
}

const WORDS: DayStripWords = {
    weekday: (date) => format(date, 'EEEEE'),
    dayNumber: (date) => format(date, 'd'),
    day: (date) => format(date, 'EEEE d MMMM'),
}

/**
 * A row of days to choose from, as a phone's week view shows above its agenda: each day's letter
 * over its number, today in the primary ink and the chosen day filled.
 */
export function DayStrip({
    days,
    value,
    today,
    onValueChange,
    className,
    words: given,
}: {
    days: readonly Date[]
    /** The chosen day. */
    value: Date
    today: Date
    onValueChange: (day: Date) => void
    className?: string
    words?: Partial<DayStripWords>
}) {
    const words = { ...WORDS, ...given }
    return (
        <div className={cn('grid gap-1', className)} style={{ gridTemplateColumns: `repeat(${String(days.length)}, minmax(0, 1fr))` }}>
            {days.map((day) => {
                const isChosen = isSameDay(day, value)
                const isToday = isSameDay(day, today)
                return (
                    <button
                        key={day.toISOString()}
                        type="button"
                        aria-pressed={isChosen}
                        aria-label={words.day(day)}
                        onClick={() => onValueChange(day)}
                        className="flex flex-col items-center gap-1 rounded-control py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <span className={cn('text-muted-foreground', isToday && 'text-primary-ink')}>{words.weekday(day)}</span>
                        <span
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full text-sm tabular-nums',
                                isChosen && 'bg-primary font-medium text-primary-foreground',
                                isToday && !isChosen && 'font-medium text-primary-ink',
                            )}
                        >
                            {words.dayNumber(day)}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
