import { describe, expect, it } from 'vitest'

import { parsePeriod, periodIssue, periodOf, recentPeriods } from './periods'

describe('recentPeriods', () => {
    it('lists the months newest first, the current one leading', () => {
        const months = recentPeriods('monthly', '2026-11-08')
        expect(months).toHaveLength(13)
        expect(months[0]).toMatchObject({ id: '202611', label: 'November 2026', start: '2026-11-01', end: '2026-11-30' })
        expect(months[1].id).toBe('202610')
        expect(months[12].id).toBe('202511')
    })

    it('numbers weeks by ISO, a year with 53 of them included', () => {
        const weeks = recentPeriods('weekly', '2026-11-08', 3)
        expect(weeks.map((week) => week.id)).toEqual(['2026W45', '2026W44', '2026W43'])
        expect(weeks[0]).toMatchObject({ start: '2026-11-02', end: '2026-11-08', label: 'Week 45, 2026 (from Mon, Nov 2)' })
        // 2026 starts on a Thursday, so it has a week 53, and January 1, 2027 falls in it.
        expect(periodOf('weekly', '2027-01-01')?.id).toBe('2026W53')
        expect(periodOf('weekly', '2027-01-04')?.id).toBe('2027W1')
    })

    it('steps days across a month and a leap day', () => {
        expect(recentPeriods('daily', '2028-03-01', 3).map((period) => period.id)).toEqual(['20280301', '20280229', '20280228'])
    })

    it('names the spans of months by their first month', () => {
        expect(recentPeriods('bimonthly', '2026-11-08', 3).map((period) => period.id)).toEqual(['202611B', '202609B', '202607B'])
        expect(recentPeriods('quarterly', '2026-11-08', 3).map((period) => period.id)).toEqual(['2026Q4', '2026Q3', '2026Q2'])
        expect(recentPeriods('sixmonthly', '2026-11-08', 3).map((period) => period.id)).toEqual(['2026S2', '2026S1', '2025S2'])
        expect(recentPeriods('quarterly', '2026-11-08', 1)[0]).toMatchObject({ label: 'October to December 2026', end: '2026-12-31' })
        expect(recentPeriods('yearly', '2026-11-08', 2).map((period) => period.id)).toEqual(['2026', '2025'])
    })

    it('lists nothing for text that is not a day', () => {
        expect(recentPeriods('monthly', '2026-13-01')).toEqual([])
        expect(recentPeriods('monthly', 'today')).toEqual([])
    })
})

describe('parsePeriod', () => {
    it('reads every shape back into its type', () => {
        expect(parsePeriod('20261108')?.type).toBe('daily')
        expect(parsePeriod('2026W45')?.type).toBe('weekly')
        expect(parsePeriod('202611')?.type).toBe('monthly')
        expect(parsePeriod('202611B')?.type).toBe('bimonthly')
        expect(parsePeriod('2026Q4')?.type).toBe('quarterly')
        expect(parsePeriod('2026S2')?.type).toBe('sixmonthly')
        expect(parsePeriod('2026')?.type).toBe('yearly')
    })

    it('refuses ids that name no period', () => {
        for (const id of ['202613', '20260230', '2026W54', '2025W53', '2026W05', '202612B', '2026Q5', '2026S3', '26', '']) {
            expect(parsePeriod(id), id).toBeNull()
        }
        expect(parsePeriod('2026W53')?.end).toBe('2027-01-03')
    })

    it('refuses an id of another type when a type is asked', () => {
        expect(parsePeriod('2026Q4', 'monthly')).toBeNull()
        expect(parsePeriod('202611', 'monthly')?.label).toBe('November 2026')
    })
})

describe('periodIssue', () => {
    it('says why a typed id does not fit', () => {
        expect(periodIssue('202611', 'monthly')).toBeNull()
        expect(periodIssue(' ', 'monthly')).toBe('Type a period id.')
        expect(periodIssue('2026Q4', 'monthly')).toBe('2026Q4 is a quarterly period; this one is monthly, such as 202611.')
        expect(periodIssue('2026-11', 'monthly')).toBe('2026-11 is not a period id. A monthly period is written like 202611.')
    })
})
