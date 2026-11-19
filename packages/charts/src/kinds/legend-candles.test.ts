import { describe, expect, it } from 'vitest'

import { candlesOf, movingAverage } from './legend-candles'

describe('candlesOf', () => {
    const FIELDS = { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'rain' }

    it('makes one candle per category, in order', () => {
        const rows = [
            { day: 'Sep 2', open: 1.2, high: 1.9, low: 1.1, close: 1.5, rain: 4 },
            { day: 'Sep 1', open: 1.0, high: 1.6, low: 0.8, close: 1.2, rain: 0 },
        ]
        expect(candlesOf(rows, 'day', FIELDS, ['Sep 1'])).toEqual({
            categories: ['Sep 1', 'Sep 2'],
            candles: [
                { open: 1.0, high: 1.6, low: 0.8, close: 1.2, volume: 0 },
                { open: 1.2, high: 1.9, low: 1.1, close: 1.5, volume: 4 },
            ],
        })
    })

    it("combines a category's rows: the first open, the last close, the highest high, the lowest low and the summed volume", () => {
        const rows = [
            { day: 'Sep 1', open: 1.0, high: 1.4, low: 0.9, close: 1.3, rain: 2 },
            { day: 'Sep 1', open: 1.3, high: 1.8, low: 1.2, close: 1.6, rain: 3 },
            { day: 'Sep 1', open: 1.6, high: 1.7, low: 0.7, close: 0.9, rain: null },
        ]
        expect(candlesOf(rows, 'day', FIELDS).candles).toEqual([{ open: 1.0, high: 1.8, low: 0.7, close: 0.9, volume: 5 }])
    })

    it('leaves a category without all four figures empty, and has no volume without its field', () => {
        const rows = [
            { day: 'Sep 1', open: 1.0, high: 1.4, low: 0.9, close: 1.3 },
            { day: 'Sep 2', open: 1.3, high: null, low: 1.2, close: 1.6 },
        ]
        const { open, high, low, close } = FIELDS
        expect(candlesOf(rows, 'day', { open, high, low, close }).candles).toEqual([
            { open: 1.0, high: 1.4, low: 0.9, close: 1.3, volume: null },
            null,
        ])
    })
})

describe('movingAverage', () => {
    it('averages each figure with those before it over a span, missing until the span is full or where a figure is missing', () => {
        expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
        expect(movingAverage([2, 4], 1)).toEqual([2, 4])
        expect(movingAverage([1, null, 3, 5, 7], 2)).toEqual([null, null, null, 4, 6])
        expect(movingAverage([1, 2], 5)).toEqual([null, null])
    })
})
