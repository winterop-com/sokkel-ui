import { describe, expect, it } from 'vitest'

import { chartLegend } from '../chart-legend'
import type { ChartLook } from '../look'
import { dialSplits } from './gauge'
import { linkedLayout, SHARED_SCALE } from './linked'
import { ringFigures } from './rings'
import { KINDS, type ChartKind, type ChartSpec } from '.'

/** A look whose colors are the tokens' own names, so a test can read which token a part takes. */
const LOOK: ChartLook = {
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
    corner: 2,
    series: ['chart-2', 'chart-3', 'chart-4'],
    token: (name) => name,
    mix: (css, percent) => `${css} ${String(percent)}`,
    ramp: (name, steps = 6) => Array.from({ length: steps }, () => name),
}

const ROWS = [
    { job: 'nightly-export', state: 'succeeded', step: 'fetch', duration: 100, runs: 1, failed: 0, target: 120 },
    { job: 'nightly-export', state: 'failed', step: 'transform', duration: 40, runs: 1, failed: 100, target: 120 },
    { job: 'sync-inventory', state: 'succeeded', step: 'fetch', duration: 60, runs: 1, failed: 0, target: 50 },
    { job: 'sync-inventory', state: 'succeeded', step: 'validate', duration: 900, runs: 1, failed: 0, target: 50 },
    { job: 'rebuild-index', state: 'succeeded', step: 'upload', duration: -30, runs: 1, failed: 0, target: 80 },
]

const SPECS: Record<string, ChartSpec> = {
    histogram: { rows: ROWS, x: 'duration', series: 'state', bins: 4 },
    boxplot: { rows: ROWS, x: 'job', y: 'duration' },
    waterfall: { rows: ROWS, x: 'job', y: 'duration' },
    funnel: { rows: ROWS, x: 'step', order: ['fetch', 'transform', 'validate', 'upload'] },
    bullet: { rows: ROWS, x: 'job', y: 'duration', value: 'target', aggregate: 'avg', steps: [{ label: 'Poor' }, { value: 100 }] },
    radar: { rows: ROWS, x: 'job', series: 'state' },
    rose: { rows: ROWS, x: 'job', series: 'state' },
    gauge: { rows: ROWS, y: 'failed', aggregate: 'avg', steps: [{ color: 'good' }, { value: 10, color: 'critical' }] },
    dual: { rows: ROWS, x: 'job', y: ['runs', 'failed'], aggregate: ['sum', 'avg'], unit: ['', '%'] },
    rings: { rows: ROWS, y: 'failed', series: 'job', aggregate: 'avg' },
    linked: { rows: ROWS, x: 'job', y: ['duration', 'runs'], unit: [' s', ''], panels: { duration: { mark: 'bar', hang: true } } },
}

type Option = { series: { type: string; name?: string; data?: unknown[] }[] }

