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

describe('a column with a head, a centered cell and a fill', () => {
    interface Run {
        id: string
        state: string
    }
    const rows: Run[] = [
        { id: 'nightly-export', state: 'failed' },
        { id: 'sync-inventory', state: 'succeeded' },
    ]
    const html = renderToStaticMarkup(
        <DataTable
            columns={[
                { id: 'job', header: 'Job', width: '1fr', cell: (row: Run) => row.id },
                {
                    id: 'state',
                    header: 'State',
                    head: <em data-head>State now</em>,
                    width: '8rem',
                    align: 'center',
                    fill: (row) => (row.state === 'failed' ? { color: 'var(--critical)', solid: true } : undefined),
                    cell: (row) => row.state,
                },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
            rowHeight="auto"
            bar={false}
        />,
    )

    it('draws the head node in place of the header', () => {
        expect(html).toContain('<em data-head="true">State now</em>')
    })

    it('fills only the cells the column says, with its color', () => {
        expect(html.match(/data-filled="solid"/g)?.length).toBe(1)
        expect(html).toContain('--fill:var(--critical)')
        expect(html).toContain('justify-center')
    })

    it('has no bar when told not to', () => {
        expect(html).not.toContain('@container/bar')
    })
})
