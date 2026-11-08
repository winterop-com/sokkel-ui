import { describe, expect, it } from 'vitest'

import {
    dateOf,
    fitSeconds,
    formatDate,
    formatDateTime,
    formatTime,
    isBefore,
    isoDate,
    readDate,
    readDateTime,
    readTime,
    timesOfDay,
} from './dates'

describe('readDate', () => {
    it('reads an ISO date, and eight digits in a row', () => {
        expect(readDate('2026-11-09')).toBe('2026-11-09')
        expect(readDate(' 2026-11-9 ')).toBe('2026-11-09')
        expect(readDate('20261109')).toBe('2026-11-09')
    })

    it("reads the parts in the format's order, split by any of its marks", () => {
        expect(readDate('9.11.2026', 'DD.MM.YYYY')).toBe('2026-11-09')
        expect(readDate('09/11/2026', 'DD.MM.YYYY')).toBe('2026-11-09')
        expect(readDate('11/9/2026', 'MM/DD/YYYY')).toBe('2026-11-09')
        expect(readDate('09112026', 'DD.MM.YYYY')).toBe('2026-11-09')
    })

    it('reads a year written first as an ISO date in any format', () => {
        expect(readDate('2026-11-09', 'DD.MM.YYYY')).toBe('2026-11-09')
        expect(readDate('2026-11-09', 'MM/DD/YYYY')).toBe('2026-11-09')
    })

    it('refuses what is not a day on the calendar', () => {
        expect(readDate('2026-02-29')).toBeNull()
        expect(readDate('2028-02-29')).toBe('2028-02-29')
        expect(readDate('2026-13-01')).toBeNull()
        expect(readDate('2026-11-00')).toBeNull()
        expect(readDate('31.04.2026', 'DD.MM.YYYY')).toBeNull()
    })

    it('refuses a short year, words and stray text', () => {
        expect(readDate('9.11.26', 'DD.MM.YYYY')).toBeNull()
        expect(readDate('next tuesday')).toBeNull()
        expect(readDate('2026-11-09x')).toBeNull()
        expect(readDate('2026-11')).toBeNull()
        expect(readDate('')).toBeNull()
    })
})

describe('formatDate', () => {
    it('writes a date in the format, padded or not', () => {
        expect(formatDate('2026-11-09')).toBe('2026-11-09')
        expect(formatDate('2026-11-09', 'DD.MM.YYYY')).toBe('09.11.2026')
        expect(formatDate('2026-11-09', 'M/D/YYYY')).toBe('11/9/2026')
    })

    it('writes what it reads', () => {
        for (const format of ['YYYY-MM-DD', 'DD.MM.YYYY', 'MM/DD/YYYY', 'D.M.YYYY'])
            expect(readDate(formatDate('2026-03-07', format), format)).toBe('2026-03-07')
    })
})

describe('readTime', () => {
    it('reads hours and minutes split by a colon or a point, or in a row', () => {
        expect(readTime('09:30')).toBe('09:30')
        expect(readTime('9.30')).toBe('09:30')
        expect(readTime('930')).toBe('09:30')
        expect(readTime('0930')).toBe('09:30')
        expect(readTime('9')).toBe('09:00')
        expect(readTime('23:59')).toBe('23:59')
    })

    it('reads a 12-hour time by its period, in full or by its first letter', () => {
        expect(readTime('2:30 pm')).toBe('14:30')
        expect(readTime('2:30PM')).toBe('14:30')
        expect(readTime('2p')).toBe('14:00')
        expect(readTime('12 am')).toBe('00:00')
        expect(readTime('12:15 p.m.')).toBe('12:15')
        expect(readTime('2 em', { periods: ['fm', 'em'] })).toBe('14:00')
    })

    it('reads seconds only when the time takes them', () => {
        expect(readTime('09:30:15')).toBeNull()
        expect(readTime('09:30:15', { seconds: true })).toBe('09:30:15')
        expect(readTime('093015', { seconds: true })).toBe('09:30:15')
        expect(readTime('09:30', { seconds: true })).toBe('09:30:00')
    })

    it('refuses what is not a time of day', () => {
        expect(readTime('24:00')).toBeNull()
        expect(readTime('09:60')).toBeNull()
        expect(readTime('9:5')).toBeNull()
        expect(readTime('13 pm')).toBeNull()
        expect(readTime('0 am')).toBeNull()
        expect(readTime('2 xm')).toBeNull()
        expect(readTime('noon')).toBeNull()
        expect(readTime('')).toBeNull()
    })
})

