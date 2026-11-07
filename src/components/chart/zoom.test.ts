import { describe, expect, it } from 'vitest'

import { keepZoom } from './zoom'

const ASKED = {
    dataZoom: [
        { type: 'inside', startValue: 'Aug 1', endValue: 'Aug 31' },
        { type: 'slider', startValue: 'Aug 1', endValue: 'Aug 31' },
    ],
}
const READER = [
    { start: 10, end: 20 },
    { start: 10, end: 20 },
]

describe('the zoom on a redraw', () => {
    it('keeps where the reader zoomed when the option asks for the same window', () => {
        const next = { ...ASKED, series: [] }
        expect(keepZoom(ASKED, next, READER).dataZoom).toEqual([
            { type: 'inside', start: 10, end: 20 },
            { type: 'slider', start: 10, end: 20 },
        ])
    })

    it('opens where the option asks when it asks for another window', () => {
        const next = {
            dataZoom: [
                { type: 'inside', start: 0, end: 50 },
                { type: 'slider', start: 0, end: 50 },
            ],
        }
        expect(keepZoom(ASKED, next, READER)).toBe(next)
    })

    it('opens where the option asks on the first draw, or when the zooms differ', () => {
        expect(keepZoom(null, ASKED, READER)).toBe(ASKED)
        expect(keepZoom(ASKED, ASKED, [{ start: 10, end: 20 }])).toBe(ASKED)
        const plain = { series: [] }
        expect(keepZoom(plain, plain, [])).toBe(plain)
    })
})
