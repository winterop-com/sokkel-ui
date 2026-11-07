import { describe, expect, it } from 'vitest'

import { formatPercent } from './percent'

describe('formatPercent', () => {
    it('writes a share as a whole percent', () => {
        expect(formatPercent(0)).toBe('0%')
        expect(formatPercent(0.42)).toBe('42%')
        expect(formatPercent(0.004)).toBe('<1%')
        expect(formatPercent(0.125)).toBe('13%')
        expect(formatPercent(1)).toBe('100%')
    })

    it('never rounds a share to nothing or to certain', () => {
        expect(formatPercent(0.001)).toBe('<1%')
        expect(formatPercent(0.996)).toBe('>99%')
    })

    it('holds values outside 0 to 1 to it', () => {
        expect(formatPercent(-0.2)).toBe('0%')
        expect(formatPercent(1.5)).toBe('100%')
        expect(formatPercent(Number.NaN)).toBe('0%')
    })
})
