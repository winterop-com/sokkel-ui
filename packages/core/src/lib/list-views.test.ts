import { describe, expect, it } from 'vitest'

import { EMPTY_VIEW, columnOrder, viewChanges, type ListViewState } from './list-views'

const COLUMNS = ['job', 'state', 'by', 'started', 'duration']

const SAVED: ListViewState = {
    filters: [
        { field: 'state', operator: 'oneOf', values: ['failed'] },
        { field: 'started', operator: 'between', values: ['2026-11-02', '2026-11-08'] },
    ],
    sort: { column: 'started', direction: 'desc' },
    hidden: ['by', 'duration'],
    order: ['state', 'started'],
    widths: { job: 240.4 },
}

describe('view differences', () => {
    it('finds none in the same setup said another way', () => {
        const now: ListViewState = {
            filters: [
                { field: 'started', operator: 'between', values: ['2026-11-02', '2026-11-08'] },
                { field: 'state', operator: 'oneOf', values: ['failed'] },
                { field: 'job', operator: 'oneOf', values: [] },
            ],
            sort: { column: 'started', direction: 'desc' },
            hidden: ['duration', 'by', 'by'],
            order: ['state', 'started', 'job', 'by', 'duration'],
            widths: { job: 240 },
        }
        expect(viewChanges(SAVED, now, COLUMNS)).toEqual([])
    })

    it('says which parts changed', () => {
        expect(viewChanges(SAVED, { ...SAVED, filters: SAVED.filters.slice(1) })).toEqual(['filters'])
        expect(viewChanges(SAVED, { ...SAVED, sort: { column: 'started', direction: 'asc' } })).toEqual(['sort'])
        expect(viewChanges(SAVED, { ...SAVED, sort: null })).toEqual(['sort'])
        expect(viewChanges(SAVED, { ...SAVED, hidden: ['by'] })).toEqual(['columns'])
        expect(viewChanges(SAVED, { ...SAVED, order: ['started', 'state'] }, COLUMNS)).toEqual(['columns'])
        expect(viewChanges(SAVED, { ...SAVED, widths: { job: 300 } })).toEqual(['columns'])
        expect(viewChanges(SAVED, { ...SAVED, widths: {} })).toEqual(['columns'])
        expect(viewChanges(SAVED, { ...SAVED, extra: { group: 'job' } })).toEqual(['extra'])
        expect(viewChanges(EMPTY_VIEW, { ...SAVED, extra: {} })).toEqual(['filters', 'sort', 'columns'])
    })

    it('compares an order as the table draws it once it knows the columns', () => {
        const given = { ...EMPTY_VIEW, order: COLUMNS }
        expect(viewChanges(EMPTY_VIEW, given, COLUMNS)).toEqual([])
        expect(viewChanges(EMPTY_VIEW, given)).toEqual(['columns'])
    })

    it('compares extra as data, whatever order its keys come in', () => {
        const a = { ...EMPTY_VIEW, extra: { group: 'job', density: 'compact' } }
        const b = { ...EMPTY_VIEW, extra: { density: 'compact', group: 'job', unset: undefined } }
        expect(viewChanges(a, b)).toEqual([])
    })
})

describe('column order', () => {
    it('names the given columns first, then the rest in their own order, once each, the first column staying first', () => {
        expect(columnOrder([], COLUMNS)).toEqual(COLUMNS)
        expect(columnOrder(['duration', 'gone', 'duration', 'state'], COLUMNS)).toEqual(['job', 'duration', 'state', 'by', 'started'])
        expect(columnOrder(['state', 'job'], COLUMNS)).toEqual(['job', 'state', 'by', 'started', 'duration'])
    })
})
