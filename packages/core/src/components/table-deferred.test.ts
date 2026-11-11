import { describe, expect, it } from 'vitest'

import { rowPath } from './table-deferred'

interface Node {
    id: string
    children?: Node[]
}

const TREE: Node[] = [
    { id: 'harbor', children: [{ id: 'nightly-export', children: [{ id: 'fetch' }, { id: 'upload' }] }] },
    { id: 'juniper', children: [{ id: 'sync-inventory', children: [{ id: 'validate' }] }] },
]
const key = (node: Node) => node.id
const children = (node: Node) => node.children

describe('rowPath', () => {
    it('finds a top-level row with nothing above it', () => {
        expect(rowPath(TREE, key, children, 'juniper')).toEqual({ top: TREE[1], above: [] })
    })

    it('names every row above a deep one, top first, with its top-level row', () => {
        expect(rowPath(TREE, key, children, 'validate')).toEqual({ top: TREE[1], above: ['juniper', 'sync-inventory'] })
        expect(rowPath(TREE, key, children, 'upload')?.above).toEqual(['harbor', 'nightly-export'])
    })

    it('finds nothing for a key no row has, or below rows whose children are not known', () => {
        expect(rowPath(TREE, key, children, 'notify')).toBeUndefined()
        expect(rowPath(TREE, key, undefined, 'fetch')).toBeUndefined()
    })
})
