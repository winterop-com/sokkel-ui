import { describe, expect, test } from 'vitest'

import { gridValueAt, imageRows, mercatorRows } from './GridLayer'

describe('a grid drawn on the map', () => {
    test('places each row at its latitude in Web Mercator', () => {
        // From the equator to 60 N in two rows, 30 N lies 58% of the way down in Mercator, not halfway.
        const rows = mercatorRows({ bounds: [0, 0, 10, 60], rows: 2 }, 100)
        expect(rows.indexOf(1)).toBe(58)
        expect(rows.slice(0, 58).every((row) => row === 0)).toBe(true)
        expect(rows.slice(58).every((row) => row === 1)).toBe(true)
    })

    test('paints the cell its value is read from under the pointer', () => {
        const grid = { bounds: [0, 0, 10, 60] as [number, number, number, number], columns: 1, rows: 2, values: [1, 2] }
        const rows = mercatorRows(grid, 100)
        // The pixel row 55% of the way down sits north of 30 N, in the first row.
        expect(rows[55]).toBe(0)
        expect(gridValueAt(grid, [5, 32])).toBe(1)
        expect(gridValueAt(grid, [5, 28])).toBe(2)
    })

    test('draws rows at four pixels each, up to a limit', () => {
        expect([imageRows(1), imageRows(100), imageRows(2000), imageRows(5000)]).toEqual([4, 400, 4096, 5000])
    })
})
