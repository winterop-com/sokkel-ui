import { describe, expect, it } from 'vitest'

import {
    currentChildren,
    drawnLines,
    onGround,
    pageInRange,
    redraws,
    topRow,
    turnedPage,
    wheelBy,
    type FlatRow,
    type GroupHead,
    type LineWindow,
    type MoreRows,
    type ScrollView,
    type TableLine,
} from './DataTable'

const view = (top: number, more: Partial<ScrollView> = {}): ScrollView => ({ top, height: 400, width: 1000, full: 80_000, ...more })
const WINDOW: LineWindow = { lineHeight: 40, over: 8, whole: false, lines: 2000 }
const ROWS: MoreRows = { hasMore: false, busy: false, byButton: false, end: 80_000, margin: 320 }

describe('what a scroll draws again', () => {
    it('draws the lines in view and eight past them each way', () => {
        expect(drawnLines(view(4000), WINDOW)).toEqual({ firstLine: 92, lastLine: 118 })
        expect(drawnLines(view(0), WINDOW)).toEqual({ firstLine: 0, lastLine: 18 })
        expect(drawnLines(view(4000), { ...WINDOW, whole: true })).toEqual({ firstLine: 0, lastLine: 2000 })
    })

    it('draws nothing again for a scroll within the lines drawn, nor for one sideways', () => {
        expect(redraws(view(4010), view(4030), WINDOW, ROWS)).toBe(false)
        expect(redraws(view(4000), view(4000), WINDOW, ROWS)).toBe(false)
    })

    it('draws again once the lines drawn change, the box changes size, or the ask for more does', () => {
        expect(redraws(view(4000), view(4040), WINDOW, ROWS)).toBe(true)
        expect(redraws(view(4000), view(4000, { width: 900 }), WINDOW, ROWS)).toBe(true)
        expect(redraws(view(4000), view(4000, { height: 500 }), WINDOW, ROWS)).toBe(true)
        const more = { ...ROWS, hasMore: true, end: 4800 }
        expect(redraws(view(4000), view(4001), { ...WINDOW, lines: 120 }, more)).toBe(true)
    })

    it('draws again as it reaches the place it was on its way to', () => {
        expect(redraws(view(3990), view(3999), WINDOW, { ...ROWS, seeking: 4000 })).toBe(true)
        expect(redraws(view(3990), view(3995), WINDOW, { ...ROWS, seeking: 4000 })).toBe(false)
    })

    it('draws again a table of rows drawn whole once what it scrolls grows', () => {
        const whole = { ...WINDOW, whole: true }
        expect(redraws(view(400), view(500), whole, { ...ROWS, end: undefined })).toBe(false)
        expect(redraws(view(400), view(400, { full: 90_000 }), whole, { ...ROWS, end: undefined })).toBe(true)
    })
})

const row = (key: string): FlatRow<{ id: string }> => ({
    row: { id: key },
    key,
    depth: 0,
    parent: undefined,
    branch: false,
    open: false,
    waiting: false,
})
const head = (key: string) => ({ head: true, key, label: key, count: 1, folded: false }) as unknown as GroupHead<{ id: string }>

describe('the row made active as the table takes the focus', () => {
    const rows = Array.from({ length: 30 }, (_, index) => row(`r${String(index)}`))

    it('is the first row at the top, not one eight rows down', () => {
        expect(topRow(rows, rows, { top: 0, lineHeight: 40, perLine: 1, grid: false })?.key).toBe('r0')
        expect(topRow(rows.slice(0, 5), rows.slice(0, 5), { top: 0, lineHeight: 40, perLine: 1, grid: false })?.key).toBe('r0')
    })

    it('is the row at the top of the view once scrolled', () => {
        expect(topRow(rows, rows, { top: 400, lineHeight: 40, perLine: 1, grid: false })?.key).toBe('r10')
    })

    it('counts a grid’s cards by line, and steps past a group’s head', () => {
        expect(topRow(rows, rows, { top: 520, lineHeight: 260, perLine: 4, grid: true })?.key).toBe('r8')
        const lines: TableLine<{ id: string }>[] = [head('harbor'), rows[0], rows[1], head('juniper'), rows[2]]
        expect(topRow(lines, rows.slice(0, 3), { top: 0, lineHeight: 40, perLine: 1, grid: false })?.key).toBe('r0')
        expect(topRow(lines, rows.slice(0, 3), { top: 120, lineHeight: 40, perLine: 1, grid: false })?.key).toBe('r2')
    })
})

