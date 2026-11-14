import { afterEach, describe, expect, it, vi } from 'vitest'

import { holdScroll } from '../lib/scroll-memory'
import {
    asksAt,
    asksForMore,
    branchKeys,
    columnLeast,
    contentTrack,
    findInTree,
    flattenRows,
    groupLines,
    groupRows,
    headEntered,
    headStep,
    isGroupHead,
    movedColumn,
    orderColumns,
    outgrown,
    rangeKeys,
    widenTrack,
    roomsWith,
    sortRows,
    stackColumns,
    stackDefault,
    stackLabels,
    stacksAt,
    stillAsks,
    treeBranchKeys,
    viewOf,
    watchContent,
    watchFonts,
    widestOf,
    type MoreRows,
} from './DataTable'

describe('widenTrack', () => {
    it('widens a length and a minmax floor, and leaves a fraction', () => {
        expect(widenTrack('3rem', '1rem')).toBe('calc(3rem + 1rem)')
        expect(widenTrack('minmax(14rem,1fr)', '1rem')).toBe('minmax(calc(14rem + 1rem),1fr)')
        expect(widenTrack('1fr', '1rem')).toBe('1fr')
        expect(widenTrack('max-content', '1rem')).toBe('max-content')
    })
})

describe('row groups', () => {
    const runs = [
        { id: 'r1', project: 'juniper', took: 4 },
        { id: 'r2', project: 'harbor', took: 9 },
        { id: 'r3', project: 'juniper', took: 1 },
        { id: 'r4', project: 'larkspur', took: 6 },
    ]
    type Run = (typeof runs)[number]
    const byProject = (run: Run) => run.project

    it('gathers rows by key, in the order their first row came, rows in their own order', () => {
        const groups = groupRows(runs, byProject)
        expect(groups.map((group) => [group.key, group.rows.map((run) => run.id)])).toEqual([
            ['juniper', ['r1', 'r3']],
            ['harbor', ['r2']],
            ['larkspur', ['r4']],
        ])
    })

    it('puts the keys an order names first', () => {
        expect(groupRows(runs, byProject, ['larkspur', 'harbor']).map((group) => group.key)).toEqual(['larkspur', 'harbor', 'juniper'])
    })

    it('lays out each head before its rows, sorted within the group, and none under a folded head', () => {
        const flatten = (level: readonly Run[]) =>
            flattenRows({
                rows: level,
                rowKey: (run) => run.id,
                expanded: new Set(),
                order: (rows) => sortRows(rows, (run) => run.took, 'asc'),
            })
        const { heads, lines, rows } = groupLines(groupRows(runs, byProject), new Set(['harbor']), flatten)
        expect(lines.map((line) => (isGroupHead(line) ? `#${line.key}` : line.key))).toEqual([
            '#juniper',
            'r3',
            'r1',
            '#harbor',
            '#larkspur',
            'r4',
        ])
        expect(rows.map((row) => row.key)).toEqual(['r3', 'r1', 'r4'])
        expect(heads.map((head) => [head.key, head.folded, head.rows.length])).toEqual([
            ['juniper', false, 2],
            ['harbor', true, 1],
            ['larkspur', false, 1],
        ])
    })
})

interface Node {
    id: string
    size: number
    children?: Node[]
}

const tree: Node[] = [
    {
        id: 'b',
        size: 2,
        children: [
            { id: 'b2', size: 9 },
            { id: 'b1', size: 1 },
        ],
    },
    { id: 'a', size: 5, children: [{ id: 'a1', size: 3 }] },
    { id: 'c', size: 2 },
]
const key = (node: Node) => node.id
const kids = (node: Node) => node.children

describe('sortRows', () => {
    it('sorts numbers and keeps equal rows in the order they came', () => {
        expect(sortRows(tree, (node) => node.size, 'asc').map(key)).toEqual(['b', 'c', 'a'])
        expect(sortRows(tree, (node) => node.size, 'desc').map(key)).toEqual(['a', 'b', 'c'])
    })

    it('sorts text with numbers in it by their value', () => {
        const rows = ['run_10', 'run_9', 'run_100'].map((id) => ({ id, size: 0 }))
        expect(sortRows(rows, key, 'asc').map(key)).toEqual(['run_9', 'run_10', 'run_100'])
    })
})

