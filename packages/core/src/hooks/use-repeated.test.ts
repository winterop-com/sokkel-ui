import { describe, expect, it } from 'vitest'

import { rowsMoved } from './use-repeated'

const rows = ['fetch', 'transform', 'upload'].map((value, index) => ({ key: `row-${String(index + 1)}`, value }))

describe('a repeated group', () => {
    it('moves a row with its key, and stays put at either end', () => {
        expect(rowsMoved(rows, 'row-3', -1).map((row) => row.key)).toEqual(['row-1', 'row-3', 'row-2'])
        expect(rowsMoved(rows, 'row-1', 2).map((row) => row.value)).toEqual(['transform', 'upload', 'fetch'])
        expect(rowsMoved(rows, 'row-1', -1).map((row) => row.key)).toEqual(['row-1', 'row-2', 'row-3'])
    })
})
