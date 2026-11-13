import { describe, expect, it } from 'vitest'

import { fitTicks } from './EChart'

/** Thirty days keyed by a long id, every one labeled. */
const KEYS = Array.from({ length: 30 }, (_, day) => `harbor/nightly-export/2026-11-${String(day + 1).padStart(2, '0')}`)

const interval = (axis: unknown) => (axis as { axisLabel: { interval: number } }).axisLabel.interval

describe('fitTicks', () => {
    it('measures the labels as they are written, so long keys written short keep their labels', () => {
        const axis = { type: 'category', data: KEYS, axisLabel: { interval: 0, formatter: (key: string) => key.slice(-2) } }
        expect(interval(fitTicks(axis, { width: 960 }))).toBe(0)
    })

    it('shows fewer labels where the written labels would run together', () => {
        const raw = { type: 'category', data: KEYS, axisLabel: { interval: 0 } }
        expect(interval(fitTicks(raw, { width: 960 }))).toBeGreaterThan(0)
        const long = { ...raw, axisLabel: { interval: 0, formatter: (key: string) => `${key} (UTC)` } }
        expect(interval(fitTicks(long, { width: 960 }))).toBeGreaterThanOrEqual(interval(fitTicks(raw, { width: 960 })))
    })
})
