import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PermissionMatrix, type MatrixGroup, type MatrixRole } from './PermissionMatrix'

const ROLES: MatrixRole[] = [
    { id: 'viewer', label: 'Viewer', locked: true },
    { id: 'operator', label: 'Operator', code: 'ops' },
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

describe('a permission matrix drawn by DataTable', () => {
    const html = renderToStaticMarkup(
        <PermissionMatrix
            roles={ROLES}
            groups={GROUPS}
            value={{ viewer: ['runs:read'], operator: ['runs:read', 'runs:start'] }}
            saved={{ viewer: ['runs:read'], operator: ['runs:read'] }}
        />,
    )

    it('draws a box for every role and permission', () => {
        expect(html).toContain('aria-label="View for Viewer"')
        expect(html).toContain('aria-label="Start for Operator"')
        expect(html.match(/role="checkbox"/g)?.length).toBe(4)
    })

    it('heads each role with its lock and code, and counts what it holds in the group', () => {
        expect(html).toContain('Built in, read-only')
        expect(html).toContain('>ops<')
        expect(html).toContain('1 of 2')
        expect(html).toContain('2 of 2')
    })

    it('marks only the cell that differs from the saved grants', () => {
        expect(html.match(/data-changed="true"/g)?.length).toBe(1)
        expect(html.match(/data-filled="tint"/g)?.length).toBe(1)
    })
})