describe('flattenRows', () => {
    it('draws an open row’s children under it, each level in order', () => {
        const flat = flattenRows({
            rows: tree,
            rowKey: key,
            childRows: kids,
            expanded: new Set(['b']),
            order: (level) => sortRows(level, key, 'asc'),
        })
        expect(flat.map((entry) => `${entry.key}:${String(entry.depth)}`)).toEqual(['a:0', 'b:0', 'b1:1', 'b2:1', 'c:0'])
        expect(flat.find((entry) => entry.key === 'a')).toMatchObject({ branch: true, open: false })
        expect(flat.find((entry) => entry.key === 'b1')?.parent).toBe('b')
    })
})

describe('flattenRows with a detail of a row’s own', () => {
    it('opens a row with a detail as a branch that never waits', () => {
        const rows: Node[] = [
            { id: 'x', size: 0 },
            { id: 'y', size: 0 },
        ]
        const flat = flattenRows({
            rows,
            rowKey: key,
            hasDetail: (node) => node.id === 'x',
            expanded: new Set(['x', 'y']),
            order: (level) => level,
        })
        expect(flat.map((entry) => [entry.key, entry.branch, entry.open, entry.waiting])).toEqual([
            ['x', true, true, false],
            ['y', false, false, false],
        ])
    })
})

describe('flattenRows with children not known yet', () => {
    it('draws a row that has children as a branch, waiting while it is open', () => {
        const rows: Node[] = [
            { id: 'x', size: 0 },
            { id: 'y', size: 0 },
        ]
        const flat = flattenRows({
            rows,
            rowKey: key,
            childRows: () => undefined,
            hasChildren: (node) => node.id === 'x',
            expanded: new Set(['x']),
            order: (level) => level,
        })
        expect(flat.map((entry) => [entry.key, entry.branch, entry.waiting])).toEqual([
            ['x', true, true],
            ['y', false, false],
        ])
    })
})

describe('treeBranchKeys and findInTree', () => {
    it('gives every row with children, at any depth', () => {
        expect([...treeBranchKeys(tree, key, kids)].sort()).toEqual(['a', 'b'])
    })

    it('keeps the matches, their branches and the way to them, and opens the way', () => {
        const found = findInTree({ rows: tree, rowKey: key, childRows: kids, match: (node) => node.id === 'b1' })
        expect(found.rows.map(key)).toEqual(['b'])
        expect(found.childRows(tree[0])?.map(key)).toEqual(['b1'])
        expect([...found.open]).toEqual(['b'])
        const whole = findInTree({ rows: tree, rowKey: key, childRows: kids, match: (node) => node.id === 'a' })
        expect(whole.childRows(tree[1])?.map(key)).toEqual(['a1'])
        expect(findInTree({ rows: tree, rowKey: key, childRows: kids, match: undefined }).rows).toBe(tree)
    })
})

describe('branchKeys and rangeKeys', () => {
    it('gives a row and everything under it', () => {
        expect(branchKeys(tree[0], key, kids)).toEqual(['b', 'b2', 'b1'])
    })

    it('gives the drawn rows between two keys, either way round', () => {
        const flat = flattenRows({ rows: tree, rowKey: key, childRows: kids, expanded: new Set(['b']), order: (level) => level })
        expect(rangeKeys(flat, 'b1', 'b')).toEqual(['b', 'b2', 'b1'])
        expect(rangeKeys(flat, 'b2', 'c')).toEqual(['b2', 'b1', 'a', 'c'])
    })
})

