import { describe, expect, test } from 'vitest'

import { eventsOn, layoutDay, layoutSpans, weekOf, type CalendarEvent } from './events'

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute)

const timed = (id: string, from: Date, to: Date): CalendarEvent => ({ id, title: id, start: from, end: to })

describe('a day of timed events', () => {
    test('gives events that do not overlap the full width', () => {
        const placed = layoutDay([timed('a', at(5, 9), at(5, 10)), timed('b', at(5, 10), at(5, 11))], at(5, 0))
        expect(placed.map((item) => [item.event.id, item.column, item.columns])).toEqual([
            ['a', 0, 1],
            ['b', 0, 1],
        ])
    })

    test('splits a cluster of overlapping events into columns, reusing a column once it is free', () => {
        const placed = layoutDay(
            [
                timed('review', at(5, 13), at(5, 14)),
                timed('one-on-one', at(5, 13), at(5, 13, 30)),
                timed('deploy', at(5, 13, 30), at(5, 14, 15)),
                timed('later', at(5, 15), at(5, 16)),
            ],
            at(5, 0),
        )
        expect(placed.map((item) => [item.event.id, item.column, item.columns])).toEqual([
            ['review', 0, 2],
            ['one-on-one', 1, 2],
            ['deploy', 1, 2],
            ['later', 0, 1],
        ])
    })

    test('lays a short event out at the height it is drawn', () => {
        const placed = layoutDay([timed('blip', at(5, 9), at(5, 9, 5)), timed('next', at(5, 9, 15), at(5, 10))], at(5, 0))
        expect(placed.map((item) => item.columns)).toEqual([2, 2])
    })

    test('clips an event that crosses midnight to the day', () => {
        const [placed] = layoutDay([timed('overnight', at(4, 23), at(5, 2))], at(5, 0))
        expect([placed.from, placed.to]).toEqual([0, 120])
    })
})

describe('all-day events', () => {
    const week = weekOf(at(5, 9))

    test('start on the Monday of the week', () => {
        expect(week[0]).toEqual(at(2, 0))
        expect(week).toHaveLength(7)
    })

    test('stack into the fewest rows, clipped to the strip', () => {
        const spans = layoutSpans(
            [
                { id: 'call', title: 'call', start: at(2, 0), end: at(4, 0), allDay: true },
                { id: 'away', title: 'away', start: at(5, 0), end: at(9, 0), allDay: true },
                { id: 'release', title: 'release', start: at(3, 0), end: at(3, 0), allDay: true },
            ],
            week,
        )
        expect(spans.map((item) => [item.event.id, item.start, item.span, item.row])).toEqual([
            ['call', 0, 3, 0],
            ['release', 1, 1, 1],
            ['away', 3, 4, 0],
        ])
    })

    test('come first among the events of a day', () => {
        const events = [
            timed('standup', at(5, 9, 15), at(5, 9, 30)),
            { id: 'away', title: 'away', start: at(5, 0), end: at(6, 0), allDay: true },
        ]
        expect(eventsOn(events, at(5, 0)).map((event) => event.id)).toEqual(['away', 'standup'])
        expect(eventsOn(events, at(6, 0)).map((event) => event.id)).toEqual(['away'])
    })
})
