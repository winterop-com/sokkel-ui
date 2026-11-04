import { describe, expect, test } from 'vitest'

import { checkTree, worstStatus, type Check } from './CheckList'

const CHECKS: Check[] = [
    { name: 'database', status: 'ok' },
    { name: 'packs', status: 'ok' },
    { name: 'dirigent-dhis2', status: 'warn', group: 'packs' },
    { name: 'dirigent-fhir', status: 'ok', group: 'packs' },
    { name: 'orphan', status: 'fail', group: 'nowhere' },
]

describe('a health report as a tree', () => {
    test('nests a check under the check its group names, in the order given', () => {
        const tree = checkTree(CHECKS)
        expect(tree.map((node) => node.check.name)).toEqual(['database', 'packs', 'orphan'])
        expect(tree[1].children.map((check) => check.name)).toEqual(['dirigent-dhis2', 'dirigent-fhir'])
    })

    test('keeps a check whose group is missing at the top rather than dropping it', () => {
        expect(checkTree(CHECKS).find((node) => node.check.name === 'orphan')?.children).toEqual([])
    })

    test('a group wears the worst status under it', () => {
        expect(worstStatus(CHECKS.slice(1, 4))).toBe('warn')
        expect(worstStatus(CHECKS)).toBe('fail')
        expect(worstStatus([])).toBe('ok')
    })
})