describe('sorting by keys in the head row', () => {
    const heads = ['job', 'state', 'took']

    it('enters on the sorted column’s head, else on the first sortable head, and on none where no head sorts', () => {
        expect(headEntered(heads, 'took')).toBe('took')
        expect(headEntered(heads, undefined)).toBe('job')
        expect(headEntered(heads, 'owner')).toBe('job')
        expect(headEntered([], undefined)).toBeUndefined()
    })

    it('chooses the head before or after with Left and Right, stopping at the first and the last', () => {
        expect(headStep(heads, 'state', 'ArrowLeft')).toEqual({ head: 'job' })
        expect(headStep(heads, 'state', 'ArrowRight')).toEqual({ head: 'took' })
        expect(headStep(heads, 'job', 'ArrowLeft')).toEqual({ head: 'job' })
        expect(headStep(heads, 'took', 'ArrowRight')).toEqual({ head: 'took' })
    })

    it('turns the chosen head’s order with Enter or Space, and goes back to the rows with Down', () => {
        expect(headStep(heads, 'state', 'Enter')).toEqual({ sort: 'state' })
        expect(headStep(heads, 'state', ' ')).toEqual({ sort: 'state' })
        expect(headStep(heads, 'state', 'ArrowDown')).toBe('rows')
    })

    it('keeps the rows’ other keys in the head row and leaves the rest, Tab among them, to the browser', () => {
        for (const key of ['ArrowUp', 'PageUp', 'PageDown', 'Home', 'End']) expect(headStep(heads, 'state', key)).toBe('stay')
        for (const key of ['Tab', 'Escape', 'a']) expect(headStep(heads, 'state', key)).toBeUndefined()
    })
})

describe('column order', () => {
    const columns = ['job', 'state', 'by', 'started', 'duration'].map((id) => ({ id }))
    const ids = (list: readonly { id: string }[]) => list.map((column) => column.id)

    it('draws the named columns first, then the rest in their own order, the first column staying first', () => {
        expect(ids(orderColumns(columns, []))).toEqual(['job', 'state', 'by', 'started', 'duration'])
        expect(ids(orderColumns(columns, ['duration', 'state']))).toEqual(['job', 'duration', 'state', 'by', 'started'])
        expect(ids(orderColumns(columns, ['started', 'job', 'gone', 'started']))).toEqual(['job', 'started', 'state', 'by', 'duration'])
    })

    it('moves a column a place either way, never the first nor past it', () => {
        expect(movedColumn(columns, 'by', -1)).toEqual(['job', 'by', 'state', 'started', 'duration'])
        expect(movedColumn(columns, 'by', 1)).toEqual(['job', 'state', 'started', 'by', 'duration'])
        expect(movedColumn(columns, 'state', -1)).toEqual(['job', 'state', 'by', 'started', 'duration'])
        expect(movedColumn(columns, 'duration', 1)).toEqual(['job', 'state', 'by', 'started', 'duration'])
        expect(movedColumn(columns, 'job', 1)).toEqual(['job', 'state', 'by', 'started', 'duration'])
    })
})

describe('stackColumns', () => {
    const columns = [
        { id: 'done', stack: 'lead' as const },
        { id: 'title' },
        { id: 'due' },
        { id: 'note', stack: 'primary' as const },
        { id: 'state', stack: 'secondary' as const },
        { id: 'secret', stack: 'none' as const },
    ]
    const ids = (list: readonly { id: string }[]) => list.map((column) => column.id)

    it('takes the first column that is not a lead as the title, the leads before it', () => {
        const parts = stackColumns(columns, 'labeled')
        expect(ids(parts.lead)).toEqual(['done'])
        expect(parts.title?.id).toBe('title')
        expect(ids(parts.primary)).toEqual(['note'])
        expect(ids(parts.lines)).toEqual(['due'])
        expect(ids(parts.facts)).toEqual(['state'])
    })

    it('puts every line among the facts when compact, in the columns’ order', () => {
        const parts = stackColumns(columns, 'compact')
        expect(ids(parts.lines)).toEqual([])
        expect(ids(parts.facts)).toEqual(['due', 'state'])
        expect(ids(parts.primary)).toEqual(['note'])
    })

    it('keeps the first column as the title when nothing leads', () => {
        const plain: { id: string; stack?: 'line' }[] = [{ id: 'job' }, { id: 'state' }]
        expect(stackColumns(plain, 'compact').title?.id).toBe('job')
    })
})

