import { describe, expect, test } from 'vitest'

import { checkTree, worstStatus, type Check } from './CheckList'

const CHECKS: Check[] = [
    { name: 'database', status: 'ok' },
    { name: 'services', status: 'ok' },
    { name: 'api', status: 'warn', group: 'services' },
    { name: 'worker', status: 'ok', group: 'services' },
    { name: 'orphan', status: 'fail', group: 'nowhere' },
]

describe('a health report as a tree', () => {
    test('nests a check under the check its group names, in the order given', () => {
        const tree = checkTree(CHECKS)
        expect(tree.map((node) => node.check.name)).toEqual(['database', 'services', 'orphan'])
        expect(tree[1].children.map((check) => check.name)).toEqual(['api', 'worker'])
    })

    test('keeps a check whose group is missing at the top rather than dropping it', () => {
        expect(checkTree(CHECKS).find((node) => node.check.name === 'orphan')?.children).toEqual([])
    })

    test('nests a check whose group nests too under the top of its groups, and keeps a circle at the top', () => {
        const deep = checkTree([
            { name: 'services', status: 'ok' },
            { name: 'worker', status: 'ok', group: 'services' },
            { name: 'queue', status: 'fail', group: 'worker' },
            { name: 'api', status: 'ok', group: 'scheduler' },
            { name: 'scheduler', status: 'warn', group: 'api' },
        ])
        expect(deep.map((node) => node.check.name)).toEqual(['services', 'api', 'scheduler'])
        expect(deep[0].children.map((check) => check.name)).toEqual(['worker', 'queue'])
    })

    test('a group wears the worst status under it', () => {
        expect(worstStatus(CHECKS.slice(1, 4))).toBe('warn')
        expect(worstStatus(CHECKS)).toBe('fail')
        expect(worstStatus([])).toBe('ok')
    })
})