describe('formatTime', () => {
    it('writes a time on either clock', () => {
        expect(formatTime('14:30')).toBe('14:30')
        expect(formatTime('14:30', { clock: 12 })).toBe('2:30 PM')
        expect(formatTime('00:05', { clock: 12 })).toBe('12:05 AM')
        expect(formatTime('12:00', { clock: 12 })).toBe('12:00 PM')
        expect(formatTime('14:30:15', { seconds: true })).toBe('14:30:15')
        expect(formatTime('14:30', { seconds: true })).toBe('14:30:00')
    })

    it('writes what it reads, on either clock', () => {
        for (const clock of [12, 24] as const) expect(readTime(formatTime('19:45', { clock }))).toBe('19:45')
    })
})

describe('readDateTime', () => {
    it('reads a date and a time split by a space, a comma or a T', () => {
        expect(readDateTime('2026-11-09 02:00')).toBe('2026-11-09T02:00')
        expect(readDateTime('2026-11-09T02:00')).toBe('2026-11-09T02:00')
        expect(readDateTime('09.11.2026, 2 pm', 'DD.MM.YYYY')).toBe('2026-11-09T14:00')
        expect(readDateTime('2026-11-09 02:00', undefined, { seconds: true })).toBe('2026-11-09T02:00:00')
    })

    it('needs both', () => {
        expect(readDateTime('2026-11-09')).toBeNull()
        expect(readDateTime('02:00')).toBeNull()
        expect(readDateTime('2026-11-09 25:00')).toBeNull()
    })

    it('writes what it reads', () => {
        const written = formatDateTime('2026-11-09T14:30', 'DD.MM.YYYY', { clock: 12 })
        expect(written).toBe('09.11.2026 2:30 PM')
        expect(readDateTime(written, 'DD.MM.YYYY', { clock: 12 })).toBe('2026-11-09T14:30')
    })
})

describe('isBefore', () => {
    it('compares dates, times and moments, with or without seconds', () => {
        expect(isBefore('2026-11-08', '2026-11-09')).toBe(true)
        expect(isBefore('2026-11-09', '2026-11-09')).toBe(false)
        expect(isBefore('09:30', '09:30:00')).toBe(false)
        expect(isBefore('09:30', '09:30:01')).toBe(true)
        expect(isBefore('2026-11-09T23:59', '2026-11-10T00:00')).toBe(true)
    })
})

describe('fitSeconds', () => {
    it('adds or drops the seconds', () => {
        expect(fitSeconds('08:00', true)).toBe('08:00:00')
        expect(fitSeconds('08:00:30', false)).toBe('08:00')
        expect(fitSeconds('2026-11-09T08:00', true)).toBe('2026-11-09T08:00:00')
        expect(fitSeconds('2026-11-09T08:00:00', false)).toBe('2026-11-09T08:00')
        expect(fitSeconds(undefined, true)).toBeUndefined()
    })
})

describe('the calendar days', () => {
    it('go to a Date at local midnight and back', () => {
        expect(isoDate(dateOf('2026-03-29'))).toBe('2026-03-29')
        expect(dateOf('2026-11-09').getHours()).toBe(0)
    })
})

describe('timesOfDay', () => {
    it('lists the day every step from midnight', () => {
        expect(timesOfDay(30)).toHaveLength(48)
        expect(timesOfDay(30).slice(0, 3)).toEqual(['00:00', '00:30', '01:00'])
        expect(timesOfDay(90).at(-1)).toBe('22:30')
    })
})
