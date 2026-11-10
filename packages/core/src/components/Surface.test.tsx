import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Surface } from './Section'

describe('Surface', () => {
    it('clips nothing, so a focus ring at its edge shows whole', () => {
        for (const tone of ['card', 'well', 'inset'] as const) {
            const html = renderToStaticMarkup(<Surface tone={tone}>sync-inventory</Surface>)
            expect(html).not.toContain('overflow-hidden')
            expect(html).not.toContain('overflow-clip')
        }
    })

    it('keeps the card look by default', () => {
        const html = renderToStaticMarkup(<Surface>sync-inventory</Surface>)
        expect(html).toContain('border-border-strong bg-card')
        expect(html).toContain('rounded-t-[inherit]')
    })

    it('sets a well on the panel ground and an inset on the page ground, each with the hairline', () => {
        expect(renderToStaticMarkup(<Surface tone="well">a</Surface>)).toContain('border-border bg-panel-ground')
        expect(renderToStaticMarkup(<Surface tone="inset">a</Surface>)).toContain('border-border bg-background')
    })

    it('pads its content by the density and leaves its children their own corners', () => {
        const html = renderToStaticMarkup(
            <Surface tone="well" pad>
                a
            </Surface>,
        )
        expect(html).toContain('p-(--density-panel-pad)')
        expect(html).not.toContain('rounded-t-[inherit]')
    })
})
