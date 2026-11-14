import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable, TableCellFill, useTableCell } from './DataTable'
import { Checkbox } from './ui/checkbox'

describe('a cell that reads its table', () => {
    function Seen() {
        const { width, stacked, columnWidth } = useTableCell()
        return <i data-seen>{`${String(width)} ${stacked ? 'stacked' : 'rows'} ${String(columnWidth)}`}</i>
    }
    const html = renderToStaticMarkup(
        <DataTable
            columns={[{ id: 'job', header: 'Job', width: '1fr', cell: () => <Seen /> }]}
            rows={[{ id: 'a' }]}
            rowKey={(row) => row.id}
        />,
    )

    it('sees the table’s width, that its rows are not stacked, and no room for its column before one is measured', () => {
        expect(html).toContain('<i data-seen="true">1200 rows 0</i>')
    })

    it('sees no table outside one', () => {
        expect(renderToStaticMarkup(<Seen />)).toContain('0 rows 0')
    })

    it('fills its column’s track, so its room is the track’s', () => {
        expect(html).toMatch(/role="gridcell" data-track="job"[^>]*><span class="min-w-0 flex-1 truncate"/)
    })
})

describe('a part of a cell left out of its column’s measure', () => {
    const columns = (width: string) => [
        {
            id: 'job',
            header: 'Job',
            width,
            minWidth: '16rem',
            cell: (row: { id: string; about: string }) => (
                <span>
                    <code>{row.id}</code>
                    <TableCellFill>{row.about}</TableCellFill>
                </span>
            ),
        },
    ]
    const table = (width: string) =>
        renderToStaticMarkup(
            <DataTable
                columns={columns(width)}
                rows={[{ id: 'nightly-export', about: 'Writes the day’s orders to files.example.org.' }]}
                rowKey={(row) => row.id}
            />,
        )

    it('is marked to be skipped and takes its column’s width without adding to it', () => {
        expect(renderToStaticMarkup(<TableCellFill>Writes</TableCellFill>)).toBe(
            '<span data-measure="skip" class="block w-0 min-w-full truncate">Writes</span>',
        )
        expect(renderToStaticMarkup(<TableCellFill wrap>Writes</TableCellFill>)).toContain('break-words')
    })

    it('is left out of the rows while a content column is measured', () => {
        const html = table('content')
        expect(html).toMatch(/data-measuring="true" class="[^"]*data-measuring:\[&amp;_\[data-measure=skip\]\]:hidden/)
        expect(html).toContain('data-measure="skip"')
    })

    it('stays in a table with nothing to measure', () => {
        expect(table('1fr')).not.toContain('data-measuring="true"')
    })
})

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

