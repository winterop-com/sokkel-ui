import { describe, expect, it } from 'vitest'

import { aggregateAt, pivot } from './data'
import { binCounts, binOf, binsFor, niceCeil, niceStep, runningTotals, spreadOf, stepAt } from './stats'

describe('the chart statistics', () => {
    it('steps and rounds up in numbers a reader counts in', () => {
        expect(niceStep(19.4)).toBe(20)
        expect(niceStep(0.3)).toBe(0.25)
        expect(niceStep(2.2)).toBe(2)
        expect(niceStep(12.8)).toBe(10)
        expect(niceStep(100)).toBe(100)
        expect(niceCeil(97)).toBe(100)
        expect(niceCeil(4630)).toBe(5000)
        expect(niceCeil(100)).toBe(100)
        expect(niceCeil(0)).toBe(1)
    })

    it('bins numbers on round edges, by count or by width', () => {
        const values = [3, 12, 18, 25, 41, 47, 50]
        expect(binsFor(values, 5)).toEqual({ start: 0, width: 10, count: 5 })
        expect(binsFor(values, { width: 25 })).toEqual({ start: 0, width: 25, count: 2 })
        expect(binsFor([], 5).count).toBe(0)
        expect(binsFor([7, 7, 7]).count).toBe(1)
    })

    it('puts a value on an edge in the bin it starts, and the end in the last bin', () => {
        const bins = { start: 0, width: 10, count: 5 }
        expect(binOf(0, bins)).toBe(0)
        expect(binOf(10, bins)).toBe(1)
        expect(binOf(50, bins)).toBe(4)
        expect(binOf(0.3, { start: 0, width: 0.1, count: 5 })).toBe(3)
        expect(binCounts([3, 12, 18, 25, 41, 47, 50], bins)).toEqual([1, 2, 1, 0, 3])
    })

    it('finds the quartiles, the whiskers and the outliers', () => {
        const spread = spreadOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 40])
        expect(spread).toEqual({ low: 1, lower: 3.25, median: 5.5, upper: 7.75, high: 9, outliers: [40], count: 10 })
        expect(spreadOf([])).toBeNull()
        expect(spreadOf([5])).toEqual({ low: 5, lower: 5, median: 5, upper: 5, high: 5, outliers: [], count: 1 })
    })

    it('runs a total across changes, a missing one counting as none', () => {
        expect(runningTotals([5, -8, null, 4])).toEqual([
            { from: 0, to: 5, change: 5 },
            { from: 5, to: -3, change: -8 },
            { from: -3, to: -3, change: 0 },
            { from: -3, to: 1, change: 4 },
        ])
    })

    it('finds the step a value reaches', () => {
        const steps = [{ value: 50 }, { value: 90 }, { value: 95 }]
        expect(stepAt(10, steps)).toBe(0)
        expect(stepAt(90, steps)).toBe(1)
        expect(stepAt(99, steps)).toBe(2)
        expect(stepAt(null, steps)).toBe(0)
    })

    it('combines each y field its own way', () => {
        const rows = [
            { day: 'Mon', runs: 1, failed: 100 },
            { day: 'Mon', runs: 1, failed: 0 },
            { day: 'Tue', runs: 1, failed: 0 },
        ]
        expect(pivot({ rows, x: 'day', y: ['runs', 'failed'], aggregate: ['sum', 'avg'] }).series).toEqual([
            { name: 'runs', values: [2, 1] },
            { name: 'failed', values: [50, 0] },
        ])
        expect(aggregateAt('avg', 1)).toBe('avg')
        expect(aggregateAt(['count'], 1)).toBe('sum')
    })
})