describe('content widths', () => {
    it('holds a measured need between its floor and its most', () => {
        expect(contentTrack(71, {})).toBe('min(71px, 20rem)')
        expect(contentTrack(71, { minWidth: '8rem', maxWidth: '12rem' })).toBe('min(max(71px, 8rem), 12rem)')
        expect(contentTrack(undefined, { minWidth: '8rem' })).toBe('min(8rem, 20rem)')
        expect(contentTrack(undefined, {})).toBe('0px')
    })

    it('counts a content column’s measured need in the least width, a dragged width over it', () => {
        const step = { id: 'step', width: 'content' }
        expect(columnLeast(step, undefined, { step: 71 })).toBe('min(71px, 20rem)')
        expect(columnLeast(step, undefined, {})).toBe('0px')
        expect(columnLeast(step, 120, { step: 71 })).toBe('120px')
        expect(columnLeast({ id: 'about', width: 'minmax(8rem,1fr)' }, undefined, {})).toBe('8rem')
        expect(columnLeast({ id: 'about', width: '1fr' }, undefined, {})).toBe('0px')
    })

    it('stacks a list once its columns no longer fit, even above its stack width', () => {
        expect(stacksAt(900, 576, 1000, true)).toBe(true)
        expect(stacksAt(900, 576, 800, true)).toBe(false)
        expect(stacksAt(500, 576, 300, true)).toBe(true)
    })

    it('stacks a list below a phone width by default, and a table below 576 pixels', () => {
        expect(stackDefault(true)).toBe(480)
        expect(stackDefault(false)).toBe(576)
        expect(stacksAt(522, stackDefault(true), 480, true)).toBe(false)
        expect(stacksAt(400, stackDefault(true), 300, true)).toBe(true)
    })

    it('stacks a table below its stack width only once its columns no longer fit too', () => {
        expect(stacksAt(900, 1024, 1000, false)).toBe(true)
        expect(stacksAt(900, 1024, 768, false)).toBe(false)
        expect(stacksAt(900, 576, 1000, false)).toBe(false)
        expect(stacksAt(0, 576, 1000, false)).toBe(false)
    })

    it('measures again when a cell is cut short, unless its column was cut at its most', () => {
        const cut = { column: 'step', clientWidth: 67, scrollWidth: 71 }
        const whole = { column: 'job', clientWidth: 216, scrollWidth: 216 }
        expect(outgrown([whole, cut], new Set())).toBe(true)
        expect(outgrown([whole, cut], new Set(['step']))).toBe(false)
        expect(outgrown([whole], new Set())).toBe(false)
    })
})

describe('watching fonts load', () => {
    const fonts = () => {
        const target = new EventTarget()
        let resolve = () => undefined as void
        const ready = new Promise<void>((done) => {
            resolve = done
        })
        return {
            ready,
            resolve: () => resolve(),
            load: () => target.dispatchEvent(new Event('loadingdone')),
            addEventListener: (type: 'loadingdone', listener: () => void) => target.addEventListener(type, listener),
            removeEventListener: (type: 'loadingdone', listener: () => void) => target.removeEventListener(type, listener),
        }
    }

    it('calls once the fonts are ready and on each later load, until stopped', async () => {
        const set = fonts()
        let calls = 0
        const stop = watchFonts(set, () => calls++)
        expect(calls).toBe(0)
        set.resolve()
        await set.ready
        expect(calls).toBe(1)
        set.load()
        expect(calls).toBe(2)
        stop()
        set.load()
        expect(calls).toBe(2)
    })

    it('never calls after being stopped before the fonts are ready', async () => {
        const set = fonts()
        let calls = 0
        const stop = watchFonts(set, () => calls++)
        stop()
        set.resolve()
        await set.ready
        expect(calls).toBe(0)
    })

    it('does nothing where there are no fonts to watch', () => {
        expect(() => watchFonts(undefined, () => undefined)()).not.toThrow()
    })
})

describe('shared content widths', () => {
    it('takes the widest of each column across the tables', () => {
        expect(widestOf([{ job: 180, step: 71 }, { job: 216 }, { service: 105 }])).toEqual({ job: 216, step: 71, service: 105 })
        expect(widestOf([])).toEqual({})
    })
})

describe('stacked line names', () => {
    it('are as wide as the widest name, up to the most, and the cut ones are named', () => {
        const names = [
            { id: 'step', width: 28 },
            { id: 'service', width: 101.4 },
        ]
        expect(stackLabels(192, names)).toEqual({ width: 102, cut: new Set() })
        expect(stackLabels(80, names)).toEqual({ width: 80, cut: new Set(['service']) })
        expect(stackLabels(192, [])).toEqual({ width: 0, cut: new Set() })
    })
})

describe('column rooms', () => {
    it('take the widths just measured, keeping the same object when none changed', () => {
        const before = { tags: 240, job: 180 }
        expect(roomsWith(before, [{ column: 'tags', width: 240 }])).toBe(before)
        expect(roomsWith(before, [])).toBe(before)
        expect(roomsWith(before, [{ column: 'tags', width: 312 }])).toEqual({ tags: 312, job: 180 })
        expect(roomsWith({}, [{ column: 'job', width: 0 }])).toEqual({ job: 0 })
    })
})

