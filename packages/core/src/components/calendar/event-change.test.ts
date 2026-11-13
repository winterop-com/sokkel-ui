import { describe, expect, test } from 'vitest'

import { keyChange, landingAt, movedBy, movedTo, resizedBy, snapTo } from './event-change'
import type { CalendarEvent } from './events'

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute)

const review: CalendarEvent = { id: 'review', title: 'Release review', start: at(5, 9), end: at(5, 10, 30) }
const away: CalendarEvent = { id: 'away', title: 'grace away', start: at(5, 0), end: at(6, 0), allDay: true }

describe('an event moved', () => {
    test('keeps its length, moved by days and minutes or to a day and a minute', () => {
        expect(movedBy(review, 1, 30)).toMatchObject({ start: at(6, 9, 30), end: at(6, 11) })
        expect(movedTo(review, at(7, 0), 14 * 60)).toMatchObject({ start: at(7, 14), end: at(7, 15, 30) })
    })

    test('snaps minutes to the nearest step', () => {
        expect(snapTo(52, 15)).toBe(45)
        expect(snapTo(53, 15)).toBe(60)
    })
})

describe('an event resized', () => {
    test('moves its end, never closer to its start than the least it may last', () => {
        expect(resizedBy(review, 0, 30)).toMatchObject({ start: at(5, 9), end: at(5, 11) })
        expect(resizedBy(review, 0, -120)).toMatchObject({ start: at(5, 9), end: at(5, 9, 15) })
    })

    test('moves an all-day event by its last day, never before its first', () => {
        expect(resizedBy(away, 2)).toMatchObject({ start: at(5, 0), end: at(8, 0) })
        expect(resizedBy(away, -3)).toMatchObject({ start: at(5, 0), end: at(5, 0) })
    })
})

describe('where a dragged event lands in the week', () => {
    // Three day columns 100 pixels wide, their midnight at 50, an hour 48 pixels tall.
    const columns = [0, 100, 200].map((left) => ({ left, right: left + 100, top: 50 }))

    test('takes the day of the column under the pointer, its top a snapped minute below the grab', () => {
        // The pointer at 10:00 in the second column, having grabbed the event half an hour below its top.
        expect(landingAt({ x: 150, y: 50 + 10 * 48 }, columns, 48, 30, 15)).toEqual({ day: 1, minute: 9 * 60 + 30 })
    })

    test('keeps the event inside the day, and lands nowhere beside every column', () => {
        expect(landingAt({ x: 250, y: 40 }, columns, 48, 0, 15)).toEqual({ day: 2, minute: 0 })
        expect(landingAt({ x: 250, y: 50 + 25 * 48 }, columns, 48, 0, 15)).toEqual({ day: 2, minute: 24 * 60 - 15 })
        expect(landingAt({ x: 320, y: 100 }, columns, 48, 0, 15)).toBeNull()
    })
})

describe('an event changed from the keyboard', () => {
    test('moves a quarter of an hour up and down and a day sideways in the week, and resizes with Shift', () => {
        expect(keyChange(review, 'ArrowDown', false, 'week', 15)?.change).toMatchObject({ start: at(5, 9, 15) })
        expect(keyChange(review, 'ArrowLeft', false, 'week', 15)?.change).toMatchObject({ start: at(4, 9) })
        expect(keyChange(review, 'ArrowUp', true, 'week', 15)).toMatchObject({ resize: true, change: { end: at(5, 10, 15) } })
        expect(keyChange(review, 'Enter', false, 'week', 15)).toBeUndefined()
    })

    test('moves an all-day event only by days in the week', () => {
        expect(keyChange(away, 'ArrowDown', false, 'week', 15)).toBeUndefined()
        expect(keyChange(away, 'ArrowRight', true, 'week', 15)).toMatchObject({ resize: true, change: { end: at(7, 0) } })
    })

    test('moves a day sideways and a week up and down in the month, and resizes by days with Shift', () => {
        expect(keyChange(review, 'ArrowUp', false, 'month', 15)?.change).toMatchObject({ start: new Date(2026, 9, 29, 9) })
        expect(keyChange(review, 'ArrowRight', false, 'month', 15)?.change).toMatchObject({ start: at(6, 9) })
        expect(keyChange(review, 'ArrowRight', true, 'month', 15)).toMatchObject({ resize: true, change: { end: at(6, 10, 30) } })
    })
})
