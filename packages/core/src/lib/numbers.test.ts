import { describe, expect, it } from 'vitest'

import { clampNumber, localeNumber, readNumber, stepNumber, writeNumber } from './numbers'

describe('readNumber', () => {
    it('reads digits with a sign and a point', () => {
        expect(readNumber('3600')).toBe(3600)
        expect(readNumber('-2.5')).toBe(-2.5)
        expect(readNumber('+.5')).toBe(0.5)
        expect(readNumber('4.')).toBe(4)
        expect(readNumber('−3')).toBe(-3)
        expect(readNumber('3 600')).toBe(3600)
    })

    it('refuses what is not a number', () => {
        expect(readNumber('')).toBeNull()
        expect(readNumber('ten')).toBeNull()
        expect(readNumber('1,5')).toBeNull()
        expect(readNumber('1.2.3')).toBeNull()
        expect(readNumber('12ms')).toBeNull()
        expect(readNumber('-')).toBeNull()
        expect(readNumber('1e3')).toBeNull()
    })

    it('reads what writeNumber writes', () => {
        for (const value of [0, 7, -12.25, 3600, 0.001]) expect(readNumber(writeNumber(value))).toBe(value)
    })
})

describe('localeNumber', () => {
    it("writes and reads a locale's decimal mark and groups", () => {
        const norwegian = localeNumber('nb-NO')
        expect(norwegian.parse(norwegian.format(3600.5))).toBe(3600.5)
        expect(norwegian.parse('3 600,5')).toBe(3600.5)
        expect(norwegian.parse(norwegian.format(-2))).toBe(-2)
        const german = localeNumber('de-DE')
        expect(german.format(1250.5)).toBe('1.250,5')
        expect(german.parse('1.250,5')).toBe(1250.5)
        expect(german.parse('1250,5')).toBe(1250.5)
        const american = localeNumber('en-US')
        expect(american.parse('1,250.5')).toBe(1250.5)
        expect(american.parse('twelve')).toBeNull()
    })
})

describe('clampNumber', () => {
    it('keeps a number within the bounds there are', () => {
        expect(clampNumber(7200, 1, 3600)).toBe(3600)
        expect(clampNumber(-1, 0)).toBe(0)
        expect(clampNumber(5)).toBe(5)
    })
})

describe('stepNumber', () => {
    it('steps by the step', () => {
        expect(stepNumber(3, 1)).toBe(4)
        expect(stepNumber(3, -1)).toBe(2)
        expect(stepNumber(30, 10, { step: 5 })).toBe(80)
    })

    it('moves a value between steps to the next step in that direction', () => {
        expect(stepNumber(7, 1, { step: 5 })).toBe(10)
        expect(stepNumber(7, -1, { step: 5 })).toBe(5)
    })

    it('steps on the grid from min', () => {
        expect(stepNumber(1, 1, { step: 30, min: 1 })).toBe(31)
        expect(stepNumber(10, 1, { step: 30, min: 1 })).toBe(31)
    })

    it('stays within the bounds', () => {
        expect(stepNumber(3600, 1, { step: 30, min: 1, max: 3600 })).toBe(3600)
        expect(stepNumber(7200, -1, { min: 1, max: 3600 })).toBe(3600)
        expect(stepNumber(0, -1, { min: 0 })).toBe(0)
    })

    it('starts an empty value at 0, within the bounds', () => {
        expect(stepNumber(null, 1)).toBe(0)
        expect(stepNumber(null, 1, { min: 1 })).toBe(1)
        expect(stepNumber(null, -1, { max: -5 })).toBe(-5)
    })

    it('adds decimals without drift', () => {
        expect(stepNumber(0.1, 1, { step: 0.1 })).toBe(0.2)
        expect(stepNumber(0.2, 1, { step: 0.1 })).toBe(0.3)
        expect(stepNumber(1.15, 1, { step: 0.05 })).toBe(1.2)
    })
})
