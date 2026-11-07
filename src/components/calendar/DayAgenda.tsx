import { isSameDay } from 'date-fns'
import { Fragment, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_FILL } from '../../lib/kind'
import { EventPopover, useOpenEvent } from './EventPopover'
import { CALENDAR_WORDS, eventsOn, type CalendarEvent, type CalendarWords } from './events'

/**
 * One day's events as a list, the day view where a grid has no room, as on a phone: all-day
 * events first, then each timed one with its times, its calendar's color, its title and its
 * detail. On today a line marks where now falls between them. Pressing an event opens its details
 * when `renderDetail` is given.
 */
export function DayAgenda<E extends CalendarEvent>({
    day,
    events,
    now,
    renderDetail,
    openEvent,
    onOpenEventChange,
    onSelectEvent,
    className,
    words: given,
}: {
    day: Date
    events: readonly E[]
    now?: Date
    renderDetail?: (event: E) => ReactNode
    openEvent?: string | null
    onOpenEventChange?: (id: string | null) => void
    onSelectEvent?: (event: E) => void
    className?: string
    words?: Partial<CalendarWords>
}) {
    const words = { ...CALENDAR_WORDS, ...given }
    const [open, setOpen] = useOpenEvent(openEvent, onOpenEventChange)
    const list = eventsOn(events, day)
    const today = now !== undefined && isSameDay(day, now)
    const nowAt = today ? list.findIndex((event) => event.allDay !== true && event.start > now) : -2
    const nowLine = (
        <li aria-label={words.now} className="flex items-center gap-2 px-3 py-1">
            <span className="w-12 shrink-0 text-xs font-medium text-critical-ink tabular-nums">{now !== undefined && words.time(now)}</span>
            <span className="relative h-0.5 flex-1 bg-critical">
                <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-critical" />
            </span>
        </li>
    )
    if (list.length === 0) {
        return <p className={cn('px-3 py-8 text-center text-sm text-muted-foreground', className)}>{words.empty}</p>
    }
    return (
        <ul className={cn('flex flex-col py-1', className)}>
            {list.map((event, index) => (
                <Fragment key={event.id}>
                    {index === nowAt && nowLine}
                    <li>
                        <EventPopover
                            event={event}
                            open={open === event.id}
                            onOpenChange={(next) => setOpen(next ? event.id : null)}
                            detail={renderDetail}
                            onSelect={onSelectEvent}
                            side="bottom"
                            className={cn(
                                'flex min-h-finger w-full items-start gap-3 px-3 py-2 text-left hover:bg-hover data-open:bg-secondary',
                                event.muted === true && 'opacity-60',
                            )}
                        >
                            <span className="flex w-12 shrink-0 flex-col text-xs text-muted-foreground tabular-nums">
                                {event.allDay === true ? (
                                    words.allDay
                                ) : (
                                    <>
                                        <span className="text-foreground">{words.time(event.start)}</span>
                                        <span>{words.time(event.end)}</span>
                                    </>
                                )}
                            </span>
                            <span className={cn('mt-0.5 w-1 self-stretch rounded-full', KIND_FILL[event.color ?? 'blue'])} aria-hidden />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className={cn('text-sm font-medium', event.muted === true && 'line-through')}>{event.title}</span>
                                {event.detail !== undefined && (
                                    <span className="truncate text-xs text-muted-foreground">{event.detail}</span>
                                )}
                            </span>
                        </EventPopover>
                    </li>
                </Fragment>
            ))}
            {nowAt === -1 && nowLine}
        </ul>
    )
}
