import { describe, expect, test } from 'vitest'

import { rangeLabel } from './TimeRange'

describe('a custom range for a reader', () => {
    test('names both days and the year once', () => {
        expect(rangeLabel(new Date(2026, 9, 3), new Date(2026, 9, 17))).toBe('Oct 3 to Oct 17, 2026')
    })
})
