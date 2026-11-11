import { describe, expect, it } from 'vitest'

import { pivot } from '../data'
import { panelFormat, seriesSpec } from './series'

describe('seriesSpec', () => {
    const spec = seriesSpec(
        ['Mon', 'Tue'],
        [
            { name: 'Runs', values: [3, null], stack: 'all' },
            { name: 'Target', values: [4, 4], color: 'muted-foreground', dashed: true },
        ],
    )

    it('gives back the series it was given, as a chart reads its rows', () => {
        const { categories, series } = pivot({ ...spec, x: spec.x ?? '', y: spec.y })
        expect(categories).toEqual(['Mon', 'Tue'])
        expect(series).toEqual([
            { name: 'Runs', values: [3, null] },
            { name: 'Target', values: [4, 4] },
        ])
    })

    it('keeps a figure in its own place where a label repeats', () => {
        const repeated = seriesSpec(['19:32', '19:32', '19:33'], [{ name: 'Requests', values: [1, 2, 3] }])
        const { categories, series } = pivot({ ...repeated, x: repeated.x ?? '', y: repeated.y })
        expect(categories).toEqual(['19:32', '19:32', '19:33'])
        expect(series).toEqual([{ name: 'Requests', values: [1, 2, 3] }])
    })

    it('keeps each series in its color, stack and dash', () => {
        expect(spec.colors).toEqual({ Runs: 'chart-2', Target: 'muted-foreground' })
        expect(spec.stacks).toEqual({ Runs: 'all' })
        expect(spec.dashed).toEqual(['Target'])
    })
})

describe('panelFormat', () => {
    it('writes to the decimals with the unit after, or by the format alone', () => {
        const fixed = panelFormat('%', 1)
        expect([fixed.format?.(42), fixed.unit]).toEqual(['42.0', '%'])
        const own = panelFormat('%', 1, (value) => `${String(value)} runs`)
        expect([own.format?.(3), own.unit, own.axes?.left?.unit]).toEqual(['3 runs', undefined, '%'])
    })
})
