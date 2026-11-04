import { describe, expect, test } from 'vitest'

import { formatRemaining, formatTime } from './time'

describe('a media clock', () => {
    test('reads minutes and padded seconds under an hour', () => {
        expect(formatTime(0)).toBe('0:00')
        expect(formatTime(5)).toBe('0:05')
        expect(formatTime(65)).toBe('1:05')
        expect(formatTime(599)).toBe('9:59')
        expect(formatTime(3599)).toBe('59:59')
    })

    test('adds hours and pads the minutes from an hour on', () => {
        expect(formatTime(3600)).toBe('1:00:00')
        expect(formatTime(3725)).toBe('1:02:05')
        expect(formatTime(36_000)).toBe('10:00:00')
    })

    test('drops fractions rather than rounding up', () => {
        expect(formatTime(59.99)).toBe('0:59')
        expect(formatTime(0.4)).toBe('0:00')
    })

    test('reads zero for an unknown, infinite or negative length', () => {
        expect(formatTime(Number.NaN)).toBe('0:00')
        expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00')
        expect(formatTime(-12)).toBe('0:00')
    })

    test('counts what is left down with a minus sign, never below zero', () => {
        expect(formatRemaining(30, 245)).toBe('−3:35')
        expect(formatRemaining(300, 245)).toBe('−0:00')
        expect(formatRemaining(Number.NaN, 245)).toBe('−4:05')
    })
})
