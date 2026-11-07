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

    it('keeps the zoom when a panel drops but the days stay, and opens afresh on other days', () => {
        const days = ['Aug 1', 'Aug 2', 'Aug 3']
        const three = { ...ASKED, xAxis: [{ data: days }, { data: days }, { data: days }] }
        const two = { ...ASKED, xAxis: [{ data: days }, { data: days }] }
        expect(keepZoom(three, two, READER).dataZoom).toEqual([
            { type: 'inside', start: 10, end: 20 },
            { type: 'slider', start: 10, end: 20 },
        ])
        const week = { ...ASKED, xAxis: [{ data: ['Oct 24', 'Oct 25'] }] }
        expect(keepZoom(three, week, READER)).toBe(week)
    })

    it('opens afresh when a chart without categories draws other data', () => {
        const before = { ...ASKED, series: [{ type: 'line', data: [[1, 2]] }] }
        const same = { ...ASKED, series: [{ type: 'line', data: [[1, 2]] }] }
        const other = { ...ASKED, series: [{ type: 'line', data: [[5, 6]] }] }
        expect(keepZoom(before, same, READER).dataZoom).not.toBe(same.dataZoom)
        expect(keepZoom(before, other, READER)).toBe(other)
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
