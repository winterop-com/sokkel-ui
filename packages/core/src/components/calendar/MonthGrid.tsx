import { addDays, differenceInCalendarDays, endOfMonth, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { Fragment, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_WASH } from '../../lib/kind'
import type { CalendarEventDrag } from './calendar-drag'
import { movedBy, resizedBy, type CalendarEventChange } from './event-change'
import { useCalendarDrag, useEventKeys } from './event-keys'
import { EventPopover, useOpenEvent } from './EventPopover'
import { CALENDAR_WORDS, eventsOn, weekOf, type CalendarEvent, type CalendarWords } from './events'
import { followPress } from './follow-press'
import { Dot } from '../Dot'

export type { CalendarEventChange } from './event-change'

/** The days a month view shows: whole weeks from the one holding the 1st to the one holding the last day. */
export function monthDays(month: Date, weekStartsOn: 0 | 1 = 1): Date[] {
    const first = weekOf(startOfMonth(month), weekStartsOn)[0]
    const last = endOfMonth(month)
    const days: Date[] = []
    for (let day = first; day <= last || days.length % 7 !== 0; day = addDays(day, 1)) days.push(day)
    return days
}

export interface MonthGridProps<E extends CalendarEvent> {
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
    /**
     * Hears an event dragged to another day, or moved with Alt and the arrows (a day sideways, a week
     * up and down): where it now starts and ends, its times and length kept.
     */
    onEventMove?: (change: CalendarEventChange<E>) => void
    /** Hears an event's last day dragged by its right end, or moved with Alt, Shift and the arrows. */
    onEventResize?: (change: CalendarEventChange<E>) => void
    /** Whether an event may be moved and resized; every event may without it. */
    canChange?: (event: E) => boolean
    className?: string
    words?: Partial<CalendarWords>
}

/**
 * A month as a grid of days, each with its events in order: all-day ones as bars, timed ones
 * as a dot, the time and the title. A day with more than `max` events shows the first and says how
 * many more there are; pressing that calls `onMore`. Days outside the month are drawn faint, and
 * today wears the accent.
 *
 * Below the `md` breakpoint a day is too narrow for titles, so it shows a dot per event instead,
 * and the whole day is the control: pressing it calls `onSelectDay`.
 *
 * With `onEventMove` an event drags to another day, the days it would cover washed, and with
 * `onEventResize` its right end on its last day drags its last day. From the keyboard, Alt with the
 * arrows moves the focused event a day sideways or a week up and down, and with Shift moves its
 * last day. The drag engine loads only for a grid that moves its events.
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
    onEventMove,
    onEventResize,
    canChange,
    className,
    words: given,
}: MonthGridProps<E>) {
    const words = { ...CALENDAR_WORDS, ...given }
    const root = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useOpenEvent(openEvent, onOpenEventChange)
    const days = monthDays(month, weekStartsOn)
    const weeks = days.length / 7
    const kind = useId()
    const layer = useCalendarDrag(onEventMove !== undefined)
    const keys = useEventKeys({ view: 'month', step: 15, words, canChange, onEventMove, onEventResize, root })
    const [resizing, setResizing] = useState<CalendarEventChange<E> | null>(null)
    const [landing, setLanding] = useState<{ id: string; shift: number } | null>(null)
    const shown =
        resizing === null
            ? events
            : events.map((event) => (event.id === resizing.event.id ? { ...event, start: resizing.start, end: resizing.end } : event))
    const indexOf = (date: Date) => differenceInCalendarDays(date, days[0])
    const moved = landing === null ? undefined : events.find((event) => event.id === landing.id)
    /** Whether the day at `index` lies under where the carried event would land. */
    const covered = (index: number) =>
        moved !== undefined &&
        landing !== null &&
        index >= indexOf(moved.start) + landing.shift &&
        index <= indexOf(moved.end) + landing.shift

    /** Follows a press on an event's right end and hears the last day it gives. */
    const resize = (event: E) => (press: ReactPointerEvent<HTMLElement>) => {
        const changeAt = (point: { x: number; y: number }) => {
            const cell = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-calendar-day]')
            const index = cell?.dataset.calendarDay === undefined ? undefined : Number(cell.dataset.calendarDay)
            return index === undefined ? undefined : resizedBy(event, index - indexOf(event.end))
        }
        followPress(
            press,
            'col-resize',
            (point) => {
                const change = changeAt(point)
                if (change !== undefined) setResizing(change)
            },
            (point) => {
                setResizing(null)
                const change = point === null ? undefined : changeAt(point)
                if (change !== undefined && change.end.getTime() !== event.end.getTime()) onEventResize?.(change)
            },
        )
    }
    const changes = (event: E) => keys.changes(event)
    /** The event's chip, dragged when the grid moves events and the engine is here. */
    const dragged = (event: E, day: number, preview: () => ReactNode, draw: (drag: CalendarEventDrag | undefined) => ReactNode) =>
        layer !== undefined && onEventMove !== undefined && changes(event) ? (
            <layer.CalendarDragEvent kind={kind} id={event.id} day={day} label={event.title} preview={preview}>
                {draw}
            </layer.CalendarDragEvent>
        ) : (
            draw(undefined)
        )

    const view = (
        <div ref={root} className={cn('flex min-h-0 flex-col', className)}>
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
                    const all = eventsOn(shown, day)
                    const listed = all.length > max ? all.slice(0, max - 1) : all
                    const hidden = all.length - listed.length
                    const cell = (ref?: (element: HTMLElement | null) => void) => (
                        <div
                            key={day.toISOString()}
                            ref={ref}
                            data-calendar-day={index}
                            data-over={covered(index) || undefined}
                            aria-current={today ? 'date' : undefined}
                            className={cn(
                                'relative flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden border-border p-1',
                                index % 7 !== 0 && 'border-l',
                                index >= 7 && 'border-t',
                                !inMonth && 'bg-muted/40 dark:bg-muted/20',
                                chosen && 'max-md:bg-accent',
                                covered(index) && 'bg-primary/5 shadow-[inset_0_0_0_2px_var(--color-primary)]',
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
                                {listed.map((event) => {
                                    const look = cn(
                                        'flex h-5 min-w-0 items-center gap-1.5 rounded-sm px-1.5 text-left text-xs',
                                        event.allDay === true ? cn('font-medium', KIND_WASH[event.color ?? 'blue']) : 'hover:bg-hover',
                                        event.muted === true && 'opacity-60',
                                    )
                                    const face = (
                                        <>
                                            {event.allDay !== true && (
                                                <>
                                                    <Dot kind={event.color ?? 'blue'} size="sm" />
                                                    <span className="shrink-0 text-muted-foreground tabular-nums">
                                                        {words.time(event.start)}
                                                    </span>
                                                </>
                                            )}
                                            <span className="truncate">{event.title}</span>
                                        </>
                                    )
                                    return (
                                        <Fragment key={event.id}>
                                            {dragged(
                                                event,
                                                index,
                                                () => (
                                                    <div className={cn(look, 'h-full bg-card')}>{face}</div>
                                                ),
                                                (drag) => (
                                                    <EventPopover
                                                        event={event}
                                                        open={open === event.id}
                                                        onOpenChange={(next) => setOpen(next ? event.id : null)}
                                                        detail={renderDetail}
                                                        onSelect={onSelectEvent}
                                                        trigger={
                                                            changes(event)
                                                                ? {
                                                                      ref: drag?.ref,
                                                                      ...drag?.press,
                                                                      'data-event-id': event.id,
                                                                      onKeyDown: keys.keyDown(event),
                                                                      'aria-keyshortcuts':
                                                                          'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight',
                                                                      'aria-description': words.changeKeys,
                                                                  }
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            look,
                                                            'relative data-open:ring-2 data-open:ring-ring',
                                                            !inMonth && 'opacity-70',
                                                            drag !== undefined && 'touch-manipulation select-none',
                                                            drag?.dragging === true && 'opacity-40',
                                                        )}
                                                    >
                                                        {face}
                                                        {onEventResize !== undefined && changes(event) && isSameDay(event.end, day) && (
                                                            <span
                                                                aria-hidden
                                                                data-no-drag
                                                                onPointerDown={resize(event)}
                                                                className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none"
                                                            />
                                                        )}
                                                    </EventPopover>
                                                ),
                                            )}
                                        </Fragment>
                                    )
                                })}
                                {hidden > 0 && (
                                    <button
                                        type="button"
                                        className="flex h-5 items-center rounded-sm px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-hover hover:text-foreground"
                                        onClick={() => onMore?.(day)}
                                    >
                                        {words.more(hidden)}
                                    </button>
                                )}
                            </div>
                            {all.length > 0 && (
                                <div className="pointer-events-none relative flex flex-wrap justify-center gap-0.5 md:hidden">
                                    {all.slice(0, 4).map((event) => (
                                        <Dot key={event.id} kind={event.color ?? 'blue'} size="sm" />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                    return layer === undefined ? (
                        cell()
                    ) : (
                        <layer.CalendarDay key={day.toISOString()} kind={kind} index={index} label={day.toDateString()}>
                            {cell}
                        </layer.CalendarDay>
                    )
                })}
            </div>
            {keys.live}
        </div>
    )

    if (layer === undefined) return view
    return (
        <layer.CalendarDragArea
            kind={kind}
            onMove={(carry) => {
                const shift = carry.over === null ? null : carry.over - carry.value.day
                setLanding((last) =>
                    shift === null ? null : last?.id === carry.value.id && last.shift === shift ? last : { id: carry.value.id, shift },
                )
            }}
            onEnd={(carry) => {
                setLanding(null)
                const event = events.find((each) => each.id === carry.value.id)
                const shift = carry.over === null ? 0 : carry.over - carry.value.day
                if (event !== undefined && shift !== 0) onEventMove?.(movedBy(event, shift))
            }}
            onCancel={() => setLanding(null)}
        >
            {view}
        </layer.CalendarDragArea>
    )
}