describe('a table back at the place it was left', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    /** A table's scroller 600px tall over rows 40px tall, fifty to a page, and the changes below it, which the test calls. */
    function table(rows: number) {
        const watching: (() => void)[] = []
        vi.stubGlobal(
            'MutationObserver',
            class {
                constructor(callback: () => void) {
                    watching.push(callback)
                }
                observe() {}
                disconnect() {}
            },
        )
        const box = {
            rows,
            top: 0,
            clientHeight: 600,
            children: [] as unknown[],
            get scrollHeight() {
                return box.rows * 40
            },
            get scrollTop() {
                return box.top
            },
            set scrollTop(value: number) {
                box.top = Math.max(0, Math.min(value, box.scrollHeight - box.clientHeight))
            },
            scrollLeft: 0,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        }
        /** Loads the next page, as the app does when the table asks. */
        const load = () => {
            box.rows += 50
            for (const change of watching) change()
        }
        return { box, load, area: box as unknown as HTMLElement }
    }

    /** Asks for pages as the table does while it seeks its place, and counts them. */
    function seek(rows: number, place: number, total: number, byButton: boolean) {
        const { box, load, area } = table(rows)
        holdScroll(area, { top: place, left: 0 })
        let pages = 0
        while (
            asksForMore({
                hasMore: box.rows < total,
                busy: false,
                byButton,
                nearEnd: false,
                seeking: box.top >= place - 1 ? undefined : place,
                reach: box.scrollHeight - box.clientHeight,
            })
        ) {
            load()
            pages += 1
        }
        return { top: box.top, pages }
    }

    it('loads the pages that reach a place past the first, then stands there', () => {
        // 6000px down takes 6600px of rows, 165 of them: three pages after the first.
        expect(seek(50, 6000, 1000, false)).toEqual({ top: 6000, pages: 3 })
    })

    it('loads them by the button’s way too, where the reader asks for more', () => {
        expect(seek(50, 6000, 1000, true)).toEqual({ top: 6000, pages: 3 })
    })

    it('stops at the last page when the place lies past every row', () => {
        expect(seek(50, 6000, 100, true)).toEqual({ top: 100 * 40 - 600, pages: 1 })
    })

    it('asks for nothing while rows are on their way, and only near the end by itself', () => {
        const asked = { hasMore: true, busy: false, byButton: false, nearEnd: false, reach: 1400 }
        expect(asksForMore(asked)).toBe(false)
        expect(asksForMore({ ...asked, nearEnd: true })).toBe(true)
        expect(asksForMore({ ...asked, nearEnd: true, byButton: true })).toBe(false)
        expect(asksForMore({ ...asked, seeking: 3000 })).toBe(true)
        expect(asksForMore({ ...asked, seeking: 3000, busy: true })).toBe(false)
        expect(asksForMore({ ...asked, seeking: 1400 })).toBe(false)
    })
})

