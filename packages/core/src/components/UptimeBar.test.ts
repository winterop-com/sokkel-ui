import { describe, expect, it } from 'vitest'

import { daysThatFit, formatUptime, formatUptimeDay, overallUptime, uptimeColor } from './UptimeBar'

describe('UptimeBar', () => {
    it('writes an uptime to two decimals without rounding a loss away', () => {
        expect(formatUptime(1)).toBe('100.00%')
        expect(formatUptime(0.99951)).toBe('99.95%')
        expect(formatUptime(0.99999)).toBe('99.99%')
        expect(formatUptime(0.9)).toBe('90.00%')
    })

    it('writes a day as a reader says it', () => {
        expect(formatUptimeDay('2026-11-03')).toBe('Nov 3, 2026')
        expect(formatUptimeDay('not a day')).toBe('not a day')
    })

    it('colors a day by how much of it was lost', () => {
        expect(uptimeColor(1)).toBe('var(--good)')
        expect(uptimeColor(0.995)).toBe('var(--warning)')
        expect(uptimeColor(0.9)).toBe('var(--critical)')
        expect(uptimeColor(null)).toContain('--muted-foreground')
    })

    it('counts only the measured days in the overall uptime', () => {
        expect(overallUptime([])).toBeNull()
        expect(overallUptime([{ date: '2026-11-01', uptime: null }])).toBeNull()
        expect(
            overallUptime([
                { date: '2026-11-01', uptime: null },
                { date: '2026-11-02', uptime: 1 },
                { date: '2026-11-03', uptime: 0.9 },
            ]),
        ).toBeCloseTo(0.95)
    })

    it('fits as many days as the room holds at the narrowest width, at least one', () => {
        expect(daysThatFit(359, 3)).toBe(90)
        expect(daysThatFit(100, 3)).toBe(25)
        expect(daysThatFit(0, 3)).toBe(1)
    })
})