describe('a wheel over the head row', () => {
    const box = (more: Partial<Record<string, number>> = {}) => ({
        scrollTop: 0,
        scrollLeft: 0,
        scrollHeight: 400,
        scrollWidth: 1000,
        clientHeight: 400,
        clientWidth: 1000,
        ...more,
    })

    it('moves nothing when the rows cannot scroll, so the page takes the wheel', () => {
        expect(wheelBy(box(), { deltaX: 0, deltaY: 120, deltaMode: 0 })).toEqual({ x: 0, y: 0 })
        expect(wheelBy(box({ scrollHeight: 4000, scrollTop: 3600 }), { deltaX: 0, deltaY: 120, deltaMode: 0 })).toEqual({ x: 0, y: 0 })
    })

    it('moves the rows as far as they go, a wheel counted in lines or pages turned to pixels', () => {
        const tall = box({ scrollHeight: 4000, scrollTop: 3550 })
        expect(wheelBy(tall, { deltaX: 0, deltaY: 120, deltaMode: 0 })).toEqual({ x: 0, y: 50 })
        expect(wheelBy(box({ scrollHeight: 4000 }), { deltaX: 0, deltaY: 3, deltaMode: 1 })).toEqual({ x: 0, y: 48 })
        expect(wheelBy(box({ scrollHeight: 4000 }), { deltaX: 0, deltaY: 1, deltaMode: 2 })).toEqual({ x: 0, y: 400 })
        expect(wheelBy(box({ scrollWidth: 2400, scrollLeft: 100 }), { deltaX: -300, deltaY: 0, deltaMode: 0 })).toEqual({ x: -100, y: 0 })
    })
})

describe('a press on a table’s ground', () => {
    const at = (...inside: string[]) => ({
        closest: (selectors: string) => (selectors.split(', ').some((selector) => inside.includes(selector)) ? {} : null),
    })

    it('leaves the table on its empty ground, and not on a row', () => {
        expect(onGround(at())).toBe(true)
        expect(onGround(at('[role=row]'))).toBe(false)
    })

    it('leaves the words of a failed read or of an empty table to be selected', () => {
        expect(onGround(at('[data-table-says]'))).toBe(false)
        expect(onGround(null)).toBe(false)
    })
})

describe('a page past the last', () => {
    it('moves to the last page once the rows or the total shrink under it', () => {
        expect(pageInRange({ page: 5, pages: 2, paging: 'server', total: 73, loading: false })).toBe(1)
        expect(pageInRange({ page: 5, pages: 2, paging: 'client', total: undefined, loading: false })).toBe(1)
    })

    it('stays while it is in range, while rows are on their way, and while a server gives no total', () => {
        expect(pageInRange({ page: 1, pages: 2, paging: 'client', total: undefined, loading: false })).toBeUndefined()
        expect(pageInRange({ page: 5, pages: 1, paging: 'client', total: undefined, loading: true })).toBeUndefined()
        expect(pageInRange({ page: 5, pages: 1, paging: 'server', total: undefined, loading: false })).toBeUndefined()
        expect(pageInRange({ page: 5, pages: 1, paging: undefined, total: undefined, loading: false })).toBeUndefined()
    })
})

describe('the top on another page', () => {
    const shown = { page: 0, pageSize: 50, view: 'table' }

    it('keeps the place on the first drawing, so a place put back from memory stands', () => {
        expect(turnedPage(undefined, shown)).toBe(false)
        expect(turnedPage(shown, { ...shown })).toBe(false)
    })

    it('starts at the top on another page, page size or view', () => {
        expect(turnedPage(shown, { ...shown, page: 1 })).toBe(true)
        expect(turnedPage(shown, { ...shown, pageSize: 100 })).toBe(true)
        expect(turnedPage(shown, { ...shown, view: 'grid' })).toBe(true)
    })
})

describe('children loaded on demand', () => {
    const held = { children: [{ id: 'fetch' }], version: 3 }

    it('keeps them while the row’s version stands, and drops them once it moves on', () => {
        expect(currentChildren(held, 3)).toEqual([{ id: 'fetch' }])
        expect(currentChildren(held, 4)).toBeUndefined()
        expect(currentChildren(undefined, 3)).toBeUndefined()
        expect(currentChildren({ children: [], version: undefined }, undefined)).toEqual([])
    })
})
