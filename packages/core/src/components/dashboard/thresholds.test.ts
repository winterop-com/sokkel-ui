import { describe, expect, test } from 'vitest'

import { formatValue, thresholdColor } from './thresholds'

const STEPS = [{ color: 'critical' }, { value: 90, color: 'warning' }, { value: 99, color: 'good' }]

describe('a reading on a threshold scale', () => {
    test('takes the color of the highest step it reaches', () => {
        expect(thresholdColor(42, STEPS)).toBe('critical')
        expect(thresholdColor(90, STEPS)).toBe('warning')
        expect(thresholdColor(99.3, STEPS)).toBe('good')
    })

    test('takes the first step when it has no value', () => {
        expect(thresholdColor(null, STEPS)).toBe('critical')
        expect(thresholdColor(5, undefined)).toBeUndefined()
    })
})

describe('a number for a reader', () => {
    test('groups thousands and keeps the decimals it is given', () => {
        expect(formatValue(1847)).toBe('1,847')
        expect(formatValue(99.34, 1)).toBe('99.3')
        expect(formatValue(4.25)).toBe('4.3')
        expect(formatValue(4.2, 2)).toBe('4.20')
    })
})
