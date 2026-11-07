import { describe, expect, it } from 'vitest'

import { niceExtent, shareScales } from './scales'

const bars = (stack: string | undefined, ...series: (number | null)[][]) => ({
    xAxis: { type: 'category', data: ['a', 'b'] },
    yAxis: { type: 'value' },
    series: series.map((data) => ({ type: 'bar', stack, data })),
})

describe('the shared scales', () => {
    it('rounds an extent to steps of 1, 2, 3 or 5', () => {
        expect(niceExtent([0, 437])).toEqual({ min: 0, max: 500, interval: 100 })
        expect(niceExtent([-12, 38])).toEqual({ min: -20, max: 40, interval: 10 })
        expect(niceExtent([0, 0.7])).toEqual({ min: 0, max: 0.7, interval: 0.1 })
        expect(niceExtent([0, 1.4])).toEqual({ min: 0, max: 1.5, interval: 0.3 })
        expect(niceExtent([4, 4])).toEqual({ min: 3, max: 5, interval: 1 })
    })

    it('gives every chart the extent all of them reach, stacks summed', () => {
        const [first, second] = shareScales([bars('all', [10, 20], [5, 30]), bars(undefined, [90, 40], [null, 70])])
        expect(first.yAxis).toEqual({ type: 'value', min: 0, max: 100, interval: 20 })
        expect(second.yAxis).toEqual(first.yAxis)
        expect(first.xAxis).toEqual({ type: 'category', data: ['a', 'b'] })
    })

    it('leaves an axis that sets its own ends', () => {
        const percent = { ...bars('all', [40, 60]), yAxis: { type: 'value', max: 100 } }
        expect(shareScales([percent, bars(undefined, [300, 10])])[0].yAxis).toEqual({ type: 'value', max: 100 })
    })

    it('shares both axes of points, a scaled axis leaving zero out', () => {
        const points = (data: number[][]) => ({
            xAxis: { type: 'value', scale: true },
            yAxis: { type: 'value', scale: true },
            series: [{ type: 'scatter', data }],
        })
        const [first] = shareScales([points([[110, 30]]), points([[260, 90]])])
        expect(first.xAxis).toEqual({ type: 'value', scale: true, min: 90, max: 270, interval: 30 })
        expect(first.yAxis).toEqual({ type: 'value', scale: true, min: 30, max: 90, interval: 10 })
    })

    it('shares a color scale and the parallel axes', () => {
        const grid = (min: number, max: number) => ({ visualMap: { min, max }, series: [{ type: 'heatmap', data: [] }] })
        const shared = shareScales([grid(2, 9), grid(0, 4)])
        expect(shared.map((option) => option.visualMap)).toEqual([
            { min: 0, max: 9 },
            { min: 0, max: 9 },
        ])
        const lines = (data: (number | string)[][]) => ({
            parallelAxis: [
                { dim: 0, type: 'value' },
                { dim: 1, type: 'category', data: ['a', 'b'] },
            ],
            series: [{ type: 'parallel', data }],
        })
        expect(shareScales([lines([[3, 'a']]), lines([[8, 'b']])])[1].parallelAxis).toEqual([
            { dim: 0, type: 'value', min: 3, max: 8 },
            { dim: 1, type: 'category', data: ['a', 'b'] },
        ])
    })
})
