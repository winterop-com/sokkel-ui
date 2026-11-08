import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FilterBar, saidFilter, type FilterField } from './FilterBar'

const FIELDS: FilterField[] = [
    {
        id: 'state',
        label: 'State',
        type: 'set',
        options: [{ value: 'failed' }, { value: 'cancelled' }, { value: 'skipped', label: 'Skipped on purpose' }],
    },
    { id: 'run', label: 'Run', type: 'text' },
    { id: 'duration', label: 'Duration', type: 'number', unit: 's' },
    { id: 'started', label: 'Started', type: 'date' },
]

const field = (id: string) => FIELDS.find((one) => one.id === id) as FilterField

describe('what a chip says', () => {
    it('says a set as is or is any of, by how many are chosen, with their labels', () => {
        expect(saidFilter({ field: 'state', operator: 'oneOf', values: ['failed'] }, field('state'))).toEqual({
            operator: 'is',
            value: 'failed',
        })
        expect(saidFilter({ field: 'state', operator: 'oneOf', values: ['failed', 'skipped'] }, field('state'))).toEqual({
            operator: 'is any of',
            value: 'failed, Skipped on purpose',
        })
        expect(saidFilter({ field: 'state', operator: 'noneOf', values: ['failed', 'cancelled', 'skipped'] }, field('state'))).toEqual({
            operator: 'is none of',
            value: 'failed +2',
        })
        expect(saidFilter({ field: 'state', operator: 'noneOf', values: ['skipped'] }, field('state')).operator).toBe('is not')
    })

    it('says text and a bound with their operator, a number in its unit', () => {
        expect(saidFilter({ field: 'run', operator: 'contains', values: ['8f3a'] }, field('run'))).toEqual({
            operator: 'contains',
            value: '8f3a',
        })
        expect(saidFilter({ field: 'duration', operator: 'atLeast', values: ['1200'] }, field('duration'))).toEqual({
            operator: 'at least',
            value: '1,200 s',
        })
        expect(saidFilter({ field: 'started', operator: 'before', values: ['2026-11-08'] }, field('started'))).toEqual({
            operator: 'before',
            value: 'Nov 8',
        })
    })

    it('says a range by its two ends, or by the one end it has', () => {
        expect(saidFilter({ field: 'started', operator: 'between', values: ['2026-11-02', '2026-11-08'] }, field('started'))).toEqual({
            operator: '',
            value: 'Nov 2 – Nov 8',
        })
        expect(saidFilter({ field: 'duration', operator: 'between', values: ['60', '300'] }, field('duration')).value).toBe('60 – 300 s')
        expect(saidFilter({ field: 'duration', operator: 'between', values: ['60', ''] }, field('duration'))).toEqual({
            operator: 'at least',
            value: '60 s',
        })
        expect(saidFilter({ field: 'started', operator: 'between', values: ['', '2026-11-08'] }, field('started'))).toEqual({
            operator: 'until',
            value: 'Nov 8',
        })
    })

    it('uses a field’s own format', () => {
        const minutes: FilterField = { ...field('duration'), format: (value) => `${String(Number(value) / 60)} min` }
        expect(saidFilter({ field: 'duration', operator: 'atMost', values: ['120'] }, minutes).value).toBe('2 min')
    })
})

describe('the bar', () => {
    it('draws a chip for each filter and Clear all, and only the add button with none', () => {
        const set = renderToStaticMarkup(
            <FilterBar
                fields={FIELDS}
                defaultFilters={[
                    { field: 'state', operator: 'oneOf', values: ['failed'] },
                    { field: 'duration', operator: 'atLeast', values: ['60'] },
                    { field: 'gone', operator: 'is', values: ['x'] },
                ]}
            />,
        )
        expect(set).toContain('aria-label="Remove State"')
        expect(set).toContain('aria-label="Remove Duration"')
        expect(set).toContain('60 s')
        expect(set).toContain('Clear all')
        expect(set).toContain('aria-label="Add filter"')
        const empty = renderToStaticMarkup(<FilterBar fields={FIELDS} />)
        expect(empty).toContain('Filter')
        expect(empty).not.toContain('Clear all')
    })

    it('says its words as the app gives them', () => {
        const html = renderToStaticMarkup(
            <FilterBar
                fields={FIELDS}
                defaultFilters={[{ field: 'run', operator: 'isNot', values: ['run_8f3a00'] }]}
                words={{ clear: 'Fjern alle', operators: { isNot: 'er ikke' } }}
            />,
        )
        expect(html).toContain('Fjern alle')
        expect(html).toContain('er ikke')
    })
})
