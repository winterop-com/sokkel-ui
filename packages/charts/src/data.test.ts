import { describe, expect, it } from 'vitest'

import { aggregate, asShares, distinct, formatTick, pivot, quantile } from './data'
import { compactWritten, tickWriter } from './kinds/axes'

describe('formatTick', () => {
    it('keeps the ticks of a small range apart', () => {
        expect([0, 0.05, 0.1, 0.15, 0.2].map(formatTick)).toEqual(['0', '0.05', '0.1', '0.15', '0.2'])
    })

    it('writes a large value short', () => {
        expect([formatTick(1250), formatTick(42), formatTick(2.5)]).toEqual(['1.3K', '42', '2.5'])
    })
})

describe('tickWriter', () => {
    const gb = (value: number) => `${value.toLocaleString('en-US')} GB`

    it('writes ticks short with the unit alone without a format', () => {
        expect([0, 500, 1500].map(tickWriter(undefined, ' s'))).toEqual(['0 s', '500 s', '1.5K s'])
    })

    it('writes ticks by the format, its figure short', () => {
        expect([0, 500, 1500, 2_000_000].map(tickWriter(gb))).toEqual(['0 GB', '500 GB', '1.5K GB', '2M GB'])
        expect(tickWriter((value) => `$${value.toFixed(2)}`)(1250)).toBe('$1.3K')
        expect(tickWriter(gb, '/s')(1500)).toBe('1.5K GB/s')
    })

    it('keeps a sign the format writes on its own', () => {
        const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value).toLocaleString('en-US')}`
        expect([-2500, 2500].map(tickWriter(signed))).toEqual(['−2.5K', '+2.5K'])
        expect(tickWriter(gb)(-1500)).toBe('-1.5K GB')
    })

    it("keeps a format's text where it writes another figure", () => {
        const bytes = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(2)} TB` : `${String(value)} GB`)
        expect([500, 1500].map(tickWriter(bytes))).toEqual(['500 GB', '1.50 TB'])
        expect(compactWritten('25%', 0.25)).toBe('25%')
        expect(compactWritten('1m 30s', 90)).toBe('1m 30s')
        expect(compactWritten('none', 4)).toBe('none')
    })

    it("drops a format's trailing zeros on a round tick", () => {
        expect(tickWriter((value) => `${value.toFixed(1)}s`)(30)).toBe('30s')
    })
})

const ROWS = [
    { job: 'nightly-export', state: 'succeeded', duration: 100 },
    { job: 'nightly-export', state: 'failed', duration: 40 },
    { job: 'sync-inventory', state: 'succeeded', duration: 60 },
    { job: 'nightly-export', state: 'succeeded', duration: 140 },
    { job: 'sync-inventory', state: 'succeeded', duration: 'n/a' },
]

describe('the chart data', () => {
    it('combines values each way', () => {
        expect(aggregate([1, 2, 3, 10], 'sum')).toBe(16)
        expect(aggregate([1, 2, 3, 10], 'count')).toBe(4)
        expect(aggregate([1, 2, 3, 10], 'avg')).toBe(4)
        expect(aggregate([1, 2, 3, 10], 'median')).toBe(2.5)
        expect(aggregate([], 'sum')).toBeNull()
        expect(aggregate([], 'count')).toBe(0)
        expect(quantile([0, 10], 0.9)).toBe(9)
    })

    it('keeps the order rows give, with a named order first', () => {
        expect(distinct(ROWS, 'job')).toEqual(['nightly-export', 'sync-inventory'])
        expect(distinct(ROWS, 'job', ['sync-inventory'])).toEqual(['sync-inventory', 'nightly-export'])
    })

    it('counts the rows when no y is given', () => {
        expect(pivot({ rows: ROWS, x: 'job' })).toEqual({
            categories: ['nightly-export', 'sync-inventory'],
            series: [{ name: 'Count', values: [3, 2] }],
        })
    })

    it('gives a category the order names twice a place for each, its rows in turn', () => {
        const rows = [
            { at: '19:32', v: 1 },
            { at: '19:32', v: 2 },
            { at: '19:33', v: 3 },
        ]
        expect(pivot({ rows, x: 'at', y: 'v', order: ['19:32', '19:32', '19:33'] })).toEqual({
            categories: ['19:32', '19:32', '19:33'],
            series: [{ name: 'v', values: [1, 2, 3] }],
        })
        expect(pivot({ rows, x: 'at', y: 'v' }).series).toEqual([{ name: 'v', values: [3, 3] }])
    })

    it('splits by series and skips values that are not numbers', () => {
        const data = pivot({ rows: ROWS, x: 'job', y: 'duration', series: 'state', aggregate: 'avg' })
        expect(data.series).toEqual([
            { name: 'succeeded', values: [120, 60] },
            { name: 'failed', values: [40, null] },
        ])
    })

    it('turns each category into shares of its total', () => {
        expect(
            asShares([
                { name: 'a', values: [1, 0] },
                { name: 'b', values: [3, 0] },
            ]),
        ).toEqual([
            { name: 'a', values: [25, null] },
            { name: 'b', values: [75, null] },
        ])
    })
})
