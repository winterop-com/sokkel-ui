import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { identityOf, ItemHeading } from './ItemHeading'

describe('identityOf', () => {
    it('heads with the name and shows the code apart, or heads with the code once', () => {
        expect(identityOf('Nightly export', 'nightly-export')).toEqual({
            heading: 'Nightly export',
            code: 'nightly-export',
            codeIsHeading: false,
        })
        expect(identityOf(undefined, 'nightly-export')).toEqual({ heading: 'nightly-export', codeIsHeading: true })
        expect(identityOf('nightly-export', 'nightly-export')).toEqual({ heading: 'nightly-export', codeIsHeading: true })
        expect(identityOf('Nightly export', undefined)).toEqual({ heading: 'Nightly export', code: undefined, codeIsHeading: false })
    })
})

describe('ItemHeading', () => {
    it('sets the code under the name when stacked, and beside it in the name row when inline', () => {
        const stacked = renderToStaticMarkup(<ItemHeading name="Nightly export" code="nightly-export" />)
        const inline = renderToStaticMarkup(<ItemHeading name="Nightly export" code="nightly-export" variant="inline" />)
        expect(stacked).toMatch(/<\/h2><\/div><div[^>]*><span[^>]*>nightly-export<\/span>/)
        expect(inline).toMatch(/<\/h2><span[^>]*>nightly-export<\/span><\/div>/)
    })

    it('draws a code alone as the heading once, in the code face', () => {
        const html = renderToStaticMarkup(<ItemHeading code="sync-inventory" as="h3" />)
        expect(html.match(/sync-inventory/g)).toHaveLength(1)
        expect(html).toMatch(/<h3[^>]*font-mono[^>]*>sync-inventory<\/h3>/)
    })

    it('leads with the glyph, follows the name with chips and ends with one truncated line', () => {
        const html = renderToStaticMarkup(
            <ItemHeading
                name="api"
                glyph={<svg data-glyph />}
                chips={<span data-chip />}
                description="Serves the public API."
                size="dialog"
            />,
        )
        expect(html.indexOf('data-glyph')).toBeLessThan(html.indexOf('>api<'))
        expect(html.indexOf('>api<')).toBeLessThan(html.indexOf('data-chip'))
        expect(html).toMatch(/<span[^>]*truncate[^>]*>Serves the public API.<\/span>/)
        expect(html).toContain('text-detail-title')
    })

    it('keeps an inline code on screen, the name giving way first, with the whole code on hover', () => {
        const html = renderToStaticMarkup(
            <ItemHeading name="Sync inventory with the three warehouses" code="sync-inventory" variant="inline" />,
        )
        expect(html).toMatch(/<span title="sync-inventory" class="[^"]*max-w-\[max\(50%[^"]*shrink-0/)
        expect(html).not.toContain('shrink-2')
    })

    it('is made of spans at the dialog size, so a dialog title may hold it', () => {
        const html = renderToStaticMarkup(<ItemHeading name="Worker" code="worker" size="dialog" description="Runs each step." />)
        expect(html).not.toMatch(/<(div|p|h[1-6])\b/)
        expect(renderToStaticMarkup(<ItemHeading name="Worker" />)).toMatch(/^<div[^>]*><div[^>]*><h2/)
    })

    it("says a lead word before the name in the heading's face, the code alone in the code face", () => {
        const html = renderToStaticMarkup(<ItemHeading code="nightly-export" lead="Edit" size="dialog" />)
        expect(html).toMatch(/<span class="[^"]*text-detail-title[^"]*">Edit <span class="font-mono">nightly-export<\/span><\/span>/)
    })
})
