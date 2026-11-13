import { addDays, addMinutes, differenceInCalendarDays, differenceInMinutes, startOfDay } from 'date-fns'

import type { CalendarEvent } from './events'

/** An event moved or resized: the event as it was, and where it now starts and ends. */
export interface CalendarEventChange<E extends CalendarEvent = CalendarEvent> {
    event: E
    start: Date
    end: Date
}

/** The minutes an event is moved and resized by when nothing else is said: a quarter of an hour. */
export const SNAP_MINUTES = 15

/** Minutes rounded to the nearest step. */
export function snapTo(minutes: number, step: number): number {
    return Math.round(minutes / step) * step
}

/** The event moved by whole days and minutes, keeping its length. */
export function movedBy<E extends CalendarEvent>(event: E, days: number, minutes = 0): CalendarEventChange<E> {
    return { event, start: addMinutes(addDays(event.start, days), minutes), end: addMinutes(addDays(event.end, days), minutes) }
}

/** The event moved to start on `day` at `minute` past its midnight, keeping its length. */
export function movedTo<E extends CalendarEvent>(event: E, day: Date, minute: number): CalendarEventChange<E> {
    const start = addMinutes(startOfDay(day), minute)
    return { event, start, end: addMinutes(start, differenceInMinutes(event.end, event.start)) }
}

/**
 * The event with its end moved by minutes or whole days, never to or before its start: a timed
 * event keeps at least `least` minutes, and an all-day one, whose end is its last day, at least
 * its first day.
 */
export function resizedBy<E extends CalendarEvent>(event: E, days: number, minutes = 0, least = SNAP_MINUTES): CalendarEventChange<E> {
    const end = addMinutes(addDays(event.end, days), minutes)
    if (event.allDay === true) return { event, start: event.start, end: differenceInCalendarDays(end, event.start) < 0 ? event.start : end }
    return { event, start: event.start, end: differenceInMinutes(end, event.start) < least ? addMinutes(event.start, least) : end }
}

/** A day column's place on the screen, from left to right. */
export interface DayColumn {
    left: number
    right: number
    top: number
}

/**
 * Where a timed event held at `point` lands in the week's hours: the day of the column under the
 * pointer, and the minute its top reaches, the pointer having taken it `grab` minutes below its
 * top, snapped to `step` and kept inside the day. Null with the pointer beside every column.
 */
export function landingAt(
    point: { x: number; y: number },
    columns: readonly DayColumn[],
    hourHeight: number,
    grab: number,
    step: number,
): { day: number; minute: number } | null {
    const day = columns.findIndex((column) => point.x >= column.left && point.x < column.right)
    if (day === -1) return null
    const minute = snapTo(((point.y - columns[day].top) / hourHeight) * 60 - grab, step)
    return { day, minute: Math.min(Math.max(minute, 0), 24 * 60 - step) }
}

/** The change an arrow key with Alt makes to an event, or undefined for another key: Shift with it resizes. */
export function keyChange<E extends CalendarEvent>(
    event: E,
    key: string,
    shift: boolean,
    view: 'week' | 'month',
    step: number,
): { change: CalendarEventChange<E>; resize: boolean } | undefined {
    const down = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
    const right = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
    if (down === 0 && right === 0) return undefined
    if (view === 'week') {
        const timed = event.allDay !== true
        if (shift) {
            if (timed && down !== 0) return { change: resizedBy(event, 0, down * step, step), resize: true }
            if (!timed && right !== 0) return { change: resizedBy(event, right), resize: true }
            return undefined
        }
        if (down !== 0) return timed ? { change: movedBy(event, 0, down * step), resize: false } : undefined
        return { change: movedBy(event, right), resize: false }
    }
    if (shift) return right === 0 ? undefined : { change: resizedBy(event, right, 0, step), resize: true }
    return { change: movedBy(event, right + down * 7), resize: false }
}
