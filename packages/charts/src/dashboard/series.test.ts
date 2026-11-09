import { describe, expect, it } from 'vitest'

import { axisWriter } from './series'

describe('axisWriter', () => {
    it('keeps the ticks of a small range apart', () => {
        const write = axisWriter('%')
        expect([0, 0.05, 0.1, 0.15, 0.2].map(write)).toEqual(['0%', '0.05%', '0.1%', '0.15%', '0.2%'])
    })

    it('writes a large value short', () => {
        const write = axisWriter()
        expect(write(1250)).toBe('1.3K')
        expect(write(42)).toBe('42')
        expect(write(2.5)).toBe('2.5')
    })
})
