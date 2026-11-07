import { describe, expect, test } from 'vitest'

import { treeMatches, visibleRows, type TreeNode } from './Tree'

const NODES: TreeNode[] = [
    {
        id: 'larkspur',
        label: 'Larkspur',
        children: [
            { id: 'exports', label: 'Exports folder', children: [{ id: 'orders', label: 'Orders file' }] },
            { id: 'imports', label: 'Imports folder' },
        ],
    },
    { id: 'harbor', label: 'Harbor', children: [{ id: 'reports', label: 'Reports folder' }] },
]

describe('a tree', () => {
    test('shows the top level until a node is opened', () => {
        expect(visibleRows(NODES, new Set(), null).map((row) => row.node.id)).toEqual(['larkspur', 'harbor'])
        expect(visibleRows(NODES, new Set(['larkspur']), null).map((row) => row.node.id)).toEqual([
            'larkspur',
            'exports',
            'imports',
            'harbor',
        ])
    })

    test('keeps each match with its ancestors while searching, whatever is open', () => {
        const matches = treeMatches(NODES, 'file')
        expect([...matches].sort()).toEqual(['exports', 'larkspur', 'orders'])
        expect(visibleRows(NODES, new Set(), matches).map((row) => [row.node.id, row.level])).toEqual([
            ['larkspur', 1],
            ['exports', 2],
            ['orders', 3],
        ])
    })

    test('matches without regard to case and keeps a matching parent', () => {
        expect([...treeMatches(NODES, 'HARBOR')]).toEqual(['harbor'])
    })
})
