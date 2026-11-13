import { describe, expect, test } from 'vitest'

import {
    canMoveTo,
    dropPart,
    isBranch,
    moveTreeNode,
    treeAncestors,
    treeHolding,
    treeKeyTarget,
    treeLevel,
    treeMatches,
    treePlace,
    treeTarget,
    visibleRows,
    type TreeLoad,
    type TreeNode,
} from './Tree'

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

describe('moving a node', () => {
    test('finds its level and its place in it', () => {
        expect(treeLevel(NODES, null)?.map((node) => node.id)).toEqual(['larkspur', 'harbor'])
        expect(treeLevel(NODES, 'larkspur')?.map((node) => node.id)).toEqual(['exports', 'imports'])
        expect(treeLevel(NODES, 'imports')).toEqual([])
        expect(treeLevel([{ id: 'lazy', label: 'Lazy', hasChildren: true }], 'lazy')).toBeUndefined()
        expect(treePlace(NODES, 'imports')).toEqual({ parent: 'larkspur', index: 1 })
        expect(treePlace(NODES, 'harbor')).toEqual({ parent: null, index: 1 })
        expect(treePlace(NODES, 'missing')).toBeNull()
    })

    test('splits a branch row into before, inside and after, and a leaf at its middle', () => {
        expect(dropPart(2, 0, 32, true)).toBe('before')
        expect(dropPart(16, 0, 32, true)).toBe('inside')
        expect(dropPart(30, 0, 32, true)).toBe('after')
        expect(dropPart(10, 0, 32, false)).toBe('before')
        expect(dropPart(20, 0, 32, false)).toBe('after')
    })

    test("lands inside a branch at its end, or beside a row in the row's level, counted without itself", () => {
        const harbor = { node: NODES[1], parent: null }
        const imports = { node: { id: 'imports', label: 'Imports folder' }, parent: 'larkspur' }
        expect(treeTarget(NODES, 'orders', harbor, 'inside')).toEqual({ into: 'harbor', index: 1 })
        expect(treeTarget(NODES, 'orders', harbor, 'before')).toEqual({ into: null, index: 1 })
        expect(treeTarget(NODES, 'larkspur', harbor, 'after')).toEqual({ into: null, index: 1 })
        expect(treeTarget(NODES, 'exports', imports, 'after')).toEqual({ into: 'larkspur', index: 1 })
        expect(treeTarget(NODES, null, imports, 'before')).toEqual({ into: 'larkspur', index: 1 })
    })

    test('reorders within a level and moves between branches', () => {
        expect(canMoveTo(NODES, 'exports', { into: 'larkspur', index: 1 })).toBe(true)
        expect(canMoveTo(NODES, 'orders', { into: 'harbor', index: 0 })).toBe(true)
        expect(canMoveTo(NODES, 'orders', { into: null, index: 2 })).toBe(true)
    })

    test('never into itself, below itself, or where it already is', () => {
        expect(canMoveTo(NODES, 'larkspur', { into: 'larkspur', index: 0 })).toBe(false)
        expect(canMoveTo(NODES, 'larkspur', { into: 'exports', index: 0 })).toBe(false)
        expect(canMoveTo(NODES, 'exports', { into: 'larkspur', index: 0 })).toBe(false)
        expect(canMoveTo(NODES, 'harbor', { into: null, index: 1 })).toBe(false)
        expect(canMoveTo(NODES, 'missing', { into: null, index: 0 })).toBe(false)
    })

    test('moves by a key: up and down its level, into the branch above, and out beside its parent', () => {
        expect(treeKeyTarget(NODES, 'imports', 'up')).toEqual({ into: 'larkspur', index: 0 })
        expect(treeKeyTarget(NODES, 'imports', 'down')).toBeUndefined()
        expect(treeKeyTarget(NODES, 'exports', 'up')).toBeUndefined()
        expect(treeKeyTarget(NODES, 'imports', 'in')).toEqual({ into: 'exports', index: 1 })
        expect(treeKeyTarget(NODES, 'exports', 'in')).toBeUndefined()
        expect(treeKeyTarget(NODES, 'orders', 'out')).toEqual({ into: 'larkspur', index: 1 })
        expect(treeKeyTarget(NODES, 'larkspur', 'out')).toBeUndefined()
    })

    test('applies a move to a tree held whole, without touching the tree given', () => {
        const ids = (nodes: readonly TreeNode[]): unknown[] =>
            nodes.map((node) => (node.children === undefined ? node.id : [node.id, ids(node.children)]))
        expect(ids(moveTreeNode(NODES, 'imports', { into: 'larkspur', index: 0 }))).toEqual([
            ['larkspur', ['imports', ['exports', ['orders']]]],
            ['harbor', ['reports']],
        ])
        expect(ids(moveTreeNode(NODES, 'orders', { into: 'harbor', index: 1 }))).toEqual([
            ['larkspur', [['exports', []], 'imports']],
            ['harbor', ['reports', 'orders']],
        ])
        expect(ids(moveTreeNode(NODES, 'reports', { into: 'imports', index: 0 }))).toEqual([
            [
                'larkspur',
                [
                    ['exports', ['orders']],
                    ['imports', ['reports']],
                ],
            ],
            ['harbor', []],
        ])
        expect(ids(moveTreeNode(NODES, 'harbor', { into: null, index: 0 }))[0]).toEqual(['harbor', ['reports']])
        expect(ids(NODES)[1]).toEqual(['harbor', ['reports']])
    })
})
