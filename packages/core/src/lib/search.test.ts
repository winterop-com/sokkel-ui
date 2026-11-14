import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { releaser } from '../hooks/use-busy-release'
import { WAIT_SHOWN } from './durations'
import {
    countFacets,
    filterGroups,
    KIND_FACET,
    literalRanges,
    queryRanges,
    queryWords,
    SEARCH_IDLE,
    searchEntries,
    searchFor,
    searchKey,
    searchWait,
    toggleChosen,
    type SearchGroup,
    type SearchState,
    type SearchWait,
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
    it('moves down and up, stopping at the ends', () => {
        expect(searchKey('ArrowDown', -1, 3, true)).toEqual({ type: 'move', index: 0 })
        expect(searchKey('ArrowDown', 0, 3, true)).toEqual({ type: 'move', index: 1 })
        expect(searchKey('ArrowDown', 2, 3, true)).toEqual({ type: 'move', index: 2 })
        expect(searchKey('ArrowUp', 0, 3, true)).toEqual({ type: 'move', index: 0 })
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

describe('searchFor', () => {
    const LAOS: readonly SearchGroup[] = [{ kind: 'places', title: 'Places', results: [{ id: 'laos', title: 'Laos' }] }]
    const done: SearchState = { state: 'done', query: 'Laos', groups: LAOS }
    const failed: SearchState = { state: 'failed', query: 'Uganda', groups: [], reason: 'offline' }

    it('stands as itself for the query it is about', () => {
        expect(searchFor(done, 'Laos')).toBe(done)
        expect(searchFor(failed, 'Uganda')).toBe(failed)
    })

    it('never shows an older query’s results as the query’s own: they wait as stale while it loads', () => {
        // Typed while the next ask waits out the pause in typing, and while it is asked.
        expect(searchFor(done, 'Uganda')).toEqual({ state: 'loading', query: 'Uganda', groups: LAOS })
        expect(searchFor(done, 'Uganda', true)).toEqual({ state: 'loading', query: 'Uganda', groups: LAOS })
    })

    it('keeps no results after a failure, so nothing from an earlier query outlives it', () => {
        expect(searchFor(failed, 'Kenya')).toEqual({ state: 'loading', query: 'Kenya', groups: [] })
    })

    it('asks a failed query again from nothing, and keeps an answer the query already has', () => {
        expect(searchFor(failed, 'Uganda', true)).toEqual({ state: 'loading', query: 'Uganda', groups: [] })
        expect(searchFor(done, 'Laos', true)).toBe(done)
    })

    it('starts from nothing', () => {
        expect(searchFor(SEARCH_IDLE, 'Laos', true)).toEqual({ state: 'loading', query: 'Laos', groups: [] })
    })

    it('keeps results stale while a query is refined in one open list', () => {
        // Laos answered, then Lao typed: Laos's results wait dimmed while Lao is asked.
        expect(searchFor(done, 'Lao', true)).toEqual({ state: 'loading', query: 'Lao', groups: LAOS })
    })
})

describe('a cleared search', () => {
    // `useSearch` holds SEARCH_IDLE once its query is emptied or its list closed, whatever it held before.
    it('shows a query typed after clearing, or in a list opened again, as searching, not with old results', () => {
        expect(searchFor(SEARCH_IDLE, 'Uganda', true)).toEqual({ state: 'loading', query: 'Uganda', groups: [] })
        expect(searchFor(SEARCH_IDLE, 'Uganda')).toEqual({ state: 'loading', query: 'Uganda', groups: [] })
        // The same query asked again after reopening starts from nothing too.
        expect(searchFor(SEARCH_IDLE, 'Laos', true)).toEqual({ state: 'loading', query: 'Laos', groups: [] })
    })
})

/** The jobs a search over Tidevann's jobs finds for a query: those whose name holds it. */
const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const jobsFor = (query: string): SearchGroup[] => {
    const results = JOBS.filter((job) => job.includes(query)).map((job) => ({ id: job, title: job }))
    return results.length === 0 ? [] : [{ kind: 'jobs', title: 'Jobs', results }]
}

/**
 * Keys typed into a list over a search that answers `answerIn` ms after each ask, with no pause in
 * typing: as `useSearch` holds the answer and times its wait (`releaser` over `wait-shown`, as
 * `useBusyRelease` runs it), and as the list draws it (`searchWait`). Every drawing is kept, with
 * when it was drawn.
 */
function typist(answerIn: number, found: (query: string) => SearchGroup[] = jobsFor) {
    let held: SearchState = SEARCH_IDLE
    let query = ''
    let loading = false
    let slow = false
    const drawn: (SearchWait & { at: number; query: string })[] = []
    const start = Date.now()
    const draw = () => {
        const state = searchFor(held, query)
        const now = state.state === 'loading'
        if (now !== loading) {
            loading = now
            timing.busy(now)
        }
        drawn.push({ ...searchWait(state, loading && slow), at: Date.now() - start, query })
    }
    const timing = releaser(WAIT_SHOWN, (released) => {
        if (released === slow) return
        slow = released
        draw()
    })
    return {
        drawn,
        type(next: string) {
            query = next
            draw()
            held = searchFor(held, next, true)
            setTimeout(() => {
                if (query !== next) return
                held = { state: 'done', query: next, groups: found(next) }
                draw()
            }, answerIn)
        },
    }
}

describe("a search's wait", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('is the wait-shown token, 300 ms', () => {
        const tokens = JSON.parse(readFileSync(join(__dirname, '..', '..', 'tokens', 'tokens.json'), 'utf8')) as {
            themes: { tidevann: { light: Record<string, string> } }
        }
        expect(tokens.themes.tidevann.light['wait-shown']).toBe('300ms')
        expect(WAIT_SHOWN).toBe(300)
    })

    it('never draws Searching nor dims for answers that come within a frame, eleven keys typed 120 ms apart', () => {
        const typing = typist(16, () => [])
        for (let length = 1; length <= 11; length++) setTimeout(() => typing.type('nightly-exp'.slice(0, length)), (length - 1) * 120)
        vi.advanceTimersByTime(11 * 120 + 1000)
        expect(typing.drawn.filter((drawing) => drawing.searching || drawing.dimmed)).toEqual([])
        // Each key left the list out of reach only until its answer.
        expect(typing.drawn.filter((drawing) => drawing.stale).map((drawing) => drawing.query)).toEqual(
            [...'nightly-exp'].map((_, index) => 'nightly-exp'.slice(0, index + 1)),
        )
        expect(typing.drawn.at(-1)).toMatchObject({ stale: false, query: 'nightly-exp' })
    })

    it('keeps earlier results undimmed for a quick answer, though out of reach until it comes', () => {
        const typing = typist(40)
        typing.type('n')
        vi.advanceTimersByTime(100)
        typing.type('ni')
        expect(typing.drawn.at(-1)).toMatchObject({ stale: true, dimmed: false, searching: false })
        vi.advanceTimersByTime(40)
        expect(typing.drawn.at(-1)).toMatchObject({ stale: false, dimmed: false, searching: false })
        expect(typing.drawn.some((drawing) => drawing.dimmed)).toBe(false)
    })

    it('says it is searching once a wait with nothing listed has run wait-shown, and not before', () => {
        const typing = typist(1000)
        typing.type('nightly')
        vi.advanceTimersByTime(WAIT_SHOWN - 1)
        expect(typing.drawn.some((drawing) => drawing.searching)).toBe(false)
        vi.advanceTimersByTime(1)
        expect(typing.drawn.at(-1)).toMatchObject({ stale: true, searching: true, dimmed: false, at: WAIT_SHOWN })
        vi.advanceTimersByTime(1000)
        expect(typing.drawn.at(-1)).toMatchObject({ stale: false, searching: false, dimmed: false })
    })

    it('dims the earlier results once a wait has run wait-shown, counted from the first key without an answer', () => {
        const typing = typist(1000)
        typing.type('n')
        vi.advanceTimersByTime(1000)
        expect(typing.drawn.at(-1)).toMatchObject({ stale: false, query: 'n' })
        // Keys typed 120 ms apart while the answers are slow: the wait runs on from the first of them.
        typing.type('ni')
        vi.advanceTimersByTime(120)
        typing.type('nig')
        vi.advanceTimersByTime(WAIT_SHOWN - 121)
        expect(typing.drawn.some((drawing) => drawing.dimmed)).toBe(false)
        vi.advanceTimersByTime(1)
        expect(typing.drawn.at(-1)).toMatchObject({ stale: true, dimmed: true, searching: false, query: 'nig' })
    })
})
