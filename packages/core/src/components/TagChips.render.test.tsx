import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TableCellContext } from './table-cell'
import { TagChips } from './TagChips'

describe('TagChips', () => {
    it('draws each tag as words alone, and as a button with onSelect', () => {
        expect(renderToStaticMarkup(<TagChips tags={['nightly', 'harbor']} />)).not.toContain('<button')
        const html = renderToStaticMarkup(
            <TagChips tags={['nightly', 'harbor']} onSelect={() => undefined} words={{ select: (tag) => `Filter by ${tag}` }} />,
        )
        expect(html.match(/<button type="button"/g)).toHaveLength(2)
        expect(html).toContain('aria-label="Filter by harbor"')
    })

    it('draws its tags as mono chips, in the outline tone for the outline variant', () => {
        const html = renderToStaticMarkup(<TagChips tags={['nightly']} variant="outline" />)
        expect(html).toContain('data-slot="chip"')
        expect(html).toContain('font-mono')
        expect(html).toContain('border-border text-foreground')
        expect(renderToStaticMarkup(<TagChips tags={['nightly']} mono={false} />)).not.toContain('font-mono')
    })

    it('names the +N chip by the tags it stands for', () => {
        const html = renderToStaticMarkup(<TagChips tags={['nightly', 'harbor', 'csv']} max={1} />)
        expect(html).toContain('aria-label="2 more: harbor, csv"')
        const menu = renderToStaticMarkup(<TagChips tags={['nightly', 'harbor', 'csv']} max={1} onSelect={() => undefined} />)
        expect(menu).toContain('aria-label="2 more: harbor, csv"')
        expect(menu).toContain('aria-haspopup="menu"')
    })

    it('fits its column in a table cell and wraps every tag on a stacked card', () => {
        const stacked = renderToStaticMarkup(
            <TableCellContext value={{ width: 320, stacked: true, columnWidth: 200 }}>
                <TagChips tags={['nightly', 'harbor', 'csv']} />
            </TableCellContext>,
        )
        expect(stacked).toContain('flex-wrap')
        expect(stacked).not.toContain('more:')
    })

    it('draws its measuring ruler only in a row that clips it, never on a stacked card', () => {
        const row = renderToStaticMarkup(<TagChips tags={['nightly', 'harbor', 'csv']} />)
        expect(row).toContain('overflow-hidden')
        expect(row).toContain('invisible absolute')
        const stacked = renderToStaticMarkup(
            <TableCellContext value={{ width: 320, stacked: true, columnWidth: 200 }}>
                <TagChips tags={['nightly', 'harbor', 'csv', 'europe', 'retry-on-failure', 'archived-input']} />
            </TableCellContext>,
        )
        expect(stacked).not.toContain('invisible absolute')
        expect(stacked).not.toContain('aria-hidden')
    })
})