describe('a table as tall as its rows, asking for more', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    /**
     * A table's scroller 600px tall over rows 40px tall in one box of rows, with the watches on it,
     * and a loader that answers at once with fifty more rows: the rows' box grows and every watch
     * hears of it, as the browser tells them once the rows are drawn.
     */
    function scroller(rows: number) {
        const heard: (() => void)[] = []
        const watches: Set<unknown>[] = []
        vi.stubGlobal(
            'ResizeObserver',
            class {
                watching = new Set<unknown>()
                constructor(callback: () => void) {
                    heard.push(callback)
                    watches.push(this.watching)
                }
                observe(element: unknown) {
                    this.watching.add(element)
                }
                unobserve(element: unknown) {
                    this.watching.delete(element)
                }
                disconnect() {
                    this.watching.clear()
                }
            },
        )
        /** Every box a size watch is on. */
        const observed = () => watches.flatMap((watching) => Array.from(watching))
        vi.stubGlobal(
            'MutationObserver',
            class {
                constructor(callback: () => void) {
                    heard.push(callback)
                }
                observe() {}
                disconnect() {}
            },
        )
        const box = {
            rows,
            top: 0,
            clientHeight: 600,
            clientWidth: 800,
            children: [{ rows: true }] as unknown[],
            get scrollHeight() {
                return box.rows * 40
            },
            get scrollTop() {
                return box.top
            },
            set scrollTop(value: number) {
                box.top = Math.max(0, Math.min(value, box.scrollHeight - box.clientHeight))
            },
            scrollLeft: 0,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        }
        const load = () => {
            box.rows += 50
            for (const hear of heard) hear()
        }
        return { box, area: box as unknown as HTMLElement, load, heard, observed }
    }

    const more = (rows: number, seeking?: number): MoreRows => ({
        hasMore: rows < 1000,
        busy: false,
        byButton: false,
        margin: 40 * 8,
        seeking,
    })

    /**
     * Draws the table until it stops asking, as it does on a loader that answers at once: each time
     * it asks with the view it was drawn with, the rows just loaded already on the page, and calls
     * the loader if it still asks. Without `measured` it asks with that view alone. Counts the calls.
     */
    function draw(table: ReturnType<typeof scroller>, drawnWith: ReturnType<typeof viewOf>, seeking?: number, measured = true) {
        let view = drawnWith
        let calls = 0
        while (calls < 100) {
            const rows = more(table.box.rows, seeking)
            if (!asksAt(view, rows)) break
            if (measured && !stillAsks(table.area, rows, (now) => (view = now))) break
            calls += 1
            table.load()
        }
        return calls
    }

    /** A table first drawn while its first page was on its way, the page since loaded, and the view it was drawn with. */
    function opened() {
        const table = scroller(0)
        const view = viewOf(table.area)
        table.load()
        return { table, view }
    }

    it('asks no more on open once a loader that answers at once fills the view, until the reader nears the end', () => {
        // The view it was drawn with puts the end at the top, so that view alone asks page after page with no scrolling.
        const alone = opened()
        expect(draw(alone.table, alone.view, undefined, false)).toBe(19)
        const { table, view } = opened()
        expect(draw(table, view)).toBe(0)
        expect(table.box.rows).toBe(50)
        // Scrolled to the end, it asks once for the next page, then no more.
        table.box.scrollTop = 1400
        expect(draw(table, viewOf(table.area))).toBe(1)
        expect(table.box.rows).toBe(100)
    })

    it('asks for the pages that reach the place it was left at and stops there, though its view has not heard', () => {
        const table = scroller(50)
        const drawnWith = viewOf(table.area)
        holdScroll(table.area, { top: 6000, left: 0 })
        // 6000px down takes 6600px of rows, 165 of them: three pages after the first.
        expect(draw(table, drawnWith, 6000)).toBe(3)
        expect(table.box.top).toBe(6000)
        // With the view it was drawn with alone, the place never seems in reach and every page loads.
        const alone = scroller(50)
        holdScroll(alone.area, { top: 6000, left: 0 })
        expect(draw(alone, viewOf(alone.area), 6000, false)).toBe(19)
    })

    it('leaves a table of fixed rows to the end it counts', () => {
        const table = scroller(50)
        // A view that has not measured its rows: a table of fixed rows counts its end, 50 rows of 40px.
        const unmeasured = { top: 0, height: 600, width: 800, full: 0 }
        const fixed: MoreRows = { ...more(50), end: 50 * 40 }
        expect(asksAt(unmeasured, fixed)).toBe(false)
        expect(asksAt({ ...unmeasured, top: 1400 }, fixed)).toBe(true)
        let heard = false
        expect(stillAsks(table.area, fixed, () => (heard = true))).toBe(true)
        expect(heard).toBe(false)
    })

    it('hears the rows grow and the boxes it holds come and go, until stopped', () => {
        const table = scroller(50)
        let changes = 0
        const stop = watchContent(table.area, () => (changes += 1))
        expect(table.observed()).toEqual(table.box.children)
        table.load()
        expect(changes).toBeGreaterThan(0)
        // A placeholder drawn under the rows is watched too, and let go once it goes.
        const placeholder = { placeholder: true }
        table.box.children.push(placeholder)
        table.load()
        expect(table.observed()).toEqual([...table.box.children])
        table.box.children.pop()
        table.load()
        expect(table.observed()).toEqual(table.box.children)
        stop()
        expect(table.observed()).toEqual([])
    })
})
