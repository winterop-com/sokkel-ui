import { addDays, endOfMonth, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_FILL, KIND_WASH } from '../../lib/kind'
import { EventPopover, useOpenEvent } from './EventPopover'
import { CALENDAR_WORDS, eventsOn, weekOf, type CalendarEvent, type CalendarWords } from './events'

/** The days a month view shows: whole weeks from the one holding the 1st to the one holding the last day. */
export function monthDays(month: Date, weekStartsOn: 0 | 1 = 1): Date[] {
    const first = weekOf(startOfMonth(month), weekStartsOn)[0]
    const last = endOfMonth(month)
    const days: Date[] = []
    for (let day = first; day <= last || days.length % 7 !== 0; day = addDays(day, 1)) days.push(day)
    return days
}

/**
 * A month as a grid of days, each with its events in order: all-day ones as bars, timed ones
 * as a dot, the time and the title. A day with more than `max` events shows the first and says how
 * many more there are; pressing that calls `onMore`. Days outside the month are drawn faint, and
 * today wears the accent.
 *
 * Below the `md` breakpoint a day is too narrow for titles, so it shows a dot per event instead,
 * and the whole day is the control: pressing it calls `onSelectDay`.
 */
export function MonthGrid<E extends CalendarEvent>({
    month,
    events,
    now,
    selected,
    max = 3,
    weekStartsOn = 1,
    renderDetail,
    openEvent,
    onOpenEventChange,
    onSelectEvent,
    onSelectDay,
    onMore,
    className,
    words: given,
}: {
    month: Date
    events: readonly E[]
    now?: Date
    /** The chosen day, marked on a phone where a day is pressed to see its events. */
    selected?: Date
    /** The most events a day shows before it says how many more there are. */
    max?: number
    weekStartsOn?: 0 | 1
    renderDetail?: (event: E) => ReactNode
    openEvent?: string | null
    onOpenEventChange?: (id: string | null) => void
    onSelectEvent?: (event: E) => void
    onSelectDay?: (day: Date) => void
    onMore?: (day: Date) => void
    className?: string
    words?: Partial<CalendarWords>
}) {
    const words = { ...CALENDAR_WORDS, ...given }
    const [open, setOpen] = useOpenEvent(openEvent, onOpenEventChange)
    const days = monthDays(month, weekStartsOn)
    const weeks = days.length / 7
    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div className="grid shrink-0 grid-cols-7 border-b border-border">
                {days.slice(0, 7).map((day) => (
                    <div key={day.toISOString()} className="px-2 py-2 text-xs text-muted-foreground max-md:text-center">
                        {words.weekday(day)}
                    </div>
                ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
                {days.map((day, index) => {
                    const inMonth = isSameMonth(day, month)
                    const today = now !== undefined && isSameDay(day, now)
                    const chosen = selected !== undefined && isSameDay(day, selected)
                    const all = eventsOn(events, day)
                    const shown = all.length > max ? all.slice(0, max - 1) : all
                    const hidden = all.length - shown.length
                    return (
                        <div
                            key={day.toISOString()}
                            aria-current={today ? 'date' : undefined}
                            className={cn(
                                'relative flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden border-border p-1',
                                index % 7 !== 0 && 'border-l',
                                index >= 7 && 'border-t',
                                !inMonth && 'bg-muted/40 dark:bg-muted/20',
                                chosen && 'max-md:bg-accent',
                            )}
                        >
                            {onSelectDay !== undefined && (
                                <button
                                    type="button"
                                    aria-label={day.toDateString()}
                                    className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                    onClick={() => onSelectDay(day)}
                                />
                            )}
                            <span
                                className={cn(
                                    'pointer-events-none relative flex size-6 shrink-0 items-center justify-center self-start rounded-full text-xs tabular-nums max-md:self-center',
                                    !inMonth && 'text-faint',
                                    today && 'bg-primary font-medium text-primary-foreground',
                                )}
                            >
                                {words.dayNumber(day)}
                            </span>
                            <div className="relative flex flex-col gap-0.5 max-md:hidden">
                                {shown.map((event) => (
                                    <EventPopover
                                        key={event.id}
                                        event={event}
                                        open={open === event.id}
                                        onOpenChange={(next) => setOpen(next ? event.id : null)}
                                        detail={renderDetail}
                                        onSelect={onSelectEvent}
                                        className={cn(
                                            'flex h-5 min-w-0 items-center gap-1.5 rounded-sm px-1.5 text-left text-xs data-open:ring-2 data-open:ring-ring',
                                            event.allDay === true
                                                ? cn('font-medium', KIND_WASH[event.color ?? 'blue'])
                                                : 'hover:bg-secondary',
                                            event.muted === true && 'opacity-60',
                                            !inMonth && 'opacity-70',
                                        )}
                                    >
                                        {event.allDay !== true && (
                                            <>
                                                <span className={cn('size-1.5 shrink-0 rounded-full', KIND_FILL[event.color ?? 'blue'])} />
                                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                                    {words.time(event.start)}
                                                </span>
                                            </>
                                        )}
                                        <span className="truncate">{event.title}</span>
                                    </EventPopover>
                                ))}
                                {hidden > 0 && (
                                    <button
                                        type="button"
                                        className="flex h-5 items-center rounded-sm px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                        onClick={() => onMore?.(day)}
                                    >
                                        {words.more(hidden)}
                                    </button>
                                )}
                            </div>
                            {all.length > 0 && (
                                <div className="pointer-events-none relative flex flex-wrap justify-center gap-0.5 md:hidden">
                                    {all.slice(0, 4).map((event) => (
                                        <span key={event.id} className={cn('size-1.5 rounded-full', KIND_FILL[event.color ?? 'blue'])} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
