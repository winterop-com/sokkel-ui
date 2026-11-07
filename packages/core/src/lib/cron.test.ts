import { describe, expect, it } from 'vitest'

import { describeCron, nextRuns, parseCron } from './cron'

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
    })
})