describe('the chart kinds', () => {
    for (const [kind, spec] of Object.entries(SPECS)) {
        it(`draws ${kind} from rows`, () => {
            const option = KINDS[kind as ChartKind].build(spec, LOOK) as unknown as Option
            expect(option.series.length).toBeGreaterThan(0)
            expect(() => chartLegend(kind as ChartKind, spec)).not.toThrow()
        })
    }

    it('runs a waterfall into a total, rises and falls apart', () => {
        const option = KINDS.waterfall.build(SPECS.waterfall, LOOK) as unknown as Option
        expect(option.series.map((series) => [series.name, series.data])).toEqual([
            [
                'Rise',
                [
                    [0, 0, 140, 140],
                    [1, 140, 1100, 960],
                ],
            ],
            ['Fall', [[2, 1100, 1070, -30]]],
            ['Total', [[3, 0, 1070, 1070]]],
        ])
    })

    it('writes each funnel stage as a share of the first', () => {
        const legend = chartLegend('funnel', SPECS.funnel)
        expect(legend.map((item) => [item.key, item.values])).toEqual([
            ['fetch', [2]],
            ['transform', [1]],
            ['validate', [1]],
            ['upload', [1]],
        ])
    })

    it('colors a gauge by the threshold its figure reaches', () => {
        const option = KINDS.gauge.build(SPECS.gauge, LOOK) as unknown as { series: { progress?: { itemStyle: { color: string } } }[] }
        expect(option.series[1].progress?.itemStyle.color).toBe('critical')
    })

    it('draws a gauge in every dial', () => {
        for (const dial of ['arc', 'ring', 'half', 'bands', 'needle'] as const) {
            const option = KINDS.gauge.build({ ...SPECS.gauge, dial }, LOOK) as unknown as { series: { pointer: { show: boolean } }[] }
            expect(option.series.at(-1)?.pointer.show).toBe(dial === 'bands' || dial === 'needle')
        }
    })

    it('splits a needle scale so each tick lands on a round figure', () => {
        expect([dialSplits(0, 100), dialSplits(0, 120), dialSplits(0, 60), dialSplits(0, 1), dialSplits(0, 300)]).toEqual([5, 6, 6, 5, 6])
    })

    it('reads one ring per series label, per y field, or the rows counted', () => {
        expect(ringFigures(SPECS.rings)).toEqual([
            { name: 'nightly-export', value: 50, unit: 0 },
            { name: 'sync-inventory', value: 0, unit: 0 },
            { name: 'rebuild-index', value: 0, unit: 0 },
        ])
        expect(ringFigures({ rows: ROWS, y: ['runs', 'failed'], aggregate: ['sum', 'avg'] })).toEqual([
            { name: 'runs', value: 5, unit: 0 },
            { name: 'failed', value: 20, unit: 1 },
        ])
        expect(ringFigures({ rows: ROWS })).toEqual([{ name: 'Count', value: 5, unit: 0 }])
    })

    it('drops a ring the legend hides', () => {
        const option = KINDS.rings.build(SPECS.rings, LOOK, new Set(['sync-inventory'])) as unknown as Option
        expect(option.series[0].data?.map((item) => (item as { name: string }).name)).toEqual(['nightly-export', 'rebuild-index'])
    })

    it('stacks linked panels on one axis, zoomed and pointed at together', () => {
        const option = KINDS.linked.build(SPECS.linked, LOOK) as unknown as {
            grid: unknown[]
            xAxis: { position: string; gridIndex: number }[]
            yAxis: { inverse: boolean; name: string }[]
            dataZoom: { type: string; xAxisIndex: number[] }[]
            axisPointer: { link: unknown }
        }
        expect(option.grid).toHaveLength(2)
        expect(option.yAxis.map((axis) => [axis.name, axis.inverse])).toEqual([
            ['duration', true],
            ['runs', false],
        ])
        expect(option.xAxis.map((axis) => axis.position)).toEqual(['top', 'bottom'])
        expect(option.dataZoom.map((zoom) => [zoom.type, [...zoom.xAxisIndex].sort()])).toEqual([
            ['inside', [0, 1]],
            ['slider', [0, 1]],
        ])
        expect(option.axisPointer.link).toEqual([{ xAxisIndex: 'all' }])
    })

    it('gives a hanging last panel an axis of its own for the labels', () => {
        const spec = { ...SPECS.linked, panels: { runs: { hang: true } } }
        const option = KINDS.linked.build(spec, LOOK) as unknown as { xAxis: { gridIndex: number; position: string }[] }
        expect(option.xAxis.map((axis) => [axis.gridIndex, axis.position])).toEqual([
            [0, 'bottom'],
            [1, 'top'],
            [1, 'bottom'],
        ])
    })

    it('drops a linked panel the legend hides, and opens zoomed to a window', () => {
        const spec = { ...SPECS.linked, zoom: ['sync-inventory', 'rebuild-index'] as const }
        const option = KINDS.linked.build(spec, LOOK, new Set(['duration'])) as unknown as Option & {
            grid: unknown[]
            dataZoom: { startValue: string; endValue: string }[]
        }
        expect(option.grid).toHaveLength(1)
        expect(option.series.map((series) => series.name)).toEqual(['runs'])
        expect([option.dataZoom[0].startValue, option.dataZoom[0].endValue]).toEqual(['sync-inventory', 'rebuild-index'])
    })

    it('puts linked panels split by series on one scale, and fields on their own', () => {
        type Built = { yAxis: { max?: number }[]; series: { name: string; yAxisIndex: number; data: (number | null)[] }[] }
        const bySeries = { rows: ROWS, x: 'job', y: 'duration', series: 'state' }
        const split = KINDS.linked.build(bySeries, LOOK) as unknown as Built
        // No axis is pinned, so each fits the part in view; the unseen lines put every panel on one scale there.
        expect(split.yAxis.every((axis) => axis.max === undefined)).toBe(true)
        const scale = split.series.filter((entry) => entry.name === SHARED_SCALE)
        expect(scale.map((entry) => entry.yAxisIndex)).toEqual([0, 0, 1, 1])
        // nightly-export: succeeded 100 and failed 40; sync-inventory: succeeded 960, nothing failed.
        expect(scale[0].data).toEqual([100, 960, -30])
        expect(scale[1].data).toEqual([40, 960, -30])
        const own = KINDS.linked.build({ ...bySeries, scales: 'own' }, LOOK) as unknown as Built
        expect(own.series.some((entry) => entry.name === SHARED_SCALE)).toBe(false)
        const fields = KINDS.linked.build(SPECS.linked, LOOK) as unknown as Built
        expect(fields.series.some((entry) => entry.name === SHARED_SCALE)).toBe(false)
    })

    it('lays linked panels out by their weights between a fixed top and bottom', () => {
        expect(linkedLayout([1])).toEqual([{ top: 22, bottom: 58 }])
        expect(linkedLayout([1, 2])).toEqual([
            { top: 22, bottom: '71.04%' },
            { top: '37.71%', bottom: 58 },
        ])
    })

    it('draws a pie as a whole circle and a donut round a hole', () => {
        type Slices = { series: { radius: unknown }[] }
        const spec: ChartSpec = { rows: ROWS, x: 'job', y: 'duration' }
        expect((KINDS.pie.build(spec, LOOK) as unknown as Slices).series[0].radius).toEqual([0, '82%'])
        expect((KINDS.donut.build(spec, LOOK) as unknown as Slices).series[0].radius).toEqual(['58%', '82%'])
        expect(chartLegend('pie', spec).map((item) => item.key)).toEqual(['nightly-export', 'sync-inventory', 'rebuild-index'])
    })

    it('colors series from the palette in turn, after the colors named', () => {
        type Bars = { series: { name: string; itemStyle: { color: string } }[] }
        const spec: ChartSpec = { rows: ROWS, x: 'job', series: 'state', palette: ['kind-teal'], colors: { failed: 'status-failed' } }
        const option = KINDS.bar.build(spec, LOOK) as unknown as Bars
        expect(option.series.map((entry) => [entry.name, entry.itemStyle.color])).toEqual([
            ['succeeded', 'kind-teal'],
            ['failed', 'status-failed'],
        ])
        expect(chartLegend('bar', spec).map((item) => item.color)).toEqual(['var(--kind-teal)', 'var(--status-failed)'])
        const pie = chartLegend('pie', { rows: ROWS, x: 'job', palette: ['kind-blue', 'kind-pink'] })
        expect(pie.map((item) => item.color)).toEqual(['var(--kind-blue)', 'var(--kind-pink)', 'var(--kind-blue)'])
    })

    it('reads a bullet target combined as its figure is', () => {
        const legend = chartLegend('bullet', SPECS.bullet)
        expect(legend.map((item) => [item.key, item.values])).toEqual([
            ['duration', [70, 480, -30]],
            ['Target', [120, 50, 80]],
            ['Poor', undefined],
        ])
    })

    const BY_STATE: ChartSpec = { rows: ROWS, x: 'job', y: 'duration', series: 'state' }

    it('puts bars in the stacks named for them, and leaves the rest alone', () => {
        type Bars = { series: { name: string; stack?: string; itemStyle: { borderWidth?: number } }[] }
        const option = KINDS.bar.build({ ...BY_STATE, stacks: { succeeded: 'done' } }, LOOK) as unknown as Bars
        expect(option.series.map((entry) => [entry.name, entry.stack, entry.itemStyle.borderWidth])).toEqual([
            ['succeeded', 'done', 1],
            ['failed', undefined, undefined],
        ])
    })

    it('draws the steps after the first as lines across, a dashed series bare, and the range fixed', () => {
        type Lines = {
            yAxis: { min?: number; max?: number }
            series: { name: string; areaStyle?: unknown; lineStyle: { type?: string }; markLine?: { data: { yAxis: number }[] } }[]
        }
        const spec: ChartSpec = {
            ...BY_STATE,
            fill: 'gradient',
            dashed: ['failed'],
            steps: [{ color: 'good' }, { value: 30, color: 'critical' }],
            min: 0,
            max: 1000,
        }
        const option = KINDS.area.build(spec, LOOK) as unknown as Lines
        expect([option.yAxis.min, option.yAxis.max]).toEqual([0, 1000])
        expect(option.series[0].markLine?.data.map((line) => line.yAxis)).toEqual([30])
        expect(option.series.map((entry) => [entry.name, entry.areaStyle !== undefined, entry.lineStyle.type])).toEqual([
            ['succeeded', true, undefined],
            ['failed', false, 'dashed'],
        ])
        const steps = KINDS.step.build({ ...spec, fill: 'none' }, LOOK) as unknown as Lines
        expect(steps.series.every((entry) => entry.areaStyle === undefined)).toBe(true)
    })

    it('draws a dual chart of series by their layers, on the axes they name', () => {
        type Dual = {
            yAxis: { name?: string; min?: number; alignTicks: boolean }[]
            series: { type: string; yAxisIndex: number }[]
        }
        const spec: ChartSpec = {
            ...BY_STATE,
            layers: { succeeded: { mark: 'bar', axis: 'left' }, failed: { mark: 'line', axis: 'right' } },
            axes: { right: { name: 'Failed', unit: '%', min: 0 } },
        }
        const option = KINDS.dual.build(spec, LOOK) as unknown as Dual
        expect(option.yAxis.map((axis) => [axis.name, axis.min, axis.alignTicks])).toEqual([
            [undefined, undefined, false],
            ['Failed', 0, false],
        ])
        expect(option.series.map((entry) => [entry.type, entry.yAxisIndex])).toEqual([
            ['bar', 0],
            ['line', 1],
        ])
        const left = KINDS.dual.build({ ...spec, layers: { failed: { mark: 'line', axis: 'left' } } }, LOOK) as unknown as Dual
        expect(left.yAxis).toHaveLength(1)
    })

    it('steps a heatmap scale through several tokens from the floor it is given', () => {
        type Heat = { visualMap: { min: number; inRange: { color: string[] } } }
        const option = KINDS.heatmap.build({ ...BY_STATE, min: 0, scale: ['chart-2', 'warning', 'critical'] }, LOOK) as unknown as Heat
        expect(option.visualMap.min).toBe(0)
        expect(option.visualMap.inRange.color).toEqual(['var(--chart-2) 10', 'var(--chart-2) 45', 'chart-2', 'warning', 'critical'])
    })

    it('ends radar spokes at their own rims, on round rings, as outlines', () => {
        type Radar = { radar: { indicator: { max: number }[]; shape: string; splitNumber: number }; series: { areaStyle?: unknown }[] }
        const spec: ChartSpec = { ...SPECS.radar, rims: { 'nightly-export': 50 }, max: 10, round: true, levels: 3, fill: 'none' }
        const option = KINDS.radar.build(spec, LOOK) as unknown as Radar
        expect(option.radar.indicator.map((spoke) => spoke.max)).toEqual([50, 10, 10])
        expect([option.radar.shape, option.radar.splitNumber]).toEqual(['circle', 3])
        expect(option.series.every((entry) => entry.areaStyle === undefined)).toBe(true)
    })

    it('writes a small gauge figure at the small size', () => {
        type Dial = { series: { detail?: { fontSize: number } }[] }
        const option = KINDS.gauge.build({ ...SPECS.gauge, small: true }, LOOK) as unknown as Dial
        expect(option.series[1].detail?.fontSize).toBe(18)
    })
})
