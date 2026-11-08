import { describe, expect, it } from 'vitest'

import {
    activeFilters,
    dayOf,
    filterComplete,
    filterRows,
    matchesFilter,
    newFilter,
    sameFilters,
    withOperator,
    type Filter,
    type FilterRule,
} from './filters'

interface Run {
    id: string
    job: string
    state: string
    tags: string[]
    seconds: number | null
    day: string
}

const RUNS: Run[] = [
    { id: 'run_8f3a00', job: 'nightly-export', state: 'failed', tags: ['nightly', 'export'], seconds: 420, day: '2026-11-08' },
    { id: 'run_8f3a01', job: 'sync-inventory', state: 'succeeded', tags: ['hourly'], seconds: 38, day: '2026-11-07' },
    { id: 'run_8f3a02', job: 'rebuild-index', state: 'cancelled', tags: [], seconds: null, day: '2026-11-02' },
    { id: 'run_8f3a03', job: 'send-digest', state: 'failed', tags: ['nightly'], seconds: 61, day: '2026-11-01' },
]

const FIELDS: FilterRule<Run>[] = [
    { id: 'run', type: 'text', value: (run) => run.id },
    { id: 'job', type: 'set', value: (run) => run.job },
    { id: 'state', type: 'set', value: (run) => run.state },
    { id: 'tags', type: 'set', value: (run) => run.tags },
    { id: 'duration', type: 'number', value: (run) => run.seconds },
    { id: 'started', type: 'date', value: (run) => run.day },
    { id: 'unread', type: 'text' },
]

const ids = (filters: Filter[]) => filterRows(RUNS, filters, FIELDS).map((run) => run.id.slice(-2))

describe('filter state', () => {
    it('says whether a filter has enough to filter by', () => {
        expect(filterComplete({ field: 'job', operator: 'contains', values: [] })).toBe(false)
        expect(filterComplete({ field: 'job', operator: 'contains', values: ['  '] })).toBe(false)
        expect(filterComplete({ field: 'job', operator: 'contains', values: ['export'] })).toBe(true)
        expect(filterComplete({ field: 'state', operator: 'oneOf', values: [] })).toBe(false)
        expect(filterComplete({ field: 'state', operator: 'oneOf', values: ['failed'] })).toBe(true)
        expect(filterComplete({ field: 'duration', operator: 'between', values: ['', ''] })).toBe(false)
        expect(filterComplete({ field: 'duration', operator: 'between', values: ['', '60'] })).toBe(true)
    })

    it('leaves out a filter still being filled in', () => {
        const filters: Filter[] = [
            { field: 'state', operator: 'oneOf', values: ['failed'] },
            { field: 'job', operator: 'is', values: [] },
        ]
        expect(activeFilters(filters)).toEqual([filters[0]])
        expect(ids(filters)).toEqual(['00', '03'])
    })

    it('starts a new filter on the first operator its field offers, with no value', () => {
        expect(newFilter('state', 'set')).toEqual({ field: 'state', operator: 'oneOf', values: [] })
        expect(newFilter('duration', 'number', ['atLeast', 'atMost'])).toEqual({ field: 'duration', operator: 'atLeast', values: [] })
        expect(newFilter('started', 'date')).toEqual({ field: 'started', operator: 'between', values: [] })
    })

    it('keeps what still fits when the operator changes', () => {
        const bound: Filter = { field: 'duration', operator: 'atLeast', values: ['60'] }
        expect(withOperator(bound, 'between')).toEqual({ field: 'duration', operator: 'between', values: ['60', ''] })
        expect(withOperator({ ...bound, operator: 'between', values: ['', '300'] }, 'atMost').values).toEqual(['300'])
        expect(withOperator({ field: 'state', operator: 'oneOf', values: ['failed', 'cancelled'] }, 'noneOf').values).toEqual([
            'failed',
            'cancelled',
        ])
        expect(withOperator(bound, 'atLeast')).toBe(bound)
    })

    it('compares lists of filters by what they keep, in any order', () => {
        const a: Filter[] = [
            { field: 'state', operator: 'oneOf', values: ['failed', 'cancelled'] },
            { field: 'duration', operator: 'atLeast', values: ['60'] },
        ]
        const b: Filter[] = [
            { field: 'duration', operator: 'atLeast', values: [' 60 '] },
            { field: 'state', operator: 'oneOf', values: ['cancelled', 'failed'] },
            { field: 'job', operator: 'is', values: [] },
        ]
        expect(sameFilters(a, b)).toBe(true)
        expect(sameFilters(a, [a[0]])).toBe(false)
        expect(sameFilters(a, [a[0], { ...a[1], operator: 'atMost' }])).toBe(false)
    })
})

