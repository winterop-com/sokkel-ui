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

    /** The classes of the box that holds a row's title and detail. */
    const linesClasses = (html: string) => (/<span class="([^"]*)"><span data-slot="list-row-title"/.exec(html)?.[1] ?? '').split(/\s+/)

    it('draws a dense row on one line from md, its code title in the code face', () => {
        const html = renderToStaticMarkup(<ListRow dense mono title="scheduler" detail="missed 2 ticks" icon={<i />} />)
        expect(html).toContain('py-1')
        expect(linesClasses(html)).toEqual(expect.arrayContaining(['md:flex-row', 'md:items-baseline', 'md:gap-2']))
        expect(html).toMatch(/data-slot="list-row-title" class="[^"]*font-mono/)
    })

    it('puts a dense row’s detail under its title below md, so a long title leaves it room', () => {
        const long = 'scheduler-juniper-02.eu-north.example.org'
        const lines = linesClasses(
            renderToStaticMarkup(<ListRow dense mono title={long} detail="missed 2 ticks" onPress={() => undefined} />),
        )
        // Stacked unless wide, side by side only from md, so a phone gives each its own line.
        expect(lines).toContain('flex-col')
        expect(lines.filter((name) => /^(items-baseline|gap-2|flex-row)$/.test(name))).toEqual([])
        // A row that is not dense keeps its two lines at every width.
        const regular = linesClasses(renderToStaticMarkup(<ListRow title={long} detail="missed 2 ticks" />))
        expect(regular).toContain('flex-col')
        expect(regular.some((name) => name.startsWith('md:'))).toBe(false)
    })

    it('stands a dense row that presses a finger tall below md, and leaves a plain one dense', () => {
        const rowClasses = (html: string) => (/data-slot="list-row"[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/)
        for (const html of [
            renderToStaticMarkup(<ListRow dense title="scheduler" detail="missed 2 ticks" onPress={() => undefined} />),
            renderToStaticMarkup(<ListRow dense title="scheduler" detail="missed 2 ticks" href="/services/scheduler" />),
        ]) {
            expect(rowClasses(html)).toEqual(expect.arrayContaining(['min-h-8', 'max-md:min-h-finger']))
        }
        const plain = rowClasses(renderToStaticMarkup(<ListRow dense title="scheduler" detail="missed 2 ticks" />))
        expect(plain).toContain('min-h-8')
        expect(plain).not.toContain('max-md:min-h-finger')
    })
})
