import { describe, expect, it } from 'vitest'

import { axisShare, isMidnight, tickLabeler, timelineTicks } from './time-axis'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const MIDNIGHT = Date.UTC(2026, 10, 20)

describe('time axis', () => {
    it('labels a midnight tick by its day and the others by their hour', () => {
        const label = tickLabeler('en-US', 'UTC', 6 * HOUR)
        expect(label(MIDNIGHT)).toBe('Nov 20')
        expect(label(MIDNIGHT + 6 * HOUR)).toBe('06:00')
        expect(isMidnight(MIDNIGHT, 'UTC')).toBe(true)
    })

    it('fits its ticks to the width', () => {
        const { step, ticks } = timelineTicks(MIDNIGHT, MIDNIGHT + 2 * DAY, 640, 'UTC')
        expect(step).toBe(6 * HOUR)
        expect(ticks[0]).toBe(MIDNIGHT)
    })

    it('holds a share to the axis', () => {
        expect(axisShare(MIDNIGHT - HOUR, MIDNIGHT, MIDNIGHT + DAY)).toBe(0)
        expect(axisShare(MIDNIGHT + 12 * HOUR, MIDNIGHT, MIDNIGHT + DAY)).toBe(0.5)
    })
})
