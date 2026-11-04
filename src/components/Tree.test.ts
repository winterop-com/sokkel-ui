import { describe, expect, test } from 'vitest'

import { treeMatches, visibleRows, type TreeNode } from './Tree'

const NODES: TreeNode[] = [
    {
        id: 'north',
        label: 'North',
        children: [
            { id: 'harbor', label: 'Harbor district', children: [{ id: 'pier', label: 'Pier clinic' }] },
            { id: 'hills', label: 'Hills district' },
        ],
    },
    { id: 'south', label: 'South', children: [{ id: 'delta', label: 'Delta district' }] },
]

describe('a tree', () => {
    test('shows the top level until a node is opened', () => {
        expect(visibleRows(NODES, new Set(), null).map((row) => row.node.id)).toEqual(['north', 'south'])
        expect(visibleRows(NODES, new Set(['north']), null).map((row) => row.node.id)).toEqual(['north', 'harbor', 'hills', 'south'])
    })

    test('keeps each match with its ancestors while searching, whatever is open', () => {
        const matches = treeMatches(NODES, 'clinic')
        expect([...matches].sort()).toEqual(['harbor', 'north', 'pier'])
        expect(visibleRows(NODES, new Set(), matches).map((row) => [row.node.id, row.level])).toEqual([
            ['north', 1],
            ['harbor', 2],
            ['pier', 3],
        ])
    })

    test('matches without regard to case and keeps a matching parent', () => {
        expect([...treeMatches(NODES, 'SOUTH')]).toEqual(['south'])
    })
})
