import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'

describe('a table with no rows', () => {
    const columns = [{ id: 'job', header: 'Job', width: '1fr', cell: (row: { id: string }) => row.id }]
    const table = (empty?: ReactNode) =>
        renderToStaticMarkup(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} empty={empty} />)

    it('says its words, a sentence of the app’s, or the app’s own node', () => {
        expect(table()).toContain('Nothing here.')
        expect(table('No runs yet.')).toContain('No runs yet.')
        expect(table(<section data-empty>Start a job</section>)).toContain('<section data-empty="true">Start a job</section>')
    })
})