describe('a table sorted by keys from its head row', () => {
    const html = renderToStaticMarkup(
        <DataTable
            columns={[
                { id: 'job', header: 'Job', width: '1fr', cell: (row: { id: string }) => row.id, sortValue: (row) => row.id },
                { id: 'state', header: 'State', width: '8rem', cell: () => 'queued' },
            ]}
            rows={[{ id: 'nightly-export' }, { id: 'sync-inventory' }]}
            rowKey={(row) => row.id}
        />,
    )

    it('keeps the rows and heads one tab stop: the grid takes the focus and its sortable heads do not', () => {
        expect(html).toMatch(/role="grid"[^>]*tabindex="0"/)
        expect(html).toMatch(/<button type="button" tabindex="-1"[^>]*><span class="truncate" title="Job">Job<\/span>/)
    })

    it('marks the head the keys move to with the button’s own focus look', () => {
        expect(html).toMatch(
            /<button type="button" tabindex="-1" class="[^"]*focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"/,
        )
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

    it('draws its cells at their own width while they are measured, however narrow the box', () => {
        expect(table()).toContain('grid-template-columns:max-content 1fr')
    })

    it('counts its floor toward the least width before it is measured', () => {
        const html = renderToStaticMarkup(
            <DataTable
                columns={[{ ...ACCOUNT_COLUMNS[0], minWidth: '12rem' }, ACCOUNT_COLUMNS[1]]}
                rows={ACCOUNTS}
                rowKey={(row) => row.id}
                minWidth="auto"
            />,
        )
        expect(html).toContain('min-width:calc(min(12rem, 16rem) + 0px)')
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

describe('a table loading its rows', () => {
    const html = renderToStaticMarkup(
        <DataTable columns={ACCOUNT_COLUMNS} rows={[]} rowKey={(row) => row.id} search={<input />} empty="No accounts yet." loading />,
    )

    it('draws placeholder rows under its heads and its bar, with no spinner line and no empty words', () => {
        expect(html).toContain('role="columnheader"')
        expect(html).toContain('<input/>')
        expect(html).toContain('data-slot="skeleton"')
        expect(html).not.toContain('animate-spin')
        expect(html).not.toContain('No accounts yet.')
        expect(html).not.toContain('0 rows')
    })
})

describe('a table whose read failed', () => {
    const table = (props: { loading?: boolean; words?: { refused?: string; retry?: string } } = {}) =>
        renderToStaticMarkup(
            <DataTable
                columns={ACCOUNT_COLUMNS}
                rows={ACCOUNTS}
                rowKey={(row) => row.id}
                search={<input />}
                empty="No accounts yet."
                status={403}
                error="The token may read `runs` but not `accounts`."
                problems={['`owner` is not a field of an account']}
                onRetry={() => undefined}
                {...props}
            />,
        )

    it('says the failure in place of its rows, under its heads and its bar, as PageState says it', () => {
        const html = table()
        expect(html).toContain('role="columnheader"')
        expect(html).toContain('<input/>')
        expect(html).toContain('role="alert"')
        expect(html).toContain('The server refused this read')
        expect(html).toContain('<code')
        expect(html).toContain('data-slot="page-state-problems"')
        expect(html).toContain('Try again')
        expect(html).not.toContain(`data-row="${ACCOUNTS[0].id}"`)
        expect(html).not.toContain('No accounts yet.')
    })

    it('draws the failure without a box of its own, the table’s frame its only edge', () => {
        expect(table()).not.toMatch(/data-slot="page-state" class="[^"]*rounded-surface/)
    })

    it('heads the failure in the words it is given', () => {
        const html = table({ words: { refused: 'Tjeneren nektet', retry: 'Prøv igjen' } })
        expect(html).toContain('Tjeneren nektet')
        expect(html).toContain('Prøv igjen')
    })

    it('reads again with placeholder rows in the failure’s place while loading', () => {
        const html = table({ loading: true })
        expect(html).not.toContain('role="alert"')
        expect(html).toContain('data-slot="skeleton"')
    })
})

describe('a table’s head', () => {
    const html = renderToStaticMarkup(
        <DataTable
            columns={[
                { id: 'job', header: 'Job', band: 'Run', width: '1fr', cell: (row: { id: string }) => row.id },
                { id: 'state', header: 'State', band: 'Run', width: '8rem', cell: () => 'queued' },
            ]}
            rows={[{ id: 'nightly-export' }]}
            rowKey={(row) => row.id}
        />,
    )

    it('stands in the grid above the rows’ scroller, so the scroll bar starts under it', () => {
        const grid = html.indexOf('role="grid"')
        const scroller = html.indexOf('overflow-auto', grid)
        expect(grid).toBeGreaterThan(-1)
        expect(html.indexOf('role="columnheader"', grid)).toBeLessThan(scroller)
        expect(html.indexOf('role="columnheader"', scroller)).toBe(-1)
        expect(html.indexOf('data-row="nightly-export"')).toBeGreaterThan(scroller)
    })

    it('is not sticky, its bands and heads drawn in turn', () => {
        expect(html).not.toMatch(/role="row"[^>]*class="[^"]*sticky top-/)
        expect(html.indexOf('aria-colspan="2"')).toBeLessThan(html.indexOf('aria-rowindex="1"'))
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

describe('a selection box before the checkbox has loaded', () => {
    /** Each checkbox's root and mark as drawn: their attributes, without Base UI's id. */
    const boxes = (html: string) =>
        [...html.matchAll(/<span[^>]*role="checkbox"[^>]*>(?:<span[^>]*>)?/g)].map((match) =>
            [...match[0].matchAll(/<span([^>]*)>/g)].map((span) =>
                [...span[1].matchAll(/([\w-]+)="([^"]*)"/g)]
                    .filter(([, name]) => name !== 'id')
                    .map(([, name, value]) => `${name}=${value}`)
                    .sort(),
            ),
        )

    it('is drawn as the checkbox draws it: some chosen, checked and unchecked', () => {
        const table = renderToStaticMarkup(
            <DataTable
                selectable
                defaultSelection={new Set(['a'])}
                columns={[{ id: 'job', header: 'Job', width: '1fr', cell: (row: { id: string }) => row.id }]}
                rows={[{ id: 'a' }, { id: 'b' }]}
                rowKey={(row) => row.id}
            />,
        )
        const checkboxes = renderToStaticMarkup(
            <>
                <Checkbox aria-label="Select all rows" checked={false} indeterminate />
                <Checkbox aria-label="Select row" tabIndex={-1} checked />
                <Checkbox aria-label="Select row" tabIndex={-1} checked={false} />
            </>,
        )
        expect(boxes(table)).toEqual(boxes(checkboxes))
    })
})

describe('rows on their way while the rows stack', () => {
    type Run = { id: string; job: string; state: string; took: string }
    const columns = [
        { id: 'job', header: 'Job', width: '1fr', cell: (run: Run) => run.job },
        { id: 'state', header: 'State', width: '8rem', cell: (run: Run) => run.state },
        { id: 'took', header: 'Took', width: '6rem', cell: (run: Run) => run.took },
    ]
    const placeholders = (html: string) => html.match(/data-slot="skeleton"/g)?.length ?? 0

    it('draws a listed row of bars for each, its title and its lines, under the rows already there', () => {
        const html = renderToStaticMarkup(
            <DataTable
                variant="list"
                stackBelow={2000}
                columns={columns}
                rows={[{ id: 'a', job: 'nightly-export', state: 'failed', took: '4m' }]}
                rowKey={(run) => run.id}
                loading
            />,
        )
        expect(html).toContain('nightly-export')
        const items = html.match(/<li aria-hidden="true"[^>]*>/g) ?? []
        expect(items).toHaveLength(3)
        // A title and two labeled lines, each line a label and a value.
        expect(placeholders(html)).toBe(3 * 5)
    })

    it('draws stacked cards of bars, in the cards’ shape, while the first rows load', () => {
        const html = renderToStaticMarkup(
            <DataTable minWidth="auto" stackBelow={2000} columns={columns} rows={[] as Run[]} rowKey={(run) => run.id} loading />,
        )
        const cards = html.match(/<div aria-hidden="true" class="[^"]*rounded-surface border border-border bg-card[^"]*"/g) ?? []
        expect(cards.length).toBeGreaterThanOrEqual(3)
        expect(html).not.toMatch(/data-slot="skeleton" class="[^"]*rounded-surface/)
    })
})
