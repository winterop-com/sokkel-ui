import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Unfoldable } from './Unfoldable'

describe('Unfoldable', () => {
    it('is a button with a chevron when it has something to unfold', () => {
        const html = renderToStaticMarkup(<Unfoldable heading="fetch">lines</Unfoldable>)
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('lucide-chevron-right')
        expect(html).not.toContain('lines')
    })

    it('is a static row with nothing to unfold: no button, no chevron, its heading kept in line', () => {
        for (const children of [undefined, null, false]) {
            const html = renderToStaticMarkup(<Unfoldable heading="upload">{children}</Unfoldable>)
            expect(html).not.toContain('<button')
            expect(html).not.toContain('lucide-chevron-right')
            expect(html).toMatch(/<span class="size-3\.5 shrink-0" aria-hidden="true"><\/span><span[^>]*>upload<\/span>/)
        }
    })

    it('shows its summary while shut and its content in its place while open', () => {
        const shut = renderToStaticMarkup(
            <Unfoldable heading="transform" summary="37 rows did not parse">
                lines
            </Unfoldable>,
        )
        expect(shut).toContain('37 rows did not parse')
        const open = renderToStaticMarkup(
            <Unfoldable heading="transform" summary="37 rows did not parse" defaultOpen>
                lines
            </Unfoldable>,
        )
        expect(open).not.toContain('37 rows did not parse')
        expect(open).toContain('lines')
    })

    it('follows open when the app holds it, over defaultOpen', () => {
        const held = renderToStaticMarkup(
            <Unfoldable heading="validate" open defaultOpen={false} onOpenChange={() => undefined}>
                lines
            </Unfoldable>,
        )
        expect(held).toContain('aria-expanded="true"')
        const shut = renderToStaticMarkup(
            <Unfoldable heading="validate" open={false} defaultOpen>
                lines
            </Unfoldable>,
        )
        expect(shut).toContain('aria-expanded="false"')
    })

    it('stays open while forced, whatever the app holds', () => {
        const html = renderToStaticMarkup(
            <Unfoldable heading="validate" open={false} forced>
                lines
            </Unfoldable>,
        )
        expect(html).toContain('aria-expanded="true"')
    })
})
