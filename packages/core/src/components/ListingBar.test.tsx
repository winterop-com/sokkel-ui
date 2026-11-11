import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'
import { ListingBar } from './ListingBar'

describe('ListingBar', () => {
    it('sets the search first, the tools on a line of their own under it, and the count at the end', () => {
        const html = renderToStaticMarkup(
            <ListingBar search={<input data-search />} toolbar={<button type="button">State</button>} count="12 runs" />,
        )
        expect(html.indexOf('data-search')).toBeLessThan(html.indexOf('State'))
        expect(html).toMatch(/order-last basis-full[^>]*><button[^>]*>State/)
        expect(html).toContain('>12 runs</span>')
    })

    it('draws a selection in place of the search and the tools, and no count when none is given', () => {
        const html = renderToStaticMarkup(<ListingBar search={<input data-search />} selection={<span data-chosen />} />)
        expect(html).toContain('data-chosen')
        expect(html).not.toContain('data-search')
        expect(html).not.toContain('tabular-nums')
    })
})

describe('the count of an empty table', () => {
    const columns = [{ id: 'name', header: 'Name', width: '1fr', cell: (row: { name: string }) => row.name }]

    it('is left out while the table says it is empty in its own words', () => {
        const html = renderToStaticMarkup(
            <DataTable columns={columns} rows={[]} rowKey={(row) => row.name} search={<input />} empty="No run matches these filters" />,
        )
        expect(html).toContain('No run matches these filters')
        expect(html).not.toMatch(/>0 rows</)
    })

    it('is said when there are rows', () => {
        const html = renderToStaticMarkup(
            <DataTable columns={columns} rows={[{ name: 'harbor' }]} rowKey={(row) => row.name} search={<input />} />,
        )
        expect(html).toMatch(/>1 row</)
    })
})
