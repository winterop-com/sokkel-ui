import { describe, expect, it } from 'vitest'

import { fitCount } from './TagChips'

describe('fitCount', () => {
    it('shows every chip when all of them fit', () => {
        expect(fitCount([40, 50, 30], 128, 4, 24)).toBe(3)
    })

    it('keeps room for the count of the rest', () => {
        // 40 + 4 + 50 + 4 + 24 = 122 fits 125; a third chip would not.
        expect(fitCount([40, 50, 30], 125, 4, 24)).toBe(2)
    })

    it('stops at the first chip that does not fit, keeping the order', () => {
        expect(fitCount([40, 200, 10], 120, 4, 24)).toBe(1)
    })

    it('shows none when only the count fits', () => {
        expect(fitCount([80, 80], 60, 4, 24)).toBe(0)
    })

    it('shows none of none', () => {
        expect(fitCount([], 0, 4, 24)).toBe(0)
    })
})