describe('operators', () => {
    it('matches text by is, is not and contains, without case', () => {
        expect(ids([{ field: 'run', operator: 'is', values: ['RUN_8F3A01'] }])).toEqual(['01'])
        expect(ids([{ field: 'run', operator: 'isNot', values: ['run_8f3a01'] }])).toEqual(['00', '02', '03'])
        expect(ids([{ field: 'run', operator: 'contains', values: ['3a0'] }])).toEqual(['00', '01', '02', '03'])
        expect(ids([{ field: 'job', operator: 'contains', values: ['IN'] }])).toEqual(['01', '02'])
    })

    it('matches a set by any of and none of, a row holding several values passing on any', () => {
        expect(ids([{ field: 'state', operator: 'oneOf', values: ['failed', 'cancelled'] }])).toEqual(['00', '02', '03'])
        expect(ids([{ field: 'state', operator: 'noneOf', values: ['failed'] }])).toEqual(['01', '02'])
        expect(ids([{ field: 'tags', operator: 'oneOf', values: ['nightly'] }])).toEqual(['00', '03'])
        expect(ids([{ field: 'tags', operator: 'noneOf', values: ['nightly', 'hourly'] }])).toEqual(['02'])
    })

    it('matches a number by a range with its ends, failing a row without one', () => {
        expect(ids([{ field: 'duration', operator: 'atLeast', values: ['61'] }])).toEqual(['00', '03'])
        expect(ids([{ field: 'duration', operator: 'atMost', values: ['61'] }])).toEqual(['01', '03'])
        expect(ids([{ field: 'duration', operator: 'between', values: ['38', '61'] }])).toEqual(['01', '03'])
        expect(ids([{ field: 'duration', operator: 'between', values: ['100', ''] }])).toEqual(['00'])
        expect(ids([{ field: 'duration', operator: 'between', values: ['', '40'] }])).toEqual(['01'])
    })

    it('matches a day by between with its ends, and after and before without the day itself', () => {
        expect(ids([{ field: 'started', operator: 'between', values: ['2026-11-02', '2026-11-08'] }])).toEqual(['00', '01', '02'])
        expect(ids([{ field: 'started', operator: 'after', values: ['2026-11-07'] }])).toEqual(['00'])
        expect(ids([{ field: 'started', operator: 'before', values: ['2026-11-02'] }])).toEqual(['03'])
        expect(ids([{ field: 'started', operator: 'between', values: ['', '2026-11-02'] }])).toEqual(['02', '03'])
    })

    it('reads a day from a date in local time, a timestamp and the start of a string', () => {
        expect(dayOf(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08')
        expect(dayOf('2026-11-08T23:59:00Z')).toBe('2026-11-08')
        expect(dayOf(new Date(2026, 0, 5).getTime())).toBe('2026-01-05')
        expect(dayOf('yesterday')).toBeUndefined()
        expect(matchesFilter(new Date(2026, 10, 3, 9), { field: 'started', operator: 'after', values: ['2026-11-02'] }, 'date')).toBe(true)
    })

    it('applies every filter at once, and leaves the rows be for a field it cannot read', () => {
        const filters: Filter[] = [
            { field: 'state', operator: 'oneOf', values: ['failed'] },
            { field: 'duration', operator: 'atLeast', values: ['100'] },
        ]
        expect(ids(filters)).toEqual(['00'])
        expect(ids([{ field: 'unread', operator: 'is', values: ['x'] }])).toEqual(['00', '01', '02', '03'])
        expect(ids([{ field: 'missing', operator: 'is', values: ['x'] }])).toEqual(['00', '01', '02', '03'])
    })
})
