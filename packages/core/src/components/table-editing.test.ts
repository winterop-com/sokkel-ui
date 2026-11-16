import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DataColumn, FlatRow } from './DataTable'
import { tableEditing, type CellEdit, type EditingHeld, type OpenCell, type TableEditingContext } from './table-editing'

interface Run {
    id: string
    note: string
}

const rows: Run[] = Array.from({ length: 8 }, (_, index) => ({ id: `r${String(index)}`, note: `note ${String(index)}` }))
const flat = rows.map((row, index) => ({ key: row.id, row, depth: 0, index, branch: false, open: false }) as unknown as FlatRow<Run>)
const ids = ['job', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']

/** A table of eight 300 wide columns in a 1000 wide scroller, its first column pinned, as a browser lays it out. */
function setUp(saved: string[] = []) {
    const columns = ids.map((id, index): DataColumn<Run> => ({
        id,
        header: id,
        width: '300px',
        cell: (row) => row.note,
        edit:
            index === 0
                ? undefined
                : {
                      editor: 'text',
                      value: (row: Run) => row.note,
                      save: (row: Run, value: unknown) => {
                          saved.push(`${row.id}=${String(value)}`)
                      },
                  },
    }))
    const box = {
        scrollLeft: 0,
        clientLeft: 0,
        clientWidth: 1000,
        getBoundingClientRect: () => ({ left: 0, right: 1000 }),
        querySelector: (selector: string) => {
            const column = /\[data-column="([^"]+)"\]/.exec(selector)?.[1] ?? ''
            const index = ids.indexOf(column)
            const left = index * 300 - box.scrollLeft
            return {
                dataset: {},
                parentElement: { querySelector: () => ({ getBoundingClientRect: () => ({ right: 300 }) }) },
                getBoundingClientRect: () => ({ left, right: left + 300 }),
            }
        },
    }
    const held: { current: EditingHeld } = { current: { opening: undefined, attempts: 0, refocus: false, revealed: undefined } }
    const state: { edits: ReadonlyMap<string, CellEdit>; open: OpenCell | undefined } = { edits: new Map(), open: undefined }
    const table = {
        shown: columns,
        flat,
        active: 'r1',
        setActive: () => undefined,
        activeColumn: 'c2',
        setActiveColumn: () => undefined,
        get edits() {
            return state.edits
        },
        setEdits: (next: ReadonlyMap<string, CellEdit> | ((before: ReadonlyMap<string, CellEdit>) => ReadonlyMap<string, CellEdit>)) => {
            state.edits = typeof next === 'function' ? next(state.edits) : next
        },
        get open() {
            return state.open
        },
        setOpen: (cell: OpenCell | undefined) => {
            state.open = cell
        },
        held,
        drawn: () => true,
        moveTo: () => undefined,
        grid: false,
        step: 1,
        words: { saving: 'Saving', saveFailed: 'Failed', notNumber: 'Not a number', issueCritical: 'Error', issueWarning: 'Warning' },
        cellFocus: 'ring',
        labelCut: new Set<string>(),
    } satisfies TableEditingContext<Run>
    const grid = {} as HTMLElement
    const settle = (over: Partial<TableEditingContext<Run>> = {}) =>
        tableEditing.settle({ ...table, ...over, edits: state.edits, open: state.open }, grid, box as unknown as HTMLElement)
    return { box, held, state, settle }
}

beforeEach(() => {
    vi.stubGlobal('CSS', { escape: (text: string) => text })
})
afterEach(() => {
    vi.unstubAllGlobals()
})

describe('the active cell of an editing table', () => {
    it('is scrolled into view sideways once it becomes the active one', () => {
        const { box, settle } = setUp()
        settle({ activeColumn: 'c5' })
        expect(box.scrollLeft).toBe(800)
    })

    it('lets the reader scroll away from it, the table drawn again on each scroll', () => {
        const { box, settle } = setUp()
        settle()
        for (const to of [400, 900, 1400]) {
            box.scrollLeft = to
            settle()
            expect(box.scrollLeft).toBe(to)
        }
    })

    it('is scrolled to again once another cell becomes the active one', () => {
        const { box, settle } = setUp()
        settle()
        box.scrollLeft = 1400
        settle()
        settle({ activeColumn: 'c3' })
        expect(box.scrollLeft).toBe(600)
    })
})

describe('an open cell editor scrolled out of the drawn rows', () => {
    it('saves what was typed, closes, and gives the focus back to the table', async () => {
        const saved: string[] = []
        const { held, state, settle } = setUp(saved)
        const open = { row: 'r2', column: 'c1', openList: false, selectAll: true }
        held.current.opening = open
        state.open = open
        state.edits = new Map([[`r2\u0000c1`, { draft: 'typed', saving: false, error: null, attempt: 0 }]])
        settle({ drawn: (key) => key !== 'r2' })
        expect(state.open).toBeUndefined()
        expect(held.current.opening).toBeUndefined()
        expect(held.current.refocus).toBe(true)
        await vi.waitFor(() => expect(saved).toEqual(['r2=typed']))
    })

    it('stays open while its row is drawn', () => {
        const { held, state, settle } = setUp()
        const open = { row: 'r2', column: 'c1', openList: false, selectAll: true }
        held.current.opening = open
        state.open = open
        state.edits = new Map([[`r2\u0000c1`, { draft: 'typed', saving: false, error: null, attempt: 0 }]])
        settle()
        expect(state.open).toBe(open)
    })
})
