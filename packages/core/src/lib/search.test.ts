import { describe, expect, it } from 'vitest'

import {
    countFacets,
    filterGroups,
    KIND_FACET,
    literalRanges,
    queryRanges,
    queryWords,
    searchEntries,
    searchKey,
    toggleChosen,
    type SearchGroup,
} from './search'

const GROUPS: SearchGroup[] = [
    {
        kind: 'jobs',
        title: 'Jobs',
        results: [
            { id: 'nightly-export', title: 'nightly-export', facets: { project: 'harbor' } },
            { id: 'import-orders', title: 'import-orders', facets: { project: 'juniper' } },
        ],
        total: 5,
    },
    { kind: 'files', title: 'Files', results: [] },
    { kind: 'people', title: 'People', results: [{ id: 'ada', title: 'Ada', facets: { project: 'harbor' } }] },
]

describe('searchEntries', () => {
    it('lists the results in drawn order with their groups, skipping empty groups', () => {
        const entries = searchEntries(GROUPS)
        expect(entries.map((entry) => [entry.index, entry.group.kind, entry.result.id])).toEqual([
            [0, 'jobs', 'nightly-export'],
            [1, 'jobs', 'import-orders'],
            [2, 'people', 'ada'],
        ])
    })
})

describe('literalRanges', () => {
    it('finds every occurrence of the whole term, in any case', () => {
        expect(literalRanges('sync-inventory failed; Sync-Inventory retried', 'sync-inventory')).toEqual([
            { start: 0, end: 14 },
            { start: 23, end: 37 },
        ])
    })

    it('finds nothing for a blank term', () => {
        expect(literalRanges('nightly-export', '  ')).toEqual([])
    })
})

describe('queryRanges', () => {
    it('marks each word of the query wherever it occurs, in any case', () => {
        expect(queryRanges('Nightly export of the EXPORT log', 'export')).toEqual([
            { start: 8, end: 14 },
            { start: 22, end: 28 },
        ])
        expect(queryRanges('import-orders', 'ord imp')).toEqual([
            { start: 0, end: 3 },
            { start: 7, end: 10 },
        ])
    })

    it('marks nothing for an empty query', () => {
        expect(queryRanges('nightly-export', '  ')).toEqual([])
    })

    it('drops a word held inside another', () => {
        expect(queryWords('ex Export export')).toEqual(['export'])
    })
})

describe('searchKey', () => {
    it('moves down and up, wrapping at the ends', () => {
        expect(searchKey('ArrowDown', -1, 3, true)).toEqual({ type: 'move', index: 0 })
        expect(searchKey('ArrowDown', 0, 3, true)).toEqual({ type: 'move', index: 1 })
        expect(searchKey('ArrowDown', 2, 3, true)).toEqual({ type: 'move', index: 0 })
        expect(searchKey('ArrowUp', 0, 3, true)).toEqual({ type: 'move', index: 2 })
        expect(searchKey('ArrowUp', -1, 3, true)).toEqual({ type: 'move', index: 2 })
        expect(searchKey('ArrowUp', 2, 3, true)).toEqual({ type: 'move', index: 1 })
    })

    it('jumps to the ends with Home and End', () => {
        expect(searchKey('Home', 2, 3, true)).toEqual({ type: 'move', index: 0 })
        expect(searchKey('End', 0, 3, true)).toEqual({ type: 'move', index: 2 })
    })

    it('opens the highlighted entry with Enter, and nothing when none is', () => {
        expect(searchKey('Enter', 1, 3, true)).toEqual({ type: 'open', index: 1 })
        expect(searchKey('Enter', -1, 3, true)).toBeNull()
    })

    it('closes an open list with Escape and leaves a closed one to the field', () => {
        expect(searchKey('Escape', 1, 3, true)).toEqual({ type: 'close' })
        expect(searchKey('Escape', -1, 0, false)).toBeNull()
    })

    it('does nothing with an empty or closed list, or another key', () => {
        expect(searchKey('ArrowDown', -1, 0, true)).toBeNull()
        expect(searchKey('ArrowDown', 0, 3, false)).toBeNull()
        expect(searchKey('a', 0, 3, true)).toBeNull()
    })
})

describe('facets', () => {
    it('counts the kind and the app facets, each under the choices in the others', () => {
        const facets = countFacets(GROUPS, [{ id: 'project', title: 'Project' }], { project: ['harbor'] })
        expect(facets[0]).toEqual({
            id: KIND_FACET,
            title: 'Kind',
            values: [
                { value: 'jobs', label: 'Jobs', count: 1 },
                { value: 'files', label: 'Files', count: 0 },
                { value: 'people', label: 'People', count: 1 },
            ],
        })
        // The project's own counts ignore the project choice, so each value says what it would show.
        expect(facets[1].values).toEqual([
            { value: 'harbor', label: undefined, count: 2 },
            { value: 'juniper', label: undefined, count: 1 },
        ])
        const byKind = countFacets(GROUPS, [{ id: 'project', title: 'Project' }], { [KIND_FACET]: ['people'] })
        expect(byKind[1].values).toEqual([{ value: 'harbor', label: undefined, count: 1 }])
    })

    it('narrows the groups to the chosen values and drops those left empty', () => {
        const narrowed = filterGroups(GROUPS, { project: ['juniper'] })
        expect(narrowed.map((group) => [group.kind, group.results.map((result) => result.id), group.total])).toEqual([
            ['jobs', ['import-orders'], 1],
        ])
        expect(filterGroups(GROUPS, { project: [] })).toHaveLength(2)
    })

    it('turns a value on and off', () => {
        const on = toggleChosen({}, 'project', 'harbor')
        expect(on).toEqual({ project: ['harbor'] })
        expect(toggleChosen(on, 'project', 'harbor')).toEqual({ project: [] })
    })
})
