import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ListRow, ListRows } from './ListRow'

describe('ListRow', () => {
    it('is plain without a handler, a button with onPress and a link with href', () => {
        expect(renderToStaticMarkup(<ListRow title="sync-inventory" detail="failed at upload" />)).not.toMatch(/<(button|a)\b/)
        const button = renderToStaticMarkup(<ListRow title="sync-inventory" detail="failed at upload" onPress={() => undefined} current />)
        expect(button).toMatch(/^<button type="button" data-slot="list-row" aria-current="true"/)
        expect(button).toContain('failed at upload')
        expect(renderToStaticMarkup(<ListRow title="sync-inventory" href="/runs/1042" />)).toContain('href="/runs/1042"')
    })

    it('puts each row in a list item of a named list', () => {
        const html = renderToStaticMarkup(
            <ListRows label="Failed runs">
                <ListRow title="sync-inventory" />
                {null}
                <ListRow title="import-orders" />
            </ListRows>,
        )
        expect(html).toContain('aria-label="Failed runs"')
        expect(html.match(/<li/g)).toHaveLength(2)
    })

    it('says its tooltip on hover and wraps its lines with wrap', () => {
        const cut = renderToStaticMarkup(<ListRow title="sync-inventory" detail="14 rows have no site" tooltip="Open the run" />)
        expect(cut).toContain('title="Open the run"')
        expect(cut).toContain('truncate')
        const wrapped = renderToStaticMarkup(<ListRow title="sync-inventory" detail="14 rows have no site" wrap />)
        expect(wrapped).not.toContain('truncate')
        expect(wrapped).toContain('break-words')
    })

    it('sets its rows flush in a panel with flush: square, at the panel inset, parted by hairlines', () => {
        const flush = renderToStaticMarkup(
            <ListRows flush>
                <ListRow title="sync-inventory" onPress={() => undefined} />
                <ListRow title="import-orders" />
            </ListRows>,
        )
        expect(flush).toContain('divide-y')
        expect(flush).toContain('px-(--density-panel-pad)')
        expect(flush).not.toContain('rounded-control')
        const boxed = renderToStaticMarkup(
            <ListRows>
                <ListRow title="sync-inventory" />
            </ListRows>,
        )
        expect(boxed).toContain('rounded-control')
        expect(boxed).not.toContain('divide-y')
        const card = renderToStaticMarkup(
            <ListRows flush inset="card">
                <ListRow title="api" />
            </ListRows>,
        )
        expect(card).toContain('px-[var(--card-spacing,--spacing(4))]')
        expect(card).not.toContain('--density-panel-pad')
    })

    it('draws a dense row on one line, its code title in the code face', () => {
        const html = renderToStaticMarkup(<ListRow dense mono title="scheduler" detail="missed 2 ticks" icon={<i />} />)
        expect(html).toContain('py-1')
        expect(html).not.toContain('flex-col')
        expect(html).toMatch(/data-slot="list-row-title" class="[^"]*font-mono/)
    })
})
