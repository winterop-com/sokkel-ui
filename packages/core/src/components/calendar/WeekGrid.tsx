import { differenceInMinutes, isSameDay, startOfDay } from 'date-fns'
import {
    Fragment,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react'

import { cn } from '../../lib/cn'
import { KIND_EDGE, KIND_FILL, KIND_INK, KIND_WASH } from '../../lib/kind'
import type { CalendarCarry, CalendarEventDrag } from './calendar-drag'
import { landingAt, movedBy, movedTo, resizedBy, snapTo, SNAP_MINUTES, type CalendarEventChange } from './event-change'
import { useCalendarDrag, useEventKeys } from './event-keys'
import { EventPopover, useOpenEvent } from './EventPopover'
import { CALENDAR_WORDS, layoutDay, layoutSpans, type CalendarEvent, type CalendarWords } from './events'
import { followPress } from './follow-press'

export type { CalendarEventChange } from './event-change'

export interface WeekGridProps<E extends CalendarEvent> {
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
    /**
     * Hears an event dragged to another day or time, or moved with Alt and the arrows: where it now
     * starts and ends, its length kept. The view holds no events of its own, so the app moves it.
     */
    onEventMove?: (change: CalendarEventChange<E>) => void
    /** Hears an event's end dragged by its lower edge, or moved with Alt, Shift and the arrows. */
    onEventResize?: (change: CalendarEventChange<E>) => void
    /** Whether an event may be moved and resized; every event may without it. */
    canChange?: (event: E) => boolean
    /** The minutes a moved or resized event snaps to. */
    snapMinutes?: number
    className?: string
    words?: Partial<CalendarWords>
}

const NO_DRAG: CalendarEventDrag | undefined = undefined

/** Where a carried event would land: a timed one's day and minute, an all-day one's shift in days. */
type Landing = { id: string; day: number; minute: number } | { id: string; shift: number }

const sameLanding = (a: Landing | null, b: Landing | null): boolean =>
    a === b ||
    (a !== null &&
        b !== null &&
        a.id === b.id &&
        ('shift' in a ? 'shift' in b && a.shift === b.shift : 'day' in b && a.day === b.day && a.minute === b.minute))

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
 *
 * With `onEventMove` an event drags to another day and time, snapped to `snapMinutes`, an outline
 * showing where it lands and the hours scrolling at their edges; an all-day event drags along the
 * strip by days. With `onEventResize` a block's lower edge, and an all-day bar's right end, drag
 * its end. From the keyboard, Alt with the arrows moves the focused event (up and down by the
 * snap, left and right by a day) and with Shift moves its end. The drag engine loads only for a
 * view that moves its events.
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
    onEventMove,
    onEventResize,
    canChange,
    snapMinutes = SNAP_MINUTES,
    className,
    words: given,
}: WeekGridProps<E>) {
    const words = { ...CALENDAR_WORDS, ...given }
    const root = useRef<HTMLDivElement>(null)
    const body = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useOpenEvent(openEvent, onOpenEventChange)
    const kind = useId()
    const layer = useCalendarDrag(onEventMove !== undefined)
    const keys = useEventKeys({ view: 'week', step: snapMinutes, words, canChange, onEventMove, onEventResize, root })
    const [resizing, setResizing] = useState<CalendarEventChange<E> | null>(null)
    const [landing, setLanding] = useState<Landing | null>(null)
    const grab = useRef<number | null>(null)

    const shown =
        resizing === null
            ? events
            : events.map((event) => (event.id === resizing.event.id ? { ...event, start: resizing.start, end: resizing.end } : event))
    const spans = layoutSpans(shown, days)
    const rows = spans.reduce((most, span) => Math.max(most, span.row + 1), 0)
    const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }
    const nowMinutes = now === undefined ? null : now.getHours() * 60 + now.getMinutes()

    // The hours are drawn again once the drag engine is here, so they start at the hour then too.
    useLayoutEffect(() => {
        if (body.current !== null) body.current.scrollTop = Math.max(0, scrollToHour * hourHeight - 12)
    }, [scrollToHour, hourHeight, layer])

    /** The day columns of the hours where they stand now. */
    const dayColumns = () =>
        [...(body.current?.querySelectorAll<HTMLElement>('[data-calendar-day]') ?? [])].map((element) => {
            const rect = element.getBoundingClientRect()
            return { left: rect.left, right: rect.right, top: rect.top }
        })
    /** The minutes before the day's midnight an event began, for a block that goes on from the day before. */
    const lead = (event: E, day: number) => Math.max(0, differenceInMinutes(startOfDay(days[day]), event.start))

    const aim = (carry: CalendarCarry): Landing | null => {
        const event = events.find((each) => each.id === carry.value.id)
        if (event === undefined || carry.point === null) return null
        const placed = dayColumns()
        if (event.allDay === true) {
            const under = (x: number) => placed.findIndex((column) => x >= column.left && x < column.right)
            const to = under(carry.point.x)
            const from = carry.start === null ? -1 : under(carry.start.x)
            return to === -1 || from === -1 ? null : { id: event.id, shift: to - from }
        }
        const box = body.current?.getBoundingClientRect()
        if (box === undefined || carry.point.y < box.top || carry.point.y > box.bottom) return null
        const from = carry.value.day
        if (grab.current === null && carry.start !== null && placed[from] !== undefined) {
            const top = Math.max(0, differenceInMinutes(event.start, startOfDay(days[from])))
            grab.current = ((carry.start.y - placed[from].top) / hourHeight) * 60 - top
        }
        const at = landingAt(carry.point, placed, hourHeight, grab.current ?? 0, snapMinutes)
        return at === null ? null : { id: event.id, day: at.day, minute: at.minute - lead(event, from) }
    }
    const changeOf = (to: Landing): CalendarEventChange<E> | undefined => {
        const event = events.find((each) => each.id === to.id)
        if (event === undefined) return undefined
        const change = 'shift' in to ? movedBy(event, to.shift) : movedTo(event, days[to.day], to.minute)
        return change.start.getTime() === event.start.getTime() ? undefined : change
    }
    const settle = () => {
        grab.current = null
        setLanding(null)
    }

    /** Follows a press on a block's lower edge, or an all-day bar's right end, and hears the end it gives. */
    const resize = (event: E, axis: 'x' | 'y') => (press: ReactPointerEvent<HTMLElement>) => {
        const start = axis === 'y' ? press.clientY : press.clientX
        const width = dayColumns()[0] === undefined ? 1 : dayColumns()[0].right - dayColumns()[0].left
        const changeAt = (point: { x: number; y: number }) =>
            axis === 'y'
                ? resizedBy(event, 0, snapTo(((point.y - start) / hourHeight) * 60, snapMinutes), snapMinutes)
                : resizedBy(event, Math.round((point.x - start) / width))
        followPress(
            press,
            axis === 'y' ? 'row-resize' : 'col-resize',
            (point) => setResizing(changeAt(point)),
            (point) => {
                setResizing(null)
                if (point === null) return
                const change = changeAt(point)
                if (change.end.getTime() !== event.end.getTime()) onEventResize?.(change)
            },
        )
    }

    const changes = (event: E) => keys.changes(event)
    /** The event's control, dragged when the view moves events and the engine is here. */
    const dragged = (event: E, day: number, preview: () => ReactNode, draw: (drag: CalendarEventDrag | undefined) => ReactNode) =>
        layer !== undefined && onEventMove !== undefined && changes(event) ? (
            <layer.CalendarDragEvent kind={kind} id={event.id} day={day} label={event.title} preview={preview}>
                {draw}
            </layer.CalendarDragEvent>
        ) : (
            draw(NO_DRAG)
        )
    /** What every changeable event's control spreads: its drag, its keys and their description. */
    const trigger = (event: E, drag: CalendarEventDrag | undefined) =>
        changes(event)
            ? {
                  ref: drag?.ref,
                  ...drag?.press,
                  'data-event-id': event.id,
                  onKeyDown: keys.keyDown(event),
                  'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight',
                  'aria-description': words.changeKeys,
              }
            : undefined

    const view = (
        <div ref={root} className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
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
                        {spans.map(({ event, start, span, row }) => {
                            const bar = cn(
                                'mx-1 flex min-w-0 items-center rounded-md px-2 text-left text-xs font-medium',
                                KIND_WASH[event.color ?? 'blue'],
                                event.muted === true && 'opacity-60',
                            )
                            const shift = landing !== null && landing.id === event.id && 'shift' in landing ? landing.shift : null
                            return (
                                <Fragment key={event.id}>
                                    {shift !== null && shift !== 0 && (
                                        <span
                                            aria-hidden
                                            className="pointer-events-none mx-1 rounded-md border-2 border-dashed border-primary"
                                            style={{
                                                gridColumn: `${Math.max(1, start + shift + 1)} / span ${Math.max(1, Math.min(span, days.length - start - shift))}`,
                                                gridRow: row + 1,
                                            }}
                                        />
                                    )}
                                    {dragged(
                                        event,
                                        start,
                                        () => (
                                            <div className={cn(bar, 'mx-0 h-full')}>
                                                <span className="truncate">{event.title}</span>
                                            </div>
                                        ),
                                        (drag) => (
                                            <EventPopover
                                                event={event}
                                                open={open === event.id}
                                                onOpenChange={(next) => setOpen(next ? event.id : null)}
                                                detail={renderDetail}
                                                onSelect={onSelectEvent}
                                                side="bottom"
                                                trigger={trigger(event, drag)}
                                                className={cn(
                                                    bar,
                                                    'relative data-open:ring-2 data-open:ring-ring',
                                                    drag?.dragging === true && 'opacity-40',
                                                )}
                                                style={{ gridColumn: `${start + 1} / span ${span}`, gridRow: row + 1 }}
                                            >
                                                <span className="truncate">{event.title}</span>
                                                {onEventResize !== undefined && changes(event) && (
                                                    <span
                                                        aria-hidden
                                                        data-no-drag
                                                        onPointerDown={resize(event, 'x')}
                                                        className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none"
                                                    />
                                                )}
                                            </EventPopover>
                                        ),
                                    )}
                                </Fragment>
                            )
                        })}
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
                        {days.map((day, dayIndex) => {
                            const today = now !== undefined && isSameDay(day, now)
                            const ghost =
                                landing !== null && 'day' in landing && landing.day === dayIndex
                                    ? events.find((each) => each.id === landing.id)
                                    : undefined
                            const column = (ref?: (element: HTMLElement | null) => void) => (
                                <div
                                    key={day.toISOString()}
                                    ref={ref}
                                    data-calendar-day={dayIndex}
                                    className={cn('relative border-l border-border', today && 'bg-primary/[0.03]')}
                                >
                                    {layoutDay(shown, day).map(({ event, from, to, column: lane, columns: share }) => {
                                        const height = Math.max(((to - from) / 60) * hourHeight, hourHeight / 2) - 2
                                        const roomy = height >= 40
                                        // The lines of title a narrow lane has room for, at the block's 16px line height.
                                        const titleLines = Math.max(1, Math.floor((height - (roomy ? 8 : 0)) / 16))
                                        const look = cn(
                                            '@container/event flex flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-xs leading-4',
                                            roomy ? 'py-1' : 'justify-center',
                                            KIND_INK[event.color ?? 'blue'],
                                            KIND_EDGE[event.color ?? 'blue'],
                                            'bg-card [&>*]:relative',
                                            event.muted === true && 'opacity-60',
                                        )
                                        const face = (
                                            <>
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
                                            </>
                                        )
                                        return (
                                            <Fragment key={event.id}>
                                                {dragged(
                                                    event,
                                                    dayIndex,
                                                    () => (
                                                        <div className={cn(look, 'relative h-full shadow-pop')}>{face}</div>
                                                    ),
                                                    (drag) => (
                                                        <EventPopover
                                                            event={event}
                                                            open={open === event.id}
                                                            onOpenChange={(next) => setOpen(next ? event.id : null)}
                                                            detail={renderDetail}
                                                            onSelect={onSelectEvent}
                                                            trigger={trigger(event, drag)}
                                                            className={cn(
                                                                look,
                                                                'absolute shadow-[0_0_0_1px_var(--color-background)] transition-[box-shadow] hover:z-10 data-open:z-20 data-open:ring-2 data-open:ring-ring',
                                                                drag !== undefined && 'touch-manipulation select-none',
                                                                drag?.dragging === true && 'opacity-40',
                                                            )}
                                                            style={{
                                                                top: (from / 60) * hourHeight + 1,
                                                                height,
                                                                left: `calc(${(lane / share) * 100}% + 2px)`,
                                                                width: `calc(${100 / share}% - 4px)`,
                                                            }}
                                                        >
                                                            {face}
                                                            {onEventResize !== undefined && changes(event) && (
                                                                <span
                                                                    aria-hidden
                                                                    data-no-drag
                                                                    onPointerDown={resize(event, 'y')}
                                                                    className="absolute! inset-x-0 bottom-0 h-1.5 cursor-row-resize touch-none"
                                                                />
                                                            )}
                                                        </EventPopover>
                                                    ),
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                    {ghost !== undefined && landing !== null && 'minute' in landing && (
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-x-0.5 z-20 rounded-md border-2 border-dashed border-primary bg-primary/5"
                                            style={{
                                                top: (Math.max(0, landing.minute + lead(ghost, dayIndex)) / 60) * hourHeight + 1,
                                                height:
                                                    Math.max(
                                                        (Math.min(
                                                            differenceInMinutes(ghost.end, ghost.start),
                                                            24 * 60 - landing.minute - lead(ghost, dayIndex),
                                                        ) /
                                                            60) *
                                                            hourHeight,
                                                        hourHeight / 2,
                                                    ) - 2,
                                            }}
                                        />
                                    )}
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
                            return layer === undefined ? (
                                column()
                            ) : (
                                <layer.CalendarDay
                                    key={day.toISOString()}
                                    kind={kind}
                                    index={dayIndex}
                                    label={`${words.weekday(day)} ${words.dayNumber(day)}`}
                                >
                                    {column}
                                </layer.CalendarDay>
                            )
                        })}
                    </div>
                </div>
            </div>
            {keys.live}
        </div>
    )

    if (layer === undefined) return view
    return (
        <layer.CalendarDragArea
            kind={kind}
            onMove={(carry) => {
                const next = aim(carry)
                setLanding((last) => (sameLanding(last, next) ? last : next))
            }}
            onEnd={(carry) => {
                const to = aim(carry)
                settle()
                const change = to === null ? undefined : changeOf(to)
                if (change !== undefined) onEventMove?.(change)
            }}
            onCancel={settle}
        >
            {view}
        </layer.CalendarDragArea>
    )
}
