import { describe, expect, it } from 'vitest'

import { meterTone } from './meter'

describe('meterTone', () => {
    it('has no tone without bounds', () => {
        expect(meterTone(90, undefined, undefined)).toBe('none')
    })

    it('reads a fuller bar as worse by default', () => {
        expect([40, 70, 80, 95].map((value) => meterTone(value, 70, 90))).toEqual(['good', 'good', 'warning', 'critical'])
    })

    it('reads an emptier bar as worse with the high end good', () => {
        expect([80, 50, 30, 10].map((value) => meterTone(value, 20, 50, 'high'))).toEqual(['good', 'good', 'warning', 'critical'])
    })

    it('takes one bound as both', () => {
        expect([50, 85].map((value) => meterTone(value, undefined, 80))).toEqual(['good', 'critical'])
    })
})
