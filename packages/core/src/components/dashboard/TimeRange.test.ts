import { describe, expect, test } from 'vitest'

import { rangeLabel, sameRange } from './TimeRange'

describe('a custom range for a reader', () => {
    test('names both days and the year once', () => {
        expect(rangeLabel(new Date(2026, 9, 3), new Date(2026, 9, 17))).toBe('Oct 3 to Oct 17, 2026')
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
