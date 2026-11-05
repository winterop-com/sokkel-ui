import { describe, expect, test } from 'vitest'

import { splitEntries } from './ChipInput'
import { countChanges, type MatrixGroup, type MatrixRole } from './PermissionMatrix'

const ROLES: MatrixRole[] = [
    { id: 'viewer', label: 'Viewer', locked: true },
    { id: 'operator', label: 'Operator' },
]
const GROUPS: MatrixGroup[] = [
    {
        id: 'runs',
        label: 'Runs',
        permissions: [
            { id: 'runs:read', label: 'View' },
            { id: 'runs:start', label: 'Start' },
        ],
    },
]

describe('changes to a permission matrix', () => {
    test('counts each cell granted or taken away since it was saved', () => {
        const saved = { viewer: ['runs:read'], operator: ['runs:read'] }
        const value = { viewer: ['runs:read'], operator: ['runs:start'] }
        expect(countChanges(value, saved, ROLES, GROUPS)).toBe(2)
    })

    test('counts nothing when a role is missing from both', () => {
        expect(countChanges({}, {}, ROLES, GROUPS)).toBe(0)
    })

    test('ignores permissions the matrix does not show', () => {
        expect(countChanges({ operator: ['billing:read'] }, {}, ROLES, GROUPS)).toBe(0)
    })
})

describe('entries typed into a chip field', () => {
    test('splits at commas, semicolons, spaces and line breaks, dropping the empty ones', () => {
        expect(splitEntries('ada@example.org, grace@example.org;\nlinus@example.org  ,')).toEqual([
            'ada@example.org',
            'grace@example.org',
            'linus@example.org',
        ])
    })
})
