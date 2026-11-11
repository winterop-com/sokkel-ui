import { describe, expect, it } from 'vitest'

import { describeCron, nextRuns, parseCron, zoneOffset, zonedTime } from './cron'

const FROM = new Date('2026-11-05T10:17:00Z')
const iso = (dates: Date[]) => dates.map((date) => date.toISOString().slice(0, 16))

describe('parseCron', () => {
    it('reads ranges, steps, lists and names', () => {
        const cron = parseCron('*/15 9-17 * jan,jul mon-fri')
        expect(cron?.minutes).toEqual([0, 15, 30, 45])
        expect(cron?.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
        expect(cron?.months).toEqual([1, 7])
        expect(cron?.weekdays).toEqual([1, 2, 3, 4, 5])
    })

    it('takes 7 as Sunday', () => {
        expect(parseCron('0 0 * * 7')?.weekdays).toEqual([0])
    })

    it('refuses what is not five valid fields', () => {
        for (const bad of ['', '* * * *', '60 * * * *', '* * * * * *', '*/0 * * * *', '5-1 * * * *', 'a * * * *']) {
            expect(parseCron(bad)).toBeNull()
        }
    })
})

describe('nextRuns', () => {
    it('lists the next five runs after a time', () => {
        expect(iso(nextRuns('0 2 * * 1-5', FROM))).toEqual([
            '2026-11-06T02:00',
            '2026-11-09T02:00',
            '2026-11-10T02:00',
            '2026-11-11T02:00',
            '2026-11-12T02:00',
        ])
    })

    it('fires on either the day or the weekday when both are given', () => {
        expect(iso(nextRuns('0 0 1 * 0', FROM, 3))).toEqual(['2026-11-08T00:00', '2026-11-15T00:00', '2026-11-22T00:00'])
    })

    it('skips the current minute', () => {
        expect(iso(nextRuns('17 10 * * *', FROM, 1))).toEqual(['2026-11-06T10:17'])
    })

    it('returns nothing for an expression that is not one', () => {
        expect(nextRuns('nope', FROM)).toEqual([])
    })
})

describe('nextRuns in a zone', () => {
    const OSLO = 'Europe/Oslo'

    it('reads the hours in the zone', () => {
        expect(iso(nextRuns('0 2 * * *', new Date('2027-01-10T12:00:00Z'), 2, OSLO))).toEqual(['2027-01-11T01:00', '2027-01-12T01:00'])
        expect(iso(nextRuns('0 2 * * *', new Date('2027-06-10T12:00:00Z'), 1, OSLO))).toEqual(['2027-06-11T00:00'])
    })

    it('counts from the day it is in the zone, not in UTC', () => {
        expect(iso(nextRuns('30 0 * * *', new Date('2027-01-10T23:10:00Z'), 1, OSLO))).toEqual(['2027-01-10T23:30'])
    })

    it('moves a time the clock skips in spring to the instant it jumps', () => {
        expect(iso(nextRuns('0 2 * * *', new Date('2027-03-25T12:00:00Z'), 5, OSLO))).toEqual([
            '2027-03-26T01:00',
            '2027-03-27T01:00',
            '2027-03-28T01:00',
            '2027-03-29T00:00',
            '2027-03-30T00:00',
        ])
        expect(iso(nextRuns('30 2 * * *', new Date('2027-03-27T12:00:00Z'), 1, OSLO))).toEqual(['2027-03-28T01:00'])
    })

    it('runs the skipped times once between them', () => {
        expect(iso(nextRuns('*/30 1-3 * * *', new Date('2027-03-27T23:00:00Z'), 4, OSLO))).toEqual([
            '2027-03-28T00:00',
            '2027-03-28T00:30',
            '2027-03-28T01:00',
            '2027-03-28T01:30',
        ])
    })

    it('runs a time the clock passes twice in autumn once, at its first pass', () => {
        expect(iso(nextRuns('30 2 * * *', new Date('2027-10-30T12:00:00Z'), 2, OSLO))).toEqual(['2027-10-31T00:30', '2027-11-01T01:30'])
        expect(iso(nextRuns('0 * * * *', new Date('2027-10-30T23:30:00Z'), 3, OSLO))).toEqual([
            '2027-10-31T00:00',
            '2027-10-31T02:00',
            '2027-10-31T03:00',
        ])
    })

    it('takes UTC as no zone', () => {
        expect(nextRuns('0 2 * * 1-5', FROM, 5, 'UTC')).toEqual(nextRuns('0 2 * * 1-5', FROM))
    })
})

describe('zonedTime and zoneOffset', () => {
    it('read an instant on the wall clock of a zone', () => {
        const at = new Date('2027-03-28T01:00:00Z')
        expect(zonedTime(at, 'Europe/Oslo')).toEqual({ year: 2027, month: 3, day: 28, hour: 3, minute: 0, weekday: 0 })
        expect(zoneOffset(at, 'Europe/Oslo')).toBe(2 * 3_600_000)
        expect(zoneOffset(new Date('2027-03-28T00:59:00Z'), 'Europe/Oslo')).toBe(3_600_000)
        expect(zoneOffset(at)).toBe(0)
    })
})

describe('describeCron', () => {
    it.each([
        ['* * * * *', 'Every minute'],
        ['*/15 * * * *', 'Every 15 minutes'],
        ['0 * * * *', 'Every hour, on the hour'],
        ['30 */6 * * *', 'Every 6 hours at 30 minutes past'],
        ['0 2 * * *', 'Every day at 02:00'],
        ['0 2 * * 1-5', 'At 02:00 on weekdays'],
        ['30 6,18 * * sat,sun', 'At 06:30 and 18:30 on weekends'],
        ['0 9 1 * *', 'At 09:00 on the 1st'],
        ['0 0 * jan *', 'Every day at 00:00 in January'],
        ['0 9-17 * * mon-thu', 'Every hour from 09:00 to 17:00 on Monday to Thursday'],
    ])('reads %s as %s', (expression, said) => {
        expect(describeCron(expression)).toBe(said)
    })

    it('is null for what is not an expression', () => {
        expect(describeCron('every day')).toBeNull()
        expect(describeCron('0 2 L * ?')).toBeNull()
    })

    it('reads in the words it is given, English where it is given none', () => {
        const words = {
            dayNames: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
            lastSeparator: ' og ',
            ordinal: (day: number) => `${String(day)}.`,
            at: (times: string) => `kl. ${times}`,
            onWeekdays: (days: string) => `på ${days}`,
            onDays: (days: string) => `den ${days}`,
            weekdays: 'på hverdager',
        }
        expect(describeCron('30 6,18 * * mon,fri', words)).toBe('Kl. 06:30 og 18:30 på mandag og fredag')
        expect(describeCron('0 2 * * 1-5', words)).toBe('Kl. 02:00 på hverdager')
        expect(describeCron('0 0 * jan *', words)).toBe('Every day kl. 00:00 in January')
        expect(describeCron('0 3 1,10,20 * *', words)).toBe('Kl. 03:00 den 1., 10. og 20.')
    })
})
