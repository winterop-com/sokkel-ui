import { format, isSameDay } from 'date-fns'

import { cn } from '../../lib/cn'

/**
 * A row of days to choose from, as a phone's week view shows above its agenda: each day's letter
 * over its number, today in the primary ink and the chosen day filled.
 */
export function DayStrip({
    days,
    chosen,
    today,
    onChoose,
    className,
}: {
    days: readonly Date[]
    chosen: Date
    today: Date
    onChoose: (day: Date) => void
    className?: string
}) {
    return (
        <div className={cn('grid gap-1', className)} style={{ gridTemplateColumns: `repeat(${String(days.length)}, minmax(0, 1fr))` }}>
            {days.map((day) => {
                const isChosen = isSameDay(day, chosen)
                const isToday = isSameDay(day, today)
                return (
                    <button
                        key={day.toISOString()}
                        type="button"
                        aria-pressed={isChosen}
                        aria-label={format(day, 'EEEE d MMMM')}
                        onClick={() => onChoose(day)}
                        className="flex flex-col items-center gap-1 rounded-control py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <span className={cn('text-muted-foreground', isToday && 'text-primary-ink')}>{format(day, 'EEEEE')}</span>
                        <span
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full text-sm tabular-nums',
                                isChosen && 'bg-primary font-medium text-primary-foreground',
                                isToday && !isChosen && 'font-medium text-primary-ink',
                            )}
                        >
                            {format(day, 'd')}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
