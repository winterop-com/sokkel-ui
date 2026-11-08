import { describe, expect, it } from 'vitest'

import { branchKeys, findInTree, flattenRows, groupLines, groupRows, isGroupHead, rangeKeys, sortRows, treeBranchKeys } from './DataTable'

describe('row groups', () => {
    const runs = [
        { id: 'r1', project: 'juniper', took: 4 },
        { id: 'r2', project: 'harbor', took: 9 },
        { id: 'r3', project: 'juniper', took: 1 },
        { id: 'r4', project: 'larkspur', took: 6 },
    ]
    type Run = (typeof runs)[number]
    const byProject = (run: Run) => run.project

    it('gathers rows by key, in the order their first row came, rows in their own order', () => {
        const groups = groupRows(runs, byProject)
        expect(groups.map((group) => [group.key, group.rows.map((run) => run.id)])).toEqual([
            ['juniper', ['r1', 'r3']],
            ['harbor', ['r2']],
            ['larkspur', ['r4']],
        ])
    })

    it('puts the keys an order names first', () => {
        expect(groupRows(runs, byProject, ['larkspur', 'harbor']).map((group) => group.key)).toEqual(['larkspur', 'harbor', 'juniper'])
    })

    it('lays out each head before its rows, sorted within the group, and none under a folded head', () => {
        const flatten = (level: readonly Run[]) =>
            flattenRows({
                rows: level,
                rowKey: (run) => run.id,
                expanded: new Set(),
                order: (rows) => sortRows(rows, (run) => run.took, 'asc'),
            })
        const { heads, lines, rows } = groupLines(groupRows(runs, byProject), new Set(['harbor']), flatten)
        expect(lines.map((line) => (isGroupHead(line) ? `#${line.key}` : line.key))).toEqual([
            '#juniper',
            'r3',
            'r1',
            '#harbor',
            '#larkspur',
            'r4',
        ])
        expect(rows.map((row) => row.key)).toEqual(['r3', 'r1', 'r4'])
        expect(heads.map((head) => [head.key, head.folded, head.rows.length])).toEqual([
            ['juniper', false, 2],
            ['harbor', true, 1],
            ['larkspur', false, 1],
        ])
    })
})

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

describe('flattenRows with children not known yet', () => {
    it('draws a row that has children as a branch, waiting while it is open', () => {
        const rows: Node[] = [
            { id: 'x', size: 0 },
            { id: 'y', size: 0 },
        ]
        const flat = flattenRows({
            rows,
            rowKey: key,
            childRows: () => undefined,
            hasChildren: (node) => node.id === 'x',
            expanded: new Set(['x']),
            order: (level) => level,
        })
        expect(flat.map((entry) => [entry.key, entry.branch, entry.waiting])).toEqual([
            ['x', true, true],
            ['y', false, false],
        ])
    })
})

describe('treeBranchKeys and findInTree', () => {
    it('gives every row with children, at any depth', () => {
        expect([...treeBranchKeys(tree, key, kids)].sort()).toEqual(['a', 'b'])
    })

    it('keeps the matches, their branches and the way to them, and opens the way', () => {
        const found = findInTree({ rows: tree, rowKey: key, childRows: kids, match: (node) => node.id === 'b1' })
        expect(found.rows.map(key)).toEqual(['b'])
        expect(found.childRows(tree[0])?.map(key)).toEqual(['b1'])
        expect([...found.open]).toEqual(['b'])
        const whole = findInTree({ rows: tree, rowKey: key, childRows: kids, match: (node) => node.id === 'a' })
        expect(whole.childRows(tree[1])?.map(key)).toEqual(['a1'])
        expect(findInTree({ rows: tree, rowKey: key, childRows: kids, match: undefined }).rows).toBe(tree)
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
