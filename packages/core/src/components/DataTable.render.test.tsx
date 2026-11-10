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

interface Account {
    id: string
    tokens: string[]
    active: boolean
}
const ACCOUNTS: Account[] = [
    { id: 'ada', tokens: ['deploy-harbor', 'laptop'], active: true },
    { id: 'grace', tokens: ['sync-inventory'], active: true },
    { id: 'linus', tokens: [], active: true },
    { id: 'margaret', tokens: ['rebuild-index'], active: false },
]
const ACCOUNT_COLUMNS = [
    { id: 'name', header: 'Account', width: 'content', maxWidth: '16rem', cell: (row: Account) => row.id },
    { id: 'role', header: 'Role', width: '1fr', cell: () => 'Editor' },
]

describe('rows that open into a detail of their own', () => {
    const asked: string[] = []
    const html = renderToStaticMarkup(
        <DataTable
            columns={ACCOUNT_COLUMNS}
            rows={ACCOUNTS}
            rowKey={(row) => row.id}
            defaultExpanded={new Set(['ada'])}
            hasDetail={(row) => row.tokens.length > 0}
            detail={(row) => {
                asked.push(row.id)
                return <ul data-tokens>{row.tokens.join(', ')}</ul>
            }}
            expandLabel={(row, open) => `${open ? 'Hide' : 'Show'} the tokens of ${row.id}`}
        />,
    )

    it('asks for the detail of the opened rows only, given hasDetail', () => {
        expect(asked.length).toBeGreaterThan(0)
        expect(asked.every((id) => id === 'ada')).toBe(true)
        expect(html).toContain('deploy-harbor, laptop')
    })

    it('names each row’s control by the row, open or not, and only rows with a detail have one', () => {
        expect(html).toContain('aria-label="Hide the tokens of ada"')
        expect(html).toContain('aria-label="Show the tokens of grace"')
        expect(html).not.toContain('the tokens of linus')
    })
})

describe('row tones', () => {
    const html = renderToStaticMarkup(
        <DataTable
            columns={ACCOUNT_COLUMNS}
            rows={ACCOUNTS}
            rowKey={(row) => row.id}
            rowTone={(row) => (!row.active ? 'muted' : row.tokens.length === 0 ? 'critical' : undefined)}
        />,
    )

    it('dims a muted row and tints a status row in its tone, leaving the rest', () => {
        expect(html.match(/data-tone="muted"/g)?.length).toBe(1)
        expect(html.match(/data-tone="critical"/g)?.length).toBe(1)
        expect(html).toContain('opacity-60')
        expect(html).toContain('var(--critical)_8%')
    })
})

describe('a column as wide as its content', () => {
    const table = (widths?: Record<string, number>) =>
        renderToStaticMarkup(<DataTable columns={ACCOUNT_COLUMNS} rows={ACCOUNTS} rowKey={(row) => row.id} columnWidths={widths} />)

    it('fits its content up to its widest until measured', () => {
        expect(table()).toContain('grid-template-columns:fit-content(16rem) 1fr')
    })

    it('takes a dragged width over its content', () => {
        expect(table({ name: 240 })).toContain('grid-template-columns:240px 1fr')
    })
})

describe('an empty table', () => {
    const table = (props: { empty?: string; search?: ReactNode }) =>
        renderToStaticMarkup(<DataTable columns={ACCOUNT_COLUMNS} rows={[]} rowKey={(row) => row.id} {...props} />)

    it('says its own words alone, without the column heads', () => {
        const html = table({ empty: 'No accounts yet.' })
        expect(html).toContain('No accounts yet.')
        expect(html).not.toContain('role="columnheader"')
    })

    it('keeps its heads when a search may have emptied it, or with the table’s own words', () => {
        expect(table({ empty: 'No accounts match.', search: <input /> })).toContain('role="columnheader"')
        expect(table({})).toContain('role="columnheader"')
    })
})

describe('loading more', () => {
    const table = (loadMore?: 'end' | 'button') =>
        renderToStaticMarkup(
            <DataTable
                columns={ACCOUNT_COLUMNS}
                rows={ACCOUNTS}
                rowKey={(row) => row.id}
                hasMore
                onLoadMore={() => undefined}
                loadMore={loadMore}
                loadMoreCount={20}
            />,
        )

    it('offers a button that says how many come next, given loadMore="button"', () => {
        expect(table('button')).toContain('Load 20 more')
        expect(table()).not.toContain('Load 20 more')
    })
})

describe('the width a table stacks below', () => {
    it('takes a CSS length, measured on the table’s own box', () => {
        const html = renderToStaticMarkup(
            <DataTable columns={ACCOUNT_COLUMNS} rows={ACCOUNTS} rowKey={(row) => row.id} stackBelow="64rem" />,
        )
        expect(html).toContain('width:64rem')
    })
})
