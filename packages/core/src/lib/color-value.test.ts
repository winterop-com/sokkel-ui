import { describe, expect, it } from 'vitest'

import { fromHsv, readColor, toHsv } from './color-value'

describe('readColor', () => {
    it('reads six and three digits, with or without the hash, in any case', () => {
        expect(readColor('#1E90FF')).toBe('#1e90ff')
        expect(readColor('1e90ff')).toBe('#1e90ff')
        expect(readColor('#abc')).toBe('#aabbcc')
    })

    it('reads rgb()', () => {
        expect(readColor('rgb(30, 144, 255)')).toBe('#1e90ff')
    })

    it('refuses what is not a color', () => {
        expect(readColor('blue')).toBeNull()
        expect(readColor('#12345')).toBeNull()
        expect(readColor('rgb(300, 0, 0)')).toBeNull()
    })
})

describe('toHsv and fromHsv', () => {
    it('go there and back', () => {
        for (const hex of ['#1e90ff', '#ff0000', '#00ff00', '#808080', '#000000', '#ffffff', '#c0ffee'])
            expect(fromHsv(toHsv(hex))).toBe(hex)
    })

    it('reads a pure red as hue 0, full saturation and value', () => {
        expect(toHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 })
    })
})
