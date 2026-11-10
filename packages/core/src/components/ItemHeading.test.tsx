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
        expect(html).toMatch(/<p[^>]*truncate[^>]*>Serves the public API.<\/p>/)
        expect(html).toContain('text-detail-title')
    })
})
