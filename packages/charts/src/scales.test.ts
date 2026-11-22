import type { EChartsCoreOption } from 'echarts/core'
import { describe, expect, it } from 'vitest'

import { KINDS, type ChartKind, type ChartSpec } from './kinds'
import type { ChartLook } from './look'
import { alignedExtent, buildShared, niceExtent, shareScales } from './scales'

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

    it('fits an extent in a given number of round steps', () => {
        expect(alignedExtent([0, 900], 5)).toEqual({ min: 0, max: 1000, interval: 200 })
        expect(alignedExtent([0, 7], 4)).toEqual({ min: 0, max: 8, interval: 2 })
        expect(alignedExtent([-5, 12], 2)).toEqual({ min: -20, max: 20, interval: 20 })
        expect(alignedExtent([-5, 12], 3)).toEqual({ min: -10, max: 20, interval: 10 })
    })
})

describe('charts side by side', () => {
    const LOOK = {
        key: 'test',
        dark: false,
        font: 'sans-serif',
        mono: 'monospace',
        foreground: 'foreground',
        muted: 'muted-foreground',
        faint: 'faint',
        border: 'border',
        grid: 'grid',
        card: 'card',
        popover: 'popover',
        size: { label: 11, small: 10, body: 13, stat: 24, statSmall: 18 },
        weight: { medium: 450, semibold: 500 },
        corner: 2,
        series: ['chart-2', 'chart-3', 'chart-4'],
        token: (name: string) => name,
        mix: (css: string, percent: number) => `${css} ${String(percent)}`,
        ramp: (name: string, steps = 6) => Array.from({ length: steps }, () => name),
    } satisfies ChartLook
    type Axis = { min?: number; max?: number; interval?: number }
    const axesOf = (option: EChartsCoreOption) => (Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]) as Axis[]
    const ends = (axis: Axis) => [axis.min, axis.max]
    const shared = (kind: ChartKind, ...specs: ChartSpec[]) => buildShared(kind, specs, KINDS[kind].build, LOOK)

    it('shares each axis of a two-axis chart with the same axis of the others', () => {
        const first = [
            { day: 'mon', runs: 4, rate: 900 },
            { day: 'tue', runs: 6, rate: 300 },
        ]
        const second = [
            { day: 'mon', runs: 10, rate: 100 },
            { day: 'tue', runs: 2, rate: 200 },
        ]
        const options = shared('dual', { rows: first, x: 'day', y: ['runs', 'rate'] }, { rows: second, x: 'day', y: ['runs', 'rate'] })
        const [left, right] = axesOf(options[0])
        expect(ends(left)).toEqual([0, 10])
        expect(ends(right)).toEqual([0, 1000])
        // The right axis takes as many steps as the left, so its ticks fall on the left's lines.
        expect((right.max ?? 0) / (right.interval ?? 1)).toBe((left.max ?? 0) / (left.interval ?? 1))
        expect(axesOf(options[1]).map(ends)).toEqual([ends(left), ends(right)])
    })

    it('shares each panel of a linked chart with the same panel of the others', () => {
        const rows = (runs: number, rate: number) => [{ day: 'mon', runs, rate }]
        const options = shared(
            'linked',
            { rows: rows(4, 900), x: 'day', y: ['runs', 'rate'] },
            { rows: rows(10, 100), x: 'day', y: ['runs', 'rate'] },
        )
        expect(axesOf(options[0]).map(ends)).toEqual([
            [0, 10],
            [0, 1000],
        ])
    })

    it('shares the value axis of box plots and waterfalls', () => {
        const boxes = (values: number[]) => ({ rows: values.map((y) => ({ job: 'nightly-export', y })), x: 'job', y: 'y' })
        const [small, large] = shared('boxplot', boxes([1, 2, 3, 4, 50]), boxes([100, 200, 300]))
        expect(ends(axesOf(small)[0])).toEqual(ends(axesOf(large)[0]))
        expect(axesOf(small)[0].max).toBeGreaterThanOrEqual(300)
        const falls = (values: number[]) => ({ rows: values.map((y, index) => ({ step: `s${String(index)}`, y })), x: 'step', y: 'y' })
        const [low, high] = shared('waterfall', falls([5, -2]), falls([500, 300]))
        expect(ends(axesOf(low)[0])).toEqual([0, 800])
        expect(ends(axesOf(high)[0])).toEqual([0, 800])
    })

    it('bins every histogram alike', () => {
        const numbers = (values: number[]) => ({ rows: values.map((x) => ({ x })), x: 'x' })
        const options = shared('histogram', numbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), numbers([100, 150, 200, 900]))
        const labels = options.map((option) => (option.xAxis as { data: string[] }).data)
        expect(labels[0]).toEqual(labels[1])
        expect(labels[0][0].startsWith('0–')).toBe(true)
    })

    it('ends every radar spoke and bullet scale alike', () => {
        const spokes = (values: number[]) => ({ rows: values.map((y, index) => ({ step: `s${String(index)}`, y })), x: 'step', y: 'y' })
        const radars = shared('radar', spokes([5, 8]), spokes([50, 80]))
        const rims = radars.map((option) => (option.radar as { indicator: { max: number }[] }).indicator.map((spoke) => spoke.max))
        expect(rims).toEqual([
            [80, 80],
            [80, 80],
        ])
        const bullet = (value: number) => ({ rows: [{ job: 'nightly-export', y: value }], x: 'job', y: 'y' })
        const bullets = shared('bullet', bullet(5), bullet(80))
        expect(bullets.map((option) => ends(option.xAxis as Axis))).toEqual([
            [0, 80],
            [0, 80],
        ])
    })
})
