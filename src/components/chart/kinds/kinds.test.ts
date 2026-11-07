import { describe, expect, it } from 'vitest'

import { chartLegend } from '../Chart'
import type { ChartLook } from '../look'
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
    size: { label: 11, small: 10, body: 13, stat: 24 },
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

    it('reads a bullet target combined as its figure is', () => {
        const legend = chartLegend('bullet', SPECS.bullet)
        expect(legend.map((item) => [item.key, item.values])).toEqual([
            ['duration', [70, 480, -30]],
            ['Target', [120, 50, 80]],
            ['Poor', undefined],
        ])
    })
})
