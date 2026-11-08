import { isSameDay } from 'date-fns'
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_EDGE, KIND_FILL, KIND_INK, KIND_WASH } from '../../lib/kind'
import { EventPopover, useOpenEvent } from './EventPopover'
import { CALENDAR_WORDS, layoutDay, layoutSpans, type CalendarEvent, type CalendarWords } from './events'

/**
 * Days side by side with the hours running down: the week view of a calendar, or any run of
 * days. Each timed event is a block from its start to its end, and events that overlap split the
 * day's width between them. A block says as much as its height and width allow: its title, then
 * its times and its detail as it grows; a lane too narrow for the times shows the title alone,
 * over as many lines as the block is tall, and the popover says the rest. All-day events lie in a strip on top, spanning their days. Today's
 * column carries a line at the current time, and the gutter says the time beside it.
 *
 * The hours scroll under the day heads, starting at `scrollToHour`. Pressing an event opens its
 * details in a popover beside it when `renderDetail` is given; `openEvent` with
 * `onOpenEventChange` holds which one is open from outside.
 */
export function WeekGrid<E extends CalendarEvent>({
    days,
    events,
    now,
    hourHeight = 48,
    scrollToHour = 7,
    renderDetail,
    openEvent,
    onOpenEventChange,
    onSelectEvent,
    onSelectDay,
    className,
    words: given,
}: {
    days: readonly Date[]
    events: readonly E[]
    /** The current time, for the line across today; no line without it. */
    now?: Date
    /** How tall an hour is, in pixels. */
    hourHeight?: number
    /** The hour at the top of the view when it first draws. */
    scrollToHour?: number
    /** What an event's popover holds. */
    renderDetail?: (event: E) => ReactNode
    /** The id of the event whose popover is open. */
    openEvent?: string | null
    onOpenEventChange?: (id: string | null) => void
    onSelectEvent?: (event: E) => void
    /** Called with a day whose head is pressed. */
    onSelectDay?: (day: Date) => void
    className?: string
    words?: Partial<CalendarWords>
}) {
    const words = { ...CALENDAR_WORDS, ...given }
    const body = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useOpenEvent(openEvent, onOpenEventChange)
    const spans = layoutSpans(events, days)
    const rows = spans.reduce((most, span) => Math.max(most, span.row + 1), 0)
    const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }
    const nowMinutes = now === undefined ? null : now.getHours() * 60 + now.getMinutes()

    useLayoutEffect(() => {
        if (body.current !== null) body.current.scrollTop = Math.max(0, scrollToHour * hourHeight - 12)
    }, [scrollToHour, hourHeight])

    return (
        <div className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
            <div className="flex shrink-0 [scrollbar-gutter:stable] overflow-hidden border-b border-border">
                <div className="w-14 shrink-0" />
                <div className="grid flex-1" style={columns}>
                    {days.map((day) => {
                        const today = now !== undefined && isSameDay(day, now)
                        const Head = onSelectDay === undefined ? 'div' : 'button'
                        return (
                            <Head
                                key={day.toISOString()}
                                {...(onSelectDay === undefined ? {} : { type: 'button' as const, onClick: () => onSelectDay(day) })}
                                aria-current={today ? 'date' : undefined}
                                className="flex min-w-0 items-center justify-center gap-1.5 border-l border-border py-2 text-sm"
                            >
                                <span className={cn('text-muted-foreground', today && 'text-primary-ink')}>{words.weekday(day)}</span>
                                <span
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full font-medium tabular-nums',
                                        today && 'bg-primary text-primary-foreground',
                                    )}
                                >
                                    {words.dayNumber(day)}
                                </span>
                            </Head>
                        )
                    })}
                </div>
            </div>
            {rows > 0 && (
                <div className="flex shrink-0 [scrollbar-gutter:stable] overflow-hidden border-b border-border-strong">
                    <div className="flex w-14 shrink-0 items-start justify-end pt-1.5 pr-2 text-xs text-muted-foreground">
                        {words.allDay}
                    </div>
                    <div className="relative grid flex-1 gap-y-1 py-1" style={{ ...columns, gridTemplateRows: `repeat(${rows}, 1.5rem)` }}>
                        {days.map((day, index) => (
                            <div
                                key={day.toISOString()}
                                aria-hidden
                                className="-my-1 border-l border-border"
                                style={{ gridColumn: index + 1, gridRow: `1 / span ${rows}` }}
                            />
                        ))}
                        {spans.map(({ event, start, span, row }) => (
                            <EventPopover
                                key={event.id}
                                event={event}
                                open={open === event.id}
                                onOpenChange={(next) => setOpen(next ? event.id : null)}
                                detail={renderDetail}
                                onSelect={onSelectEvent}
                                side="bottom"
                                className={cn(
                                    'mx-1 flex min-w-0 items-center rounded-md px-2 text-left text-xs font-medium',
                                    KIND_WASH[event.color ?? 'blue'],
                                    event.muted === true && 'opacity-60',
                                    'data-open:ring-2 data-open:ring-ring',
                                )}
                                style={{ gridColumn: `${start + 1} / span ${span}`, gridRow: row + 1 }}
                            >
                                <span className="truncate">{event.title}</span>
                            </EventPopover>
                        ))}
                    </div>
                </div>
            )}
            <div ref={body} className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto">
                <div className="relative flex" style={{ height: 24 * hourHeight }}>
                    <div className="relative w-14 shrink-0">
                        {Array.from({ length: 23 }, (_, index) => index + 1).map((hour) => (
                            <span
                                key={hour}
                                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                                style={{ top: hour * hourHeight }}
                            >
                                {words.hour(hour)}
                            </span>
                        ))}
                        {now !== undefined && nowMinutes !== null && days.some((day) => isSameDay(day, now)) && (
                            <span
                                className="absolute right-1 z-10 -translate-y-1/2 rounded-sm bg-background px-1 text-xs font-medium text-critical-ink tabular-nums"
                                style={{ top: (nowMinutes / 60) * hourHeight }}
                            >
                                {words.time(now)}
                            </span>
                        )}
                    </div>
                    <div
                        className="relative grid flex-1"
                        style={{
                            ...columns,
                            backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0 1px, transparent 1px ${hourHeight}px)`,
                        }}
                    >
                        {days.map((day) => {
                            const today = now !== undefined && isSameDay(day, now)
                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn('relative border-l border-border', today && 'bg-primary/[0.03]')}
                                >
                                    {layoutDay(events, day).map(({ event, from, to, column, columns: share }) => {
                                        const height = Math.max(((to - from) / 60) * hourHeight, hourHeight / 2) - 2
                                        const roomy = height >= 40
                                        // The lines of title a narrow lane has room for, at the block's 16px line height.
                                        const titleLines = Math.max(1, Math.floor((height - (roomy ? 8 : 0)) / 16))
                                        return (
                                            <EventPopover
                                                key={event.id}
                                                event={event}
                                                open={open === event.id}
                                                onOpenChange={(next) => setOpen(next ? event.id : null)}
                                                detail={renderDetail}
                                                onSelect={onSelectEvent}
                                                className={cn(
                                                    '@container/event absolute flex flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-xs leading-4 transition-[box-shadow]',
                                                    roomy ? 'py-1' : 'justify-center',
                                                    KIND_INK[event.color ?? 'blue'],
                                                    KIND_EDGE[event.color ?? 'blue'],
                                                    'bg-card shadow-[0_0_0_1px_var(--color-background)] hover:z-10 data-open:z-20 data-open:ring-2 data-open:ring-ring [&>*]:relative',
                                                    event.muted === true && 'opacity-60',
                                                )}
                                                style={{
                                                    top: (from / 60) * hourHeight + 1,
                                                    height,
                                                    left: `calc(${(column / share) * 100}% + 2px)`,
                                                    width: `calc(${100 / share}% - 4px)`,
                                                }}
                                            >
                                                <span
                                                    aria-hidden
                                                    className={cn('absolute! inset-0 opacity-15', KIND_FILL[event.color ?? 'blue'])}
                                                />
                                                <span
                                                    className={cn(
                                                        'truncate font-medium',
                                                        '@max-[5rem]/event:line-clamp-(--title-lines) @max-[5rem]/event:wrap-break-word @max-[5rem]/event:whitespace-normal',
                                                        event.muted === true && 'line-through',
                                                    )}
                                                    style={{ '--title-lines': titleLines } as CSSProperties}
                                                >
                                                    {event.title}
                                                </span>
                                                {roomy && (
                                                    <span className="truncate tabular-nums opacity-80 @max-[5rem]/event:hidden">
                                                        {words.time(event.start)} - {words.time(event.end)}
                                                    </span>
                                                )}
                                                {roomy && height >= 60 && event.detail !== undefined && (
                                                    <span className="truncate opacity-80 @max-[5rem]/event:hidden">{event.detail}</span>
                                                )}
                                            </EventPopover>
                                        )
                                    })}
                                    {today && nowMinutes !== null && (
                                        <div
                                            aria-label={words.now}
                                            className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-critical"
                                            style={{ top: (nowMinutes / 60) * hourHeight - 1 }}
                                        >
                                            <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-critical" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
