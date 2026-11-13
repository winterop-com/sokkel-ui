import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { chartLegend } from '../chart-legend'
import type { ChartLook } from '../look'
import { bandLabel, fanShape, LEGENDS, ringFigures } from './legends'
import { loadKind } from './load'
import { dialSplits } from './gauge'
import { linkedLayout, SHARED_SCALE } from './linked'
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

    const WEEKS = [
        { week: 'w1', observed: 10, median: null, q10: null, q25: null, q75: null, q90: null },
        { week: 'w2', observed: 12, median: null, q10: null, q25: null, q75: null, q90: null },
        { week: 'w3', observed: 13, median: 14, q10: 8, q25: 11, q75: 17, q90: 20 },
        { week: 'w4', observed: null, median: 15, q10: 7, q25: 11, q75: 19, q90: 23 },
        { week: 'w5', median: 16, q10: 6, q25: 12, q75: 20 },
    ]
    const FAN: ChartSpec = {
        rows: WEEKS,
        x: 'week',
        y: 'median',
        bands: [
            { low: 'q10', high: 'q90' },
            { low: 'q25', high: 'q75' },
        ],
        points: 'observed',
        history: 'observed',
        marks: [{ x: 'w3', label: 'Forecast' }],
    }

    it('draws a fan: bands outer to inner, the median, the history line, the dots and the mark', () => {
        type Fan = {
            grid: { top: number }
            series: {
                type: string
                name: string
                data: (number | null)[]
                stack?: string
                areaStyle?: { opacity: number }
                markLine?: { data: { xAxis?: string; label: { show: boolean } }[] }
            }[]
        }
        const option = KINDS.fan.build(FAN, LOOK) as unknown as Fan
        expect(option.series.map((entry) => [entry.type, entry.name])).toEqual([
            ['line', '10-90'],
            ['line', '10-90'],
            ['line', '25-75'],
            ['line', '25-75'],
            ['line', 'Median'],
            ['line', 'Observed'],
            ['scatter', 'Observed'],
            ['line', ''],
        ])
        const [outerLow, outerGap, innerLow, innerGap, median, history, dots, marks] = option.series
        expect(outerLow.data).toEqual([null, null, 8, 7, 6])
        // w5 has no q90, so the outer band leaves it out rather than closing at zero.
        expect(outerGap.data).toEqual([null, null, 12, 16, null])
        expect(innerLow.data).toEqual([null, null, 11, 11, 12])
        expect(innerGap.data).toEqual([null, null, 6, 8, 8])
        expect((innerGap.areaStyle?.opacity ?? 0) > (outerGap.areaStyle?.opacity ?? 0)).toBe(true)
        expect(outerLow.stack).not.toBe(innerLow.stack)
        // The median is drawn from the last history figure, so history and forecast read as one line.
        expect(median.data).toEqual([null, 12, 14, 15, 16])
        expect(history.data).toEqual([10, 12, null, null, null])
        expect(dots.data).toEqual([null, null, 13, null, null])
        expect(marks.data).toEqual([])
        expect(marks.markLine?.data.map((line) => [line.xAxis, line.label.show])).toEqual([['w3', true]])
        expect(option.grid.top).toBeGreaterThan(10)
        expect(chartLegend('fan', FAN).map((item) => [item.key, item.color])).toEqual([
            ['Median', 'var(--chart-2)'],
            ['10-90', 'color-mix(in oklab, var(--chart-2) 24%, var(--card))'],
            ['25-75', 'color-mix(in oklab, var(--chart-2) 48%, var(--card))'],
            ['Observed', 'var(--foreground)'],
        ])
    })

    it('starts the median on its own with bridge off, with no history, or after a gap in the history', () => {
        type Lines = { series: { name: string; data: (number | null)[] }[] }
        const median = (spec: ChartSpec) =>
            (KINDS.fan.build(spec, LOOK) as unknown as Lines).series.find((entry) => entry.name === 'Median')?.data
        expect(median({ ...FAN, bridge: false })).toEqual([null, null, 14, 15, 16])
        expect(median({ ...FAN, history: undefined })).toEqual([null, null, 14, 15, 16])
        const gap = WEEKS.map((row) => (row.week === 'w2' ? { ...row, observed: null } : row))
        expect(median({ ...FAN, rows: gap })).toEqual([null, null, 14, 15, 16])
        // The median keeps its own figures for the tooltip and the legend.
        expect(fanShape(FAN).fans[0].median).toEqual([null, null, 14, 15, 16])
    })

    it('draws dots on every observed row of a fan with no history, and a fan per series', () => {
        const bare = fanShape({ ...FAN, history: undefined })
        expect(bare.fans[0].points).toEqual([10, 12, 13, null, null])
        expect(bare.fans[0].start).toBe(2)
        const rows = [...WEEKS.map((row) => ({ ...row, project: 'harbor' })), { week: 'w4', project: 'juniper', median: 5, q10: 1, q90: 9 }]
        const spec: ChartSpec = { ...FAN, rows, series: 'project' }
        const shaped = fanShape(spec)
        expect(shaped.fans.map((entry) => [entry.name, entry.start])).toEqual([
            ['harbor', 2],
            ['juniper', 3],
        ])
        expect(shaped.fans[1].history).toEqual([null, null, null, null, null])
        const option = KINDS.fan.build(spec, LOOK, new Set(['harbor'])) as unknown as Option
        expect(new Set(option.series.map((entry) => entry.name))).toEqual(new Set(['harbor', 'juniper', 'Observed', '']))
        expect(chartLegend('fan', spec).map((item) => item.key)).toEqual(['harbor', 'juniper', 'Observed'])
    })

    it('names a band by its fields, or by its own label', () => {
        expect(bandLabel({ low: 'q10', high: 'q90' })).toBe('10-90')
        expect(bandLabel({ low: 'p2.5', high: 'p97.5' })).toBe('2.5-97.5')
        expect(bandLabel({ low: 'lower', high: 'upper' })).toBe('lower-upper')
        expect(bandLabel({ low: 'q10', high: 'q90', label: '80%' })).toBe('80%')
    })

    it('draws a mark down a line chart at its category', () => {
        type Lines = { series: { markLine?: { data: { xAxis?: string; yAxis?: number }[] } }[] }
        const option = KINDS.line.build({ ...BY_STATE, marks: [{ x: 'sync-inventory' }] }, LOOK) as unknown as Lines
        expect(option.series[0].markLine?.data).toHaveLength(1)
        expect(option.series[0].markLine?.data[0].xAxis).toBe('sync-inventory')
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

    it("writes every value axis' ticks by the spec's format, short, then its unit", () => {
        type Axis = { axisLabel?: { formatter?: (value: number) => string } }
        type Grid = { xAxis?: Axis | Axis[]; yAxis?: Axis | Axis[] }
        const gb = (value: number) => `${value.toLocaleString('en-US')} GB`
        const tick = (axis: Axis | Axis[] | undefined) => (Array.isArray(axis) ? axis[0] : axis)?.axisLabel?.formatter?.(1500)
        const base: ChartSpec = { rows: ROWS, x: 'job', y: 'duration', format: gb }
        for (const kind of ['bar', 'line', 'area', 'range', 'boxplot', 'waterfall', 'scatter'] as const) {
            const option = KINDS[kind].build(base, LOOK) as unknown as Grid
            expect(tick(option.yAxis), kind).toBe('1.5K GB')
        }
        const sideways = KINDS.bar.build({ ...base, horizontal: true, unit: '/s' }, LOOK) as unknown as Grid
        expect(tick(sideways.xAxis)).toBe('1.5K GB/s')
        const bullet = KINDS.bullet.build({ ...SPECS.bullet, format: gb }, LOOK) as unknown as Grid
        expect(tick(bullet.xAxis)).toBe('1.5K GB')
        const left = KINDS.line.build({ ...base, format: undefined, unit: ' x', axes: { left: { unit: ' GB' } } }, LOOK) as unknown as Grid
        expect(tick(left.yAxis)).toBe('1.5K GB')
        const percent = KINDS.bar.build({ ...base, series: 'state', stack: 'percent' }, LOOK) as unknown as Grid
        expect(tick(percent.yAxis)).toBe('1,500%')
    })

    it("writes a dual chart's ticks by each axis' own format, or the spec's", () => {
        type Dual = { yAxis: { axisLabel: { formatter: (value: number) => string } }[] }
        const spec: ChartSpec = { ...SPECS.dual, unit: undefined, format: (value) => `${value.toLocaleString('en-US')} runs` }
        const option = KINDS.dual.build(
            { ...spec, axes: { right: { format: (value) => `${value.toFixed(1)}%` } } },
            LOOK,
        ) as unknown as Dual
        expect(option.yAxis.map((axis) => axis.axisLabel.formatter(1500))).toEqual(['1.5K runs', '1.5K%'])
    })

    it('writes linked, parallel and needle ticks by the format', () => {
        const gb = (value: number) => `${value.toLocaleString('en-US')} GB`
        type Linked = { yAxis: { axisLabel: { formatter: (value: number) => string } }[] }
        const linked = KINDS.linked.build({ ...SPECS.linked, format: gb }, LOOK) as unknown as Linked
        expect(linked.yAxis.map((axis) => axis.axisLabel.formatter(1500))).toEqual(['1.5K GB s', '1.5K GB'])
        type Parallel = { parallelAxis: { axisLabel?: { formatter: (value: number) => string } }[] }
        const parallel = KINDS.parallel.build({ rows: ROWS, y: ['duration', 'target'], format: gb }, LOOK) as unknown as Parallel
        expect(parallel.parallelAxis[0].axisLabel?.formatter(1500)).toBe('1.5K GB')
        type Dial = { series: { axisLabel?: { formatter?: (value: number) => string } }[] }
        const needle = KINDS.gauge.build(
            { ...SPECS.gauge, dial: 'needle', format: (value) => `${String(value)}%` },
            LOOK,
        ) as unknown as Dial
        const scale = needle.series.find((entry) => entry.axisLabel?.formatter !== undefined)
        expect(scale?.axisLabel?.formatter?.(40)).toBe('40%')
    })

    it('writes a small gauge figure at the small size', () => {
        type Dial = { series: { detail?: { fontSize: number } }[] }
        const option = KINDS.gauge.build({ ...SPECS.gauge, small: true }, LOOK) as unknown as Dial
        expect(option.series[1].detail?.fontSize).toBe(18)
    })

    it('draws a quiet axis: no value axis or lines across, the categories in mono', () => {
        type Axes = { xAxis: Record<string, unknown>; yAxis: Record<string, unknown> }
        for (const kind of ['bar', 'line'] as const) {
            const option = KINDS[kind].build({ rows: ROWS, x: 'job', y: 'duration', quiet: true }, LOOK) as unknown as Axes
            expect(option.yAxis).toMatchObject({ type: 'value', show: false, splitLine: { show: false } })
            expect(option.xAxis).toMatchObject({ type: 'category', axisLabel: { fontFamily: 'monospace' } })
        }
        const lying = KINDS.bar.build({ rows: ROWS, x: 'job', y: 'duration', horizontal: true, quiet: true }, LOOK) as unknown as Axes
        expect(lying.xAxis).toMatchObject({ type: 'value', show: false })
        expect(lying.yAxis).toMatchObject({ type: 'category', axisLabel: { fontFamily: 'monospace' } })
    })

    it('draws a bar of zero as a baseline one pixel high, unparted', () => {
        type Bars = { series: { barMinHeight?: number; data: unknown[] }[] }
        const option = KINDS.bar.build({ rows: ROWS, x: 'job', y: 'failed', stack: 'stacked', baseline: true }, LOOK) as unknown as Bars
        expect(option.series[0].barMinHeight).toBe(1)
        expect(option.series[0].data[1]).toEqual({ value: 0, itemStyle: { borderWidth: 0 } })
        const plain = KINDS.bar.build({ rows: ROWS, x: 'job', y: 'failed' }, LOOK) as unknown as Bars
        expect(plain.series[0].barMinHeight).toBeUndefined()
        expect(plain.series[0].data[1]).toBe(0)
    })

    it('draws a color token with an alpha, in the legend too', () => {
        const spec: ChartSpec = { rows: ROWS, x: 'job', y: 'runs', series: 'state', colors: { succeeded: 'muted-foreground/45' } }
        type Bars = { series: { name: string; itemStyle: { color: string } }[] }
        const option = KINDS.bar.build(spec, LOOK) as unknown as Bars
        expect(option.series.find((entry) => entry.name === 'succeeded')?.itemStyle.color).toBe('muted-foreground/45')
        expect(chartLegend('bar', spec).find((item) => item.key === 'succeeded')?.color).toBe(
            'color-mix(in oklab, var(--muted-foreground) 45%, transparent)',
        )
    })

    it('writes the categories by formatCategory on the axis and in the tooltip title', () => {
        const hour = (category: string) => `${category}-${String(Number(category.slice(0, 2)) + 1).padStart(2, '0')}:00`
        const rows = [
            { time: '14:00', runs: 4, fails: 1 },
            { time: '15:00', runs: 6, fails: 0 },
        ]
        type Axis = { axisLabel?: { formatter?: (value: string, index: number) => string } }
        type Tooltip = { tooltip: { formatter: (points: unknown) => string } }
        const label = (axis: Axis | Axis[]) => (Array.isArray(axis) ? axis[0] : axis).axisLabel?.formatter?.('15:00', 1)
        for (const kind of ['bar', 'line', 'area', 'step', 'heatmap', 'dual', 'linked', 'boxplot', 'waterfall', 'range', 'fan'] as const) {
            const spec: ChartSpec = { rows, x: 'time', y: kind === 'dual' ? ['runs', 'fails'] : 'runs', formatCategory: hour }
            const option = KINDS[kind].build(spec, LOOK) as unknown as { xAxis: Axis | Axis[] }
            expect([kind, label(option.xAxis)]).toEqual([kind, '15:00-16:00'])
        }
        const bullet = KINDS.bullet.build({ rows, x: 'time', y: 'runs', formatCategory: hour }, LOOK) as unknown as { yAxis: Axis[] }
        expect(label(bullet.yAxis)).toBe('15:00-16:00')
        const waterfall = KINDS.waterfall.build({ rows, x: 'time', y: 'runs', formatCategory: hour }, LOOK) as unknown as { xAxis: Axis }
        expect(waterfall.xAxis.axisLabel?.formatter?.('Total', 2)).toBe('Total')
        const bar = KINDS.bar.build({ rows, x: 'time', y: 'runs', formatCategory: hour }, LOOK) as unknown as Tooltip
        const title = bar.tooltip.formatter([{ axisValueLabel: '15:00', seriesName: 'runs', seriesIndex: 0, value: 6, color: 'chart-2' }])
        expect(title).toContain('15:00-16:00')
        const plain = KINDS.bar.build({ rows, x: 'time', y: 'runs' }, LOOK) as unknown as { xAxis: Axis }
        expect(plain.xAxis.axisLabel?.formatter).toBeUndefined()
    })

    it('leaves a series with no figure at a category out of the tooltip', () => {
        type Tooltip = { tooltip: { formatter: (points: unknown) => string } }
        const point = (seriesName: string, value: unknown) => ({
            axisValueLabel: 'nightly-export',
            seriesName,
            seriesIndex: 0,
            value,
            color: 'c',
        })
        const points = [point('succeeded', 3), point('failed', null), point('skipped', '-')]
        for (const kind of ['bar', 'line', 'dual', 'rose'] as const) {
            const option = KINDS[kind].build(
                { rows: ROWS, x: 'job', y: 'runs', series: 'state', stack: 'stacked' },
                LOOK,
            ) as unknown as Tooltip
            const html = option.tooltip.formatter(points)
            expect([kind, html.includes('succeeded'), html.includes('failed'), html.includes('skipped')]).toEqual([
                kind,
                true,
                false,
                false,
            ])
        }
    })
})

describe('the kinds apart', () => {
    it('loads the same builder for every kind on its own', async () => {
        for (const kind of Object.keys(KINDS) as ChartKind[]) expect([kind, await loadKind(kind)]).toEqual([kind, KINDS[kind].build])
    })

    it('lists a legend for every kind', () => {
        expect(Object.keys(LEGENDS).sort()).toEqual(Object.keys(KINDS).sort())
    })

    it('reads no builder for a legend', () => {
        const builders = Object.keys(import.meta.glob('./*.ts'))
            .map((path) => path.slice(2, -3))
            .filter((name) => !['index', 'legends', 'load', 'spec'].includes(name) && !name.endsWith('.test'))
        const reached = (file: string) =>
            [...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/^import (?!type )[^']*'([^']+)'/gm)].map((match) => match[1])
        const found = ['./legends.ts', '../chart-legend.ts'].flatMap((file) =>
            reached(file).filter((target) => builders.some((name) => target.endsWith(`/${name}`) || target === `./kinds/${name}`)),
        )
        expect(builders).toContain('categories')
        expect(found).toEqual([])
    })
})
