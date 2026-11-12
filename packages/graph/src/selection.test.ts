import { describe, expect, test } from 'vitest'

import { pickedNode } from './GraphCanvas'

describe('choosing a node', () => {
    test('a change that chooses a node reports it, one that lets the other go with it too', () => {
        expect(pickedNode([{ type: 'select', id: 'fetch', selected: true }])).toBe('fetch')
        expect(
            pickedNode([
                { type: 'select', id: 'fetch', selected: false },
                { type: 'select', id: 'upload', selected: true },
            ]),
        ).toBe('upload')
    })

    test("a change that only lets a node go, such as React Flow's Escape, reports nothing", () => {
        expect(pickedNode([{ type: 'select', id: 'fetch', selected: false }])).toBeUndefined()
        expect(pickedNode([{ type: 'position', id: 'fetch' }])).toBeUndefined()
    })
})
