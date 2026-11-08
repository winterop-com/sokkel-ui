import { describe, expect, test } from 'vitest'

import { isBranch, treeAncestors, treeHolding, treeMatches, visibleRows, type TreeLoad, type TreeNode } from './Tree'

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
    test('finds the levels above a node, to open the tree down to it', () => {
        expect(treeAncestors(NODES, 'orders')).toEqual(['larkspur', 'exports'])
        expect(treeAncestors(NODES, 'harbor')).toEqual([])
        expect(treeAncestors(NODES, 'missing')).toBeNull()
    })

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

    test('shows a loading row under an open lazy node, then its children once loaded', () => {
        const lazy: TreeNode[] = [{ id: 'harbor', label: 'Harbor', hasChildren: true }]
        expect(visibleRows(lazy, new Set(['harbor']), null).map((row) => [row.node.id, row.level, row.status])).toEqual([
            ['harbor', 1, undefined],
            ['harbor', 2, 'loading'],
        ])
        const failed = new Map<string, TreeLoad>([['harbor', { state: 'failed' }]])
        expect(visibleRows(lazy, new Set(['harbor']), null, failed)[1].status).toBe('failed')
        const done = new Map<string, TreeLoad>([['harbor', { state: 'done', children: [{ id: 'reports', label: 'Reports' }] }]])
        expect(visibleRows(lazy, new Set(['harbor']), null, done).map((row) => row.node.id)).toEqual(['harbor', 'reports'])
    })

    test('stops counting a lazy node as a branch once it loads no children', () => {
        const node: TreeNode = { id: 'juniper', label: 'Juniper', hasChildren: true }
        expect(isBranch(node)).toBe(true)
        expect(isBranch(node, new Map([['juniper', { state: 'done', children: [] }]]))).toBe(false)
    })

    test('marks the ancestors of a choice among loaded children', () => {
        const lazy: TreeNode[] = [{ id: 'harbor', label: 'Harbor', hasChildren: true }]
        const done = new Map<string, TreeLoad>([['harbor', { state: 'done', children: [{ id: 'reports', label: 'Reports' }] }]])
        expect([...treeHolding(lazy, new Set(['reports']), done)]).toEqual(['harbor'])
    })
})
