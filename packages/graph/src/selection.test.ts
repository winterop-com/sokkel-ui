import { describe, expect, test } from 'vitest'

import { edgesWhileDragged, pickedNode } from './GraphCanvas'

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

describe('dragging a box', () => {
    test('drops the route elk drew from each edge at the box, and keeps the others', () => {
        const route = {
            points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
            ],
            labelAt: { x: 5, y: 0 },
            label: 'then',
        }
        const edges = [
            { id: 'fetch-transform', source: 'fetch', target: 'transform', data: route },
            { id: 'validate-upload', source: 'validate', target: 'upload', data: route },
        ]
        const [moved, still] = edgesWhileDragged(edges, { transform: { x: 40, y: 40 } })
        expect(moved.data).toEqual({ label: 'then' })
        expect(still).toBe(edges[1])
    })
})
