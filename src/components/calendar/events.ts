import { addDays, differenceInCalendarDays, endOfDay, format, isBefore, max, min, startOfDay } from 'date-fns'

import type { KindColor } from '../../lib/kind'

/**
 * One thing on a calendar: a job's run, a meeting, a day away. A timed event runs from `start`
 * to `end`; an all-day event covers the days from `start` to `end`, both included.
 */
export interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    allDay?: boolean
    /** The color of the calendar it belongs to. */
    color?: KindColor
    /** A short line under the title: a host, a room. */
    detail?: string
    /** Drawn faded, as an event that was cancelled or skipped. */
    muted?: boolean
}

/** A timed event placed in a day's column: which share of the width it takes, and where. */
export interface PlacedEvent<E extends CalendarEvent = CalendarEvent> {
    event: E
    /** Minutes from the day's midnight to the event's start and end, clipped to the day. */
    from: number
    to: number
    /** The column it stands in, counted from 0, and how many columns its cluster splits into. */
    column: number
    columns: number
}

/**
 * The timed events that touch `day`, laid out to split the width where they overlap: events that
 * overlap, directly or through others, form a cluster, each event takes the first column free at
 * its start, and every event of a cluster shares the cluster's column count. An event shorter
 * than `minMinutes` is laid out as if it lasted that long, since that is how tall it is drawn.
 */
export function layoutDay<E extends CalendarEvent>(events: readonly E[], day: Date, minMinutes = 30): PlacedEvent<E>[] {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const touching = events
        .filter((event) => event.allDay !== true && isBefore(event.start, dayEnd) && event.end > dayStart)
        .map((event) => {
            const from = minutesInto(max([event.start, dayStart]), dayStart)
            const to = event.end > dayEnd ? 24 * 60 : minutesInto(min([event.end, dayEnd]), dayStart)
            return { event, from, to, shown: Math.min(24 * 60, Math.max(to, from + minMinutes)), column: 0, columns: 1 }
        })
        .sort((a, b) => a.from - b.from || b.to - a.to)

    const placed: PlacedEvent<E>[] = []
    let cluster: typeof touching = []
    let ends: number[] = []
    let clusterEnd = -1
    const close = () => {
        for (const item of cluster) item.columns = ends.length
        cluster = []
        ends = []
    }
    for (const item of touching) {
        if (item.from >= clusterEnd) close()
        let column = ends.findIndex((end) => end <= item.from)
        if (column === -1) {
            column = ends.length
            ends.push(item.shown)
        } else {
            ends[column] = item.shown
        }
        item.column = column
        cluster.push(item)
        clusterEnd = Math.max(clusterEnd, item.shown)
    }
    close()
    for (const { event, from, to, column, columns } of touching) placed.push({ event, from, to, column, columns })
    return placed
}

function minutesInto(date: Date, dayStart: Date): number {
    return Math.round((date.getTime() - dayStart.getTime()) / 60_000)
}

/** An all-day event placed on a strip of days: its first day's index, how many days it spans, and its row. */
export interface PlacedSpan<E extends CalendarEvent = CalendarEvent> {
    event: E
    start: number
    span: number
    row: number
}

/**
 * The all-day events that touch `days`, each clipped to them and set in the first row where it
 * fits, longer ones first, so the strip is as short as it can be.
 */
export function layoutSpans<E extends CalendarEvent>(events: readonly E[], days: readonly Date[]): PlacedSpan<E>[] {
    if (days.length === 0) return []
    const first = startOfDay(days[0])
    const last = days.length - 1
    const spans = events
        .filter((event) => event.allDay === true)
        .map((event) => {
            const start = Math.max(0, differenceInCalendarDays(event.start, first))
            const end = Math.min(last, differenceInCalendarDays(event.end, first))
            return { event, start, span: end - start + 1, row: 0 }
        })
        .filter((item) => item.span > 0 && item.start <= last)
        .sort((a, b) => a.start - b.start || b.span - a.span)
    const rows: number[] = []
    for (const item of spans) {
        let row = rows.findIndex((free) => free <= item.start)
        if (row === -1) {
            row = rows.length
            rows.push(0)
        }
        rows[row] = item.start + item.span
        item.row = row
    }
    return spans
}

/** The events on one day, all-day ones first, then by when they start. */
export function eventsOn<E extends CalendarEvent>(events: readonly E[], day: Date): E[] {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    return events
        .filter((event) =>
            event.allDay === true
                ? startOfDay(event.start) <= dayStart && startOfDay(event.end) >= dayStart
                : isBefore(event.start, dayEnd) && event.end > dayStart,
        )
        .sort((a, b) => Number(b.allDay === true) - Number(a.allDay === true) || a.start.getTime() - b.start.getTime())
}

/** The days of the week that holds `day`. */
export function weekOf(day: Date, weekStartsOn: 0 | 1 = 1): Date[] {
    const start = startOfDay(addDays(day, -((day.getDay() - weekStartsOn + 7) % 7)))
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

/** The words every calendar view shares, with English defaults. */
export interface CalendarWords {
    allDay: string
    /** A time of day, as `09:30`. */
    time: (date: Date) => string
    /** An hour on the grid's gutter, as `09:00`. */
    hour: (hour: number) => string
    /** A weekday's short name. */
    weekday: (date: Date) => string
    /** A day's number in its month. */
    dayNumber: (date: Date) => string
    /** The cue under the events a full day has no room for. */
    more: (count: number) => string
    now: string
    empty: string
}

export const CALENDAR_WORDS: CalendarWords = {
    allDay: 'All day',
    time: (date) => format(date, 'HH:mm'),
    hour: (hour) => `${String(hour).padStart(2, '0')}:00`,
    weekday: (date) => format(date, 'EEE'),
    dayNumber: (date) => format(date, 'd'),
    more: (count) => `+${count} more`,
    now: 'Now',
    empty: 'Nothing scheduled',
}
