import { describe, expect, it } from 'vitest'

import { aggregate, asShares, distinct, pivot, quantile } from './data'

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
