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
})
