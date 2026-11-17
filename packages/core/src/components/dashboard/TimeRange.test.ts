import { describe, expect, test } from 'vitest'

import { atTime, rangeLabel, sameRange, timeOfDay } from './TimeRange'

describe('a custom range for a reader', () => {
    test('names both days and the year once', () => {
        expect(rangeLabel(new Date(2026, 9, 3), new Date(2026, 9, 17))).toBe('Oct 3 to Oct 17, 2026')
    })

    test('writes the times where an end is not at midnight, once for the day within one', () => {
        expect(rangeLabel(new Date(2026, 9, 3, 9), new Date(2026, 9, 17, 17, 30))).toBe('Oct 3, 09:00 to Oct 17, 2026, 17:30')
        expect(rangeLabel(new Date(2026, 9, 3, 9), new Date(2026, 9, 3, 17, 30))).toBe('Oct 3, 2026, 09:00 to 17:30')
        expect(rangeLabel(new Date(2026, 9, 3, 9), new Date(2026, 9, 3, 17, 30), 'en-US', 12)).toBe('Oct 3, 2026, 09:00 AM to 05:30 PM')
    })
})

describe('a time of day', () => {
    test('is read from a moment and set on a day', () => {
        expect(timeOfDay(new Date(2026, 9, 3, 7, 5))).toBe('07:05')
        expect(atTime(new Date(2026, 9, 3), '17:30')).toEqual(new Date(2026, 9, 3, 17, 30))
        expect(atTime(new Date(2026, 9, 3, 12), '06:15:30')).toEqual(new Date(2026, 9, 3, 6, 15, 30))
    })
})

describe('two ranges compared', () => {
    test('are the same for one preset or one span of days, built afresh or not', () => {
        expect(sameRange({ preset: '7d' }, { preset: '7d' })).toBe(true)
        expect(sameRange({ preset: '7d' }, { preset: '30d' })).toBe(false)
        const span = { from: new Date(2026, 9, 3), to: new Date(2026, 9, 17) }
        expect(sameRange(span, { from: new Date(2026, 9, 3), to: new Date(2026, 9, 17) })).toBe(true)
        expect(sameRange(span, { from: new Date(2026, 9, 3), to: new Date(2026, 9, 18) })).toBe(false)
        expect(sameRange(span, { preset: '7d' })).toBe(false)
    })
})
