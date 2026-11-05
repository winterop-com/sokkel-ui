import { describe, expect, it } from 'vitest'

import { branchKeys, flattenRows, rangeKeys, sortRows } from './DataTable'

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
