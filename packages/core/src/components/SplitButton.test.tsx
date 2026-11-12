import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IconButton } from './IconButton'
import { SplitButton } from './SplitButton'
import { TooltipProvider } from './ui/tooltip'

describe('SplitButton', () => {
    it('names its main half apart from its face', () => {
        const html = renderToStaticMarkup(
            <SplitButton items={[]} label="New job" title="New job">
                New
            </SplitButton>,
        )
        expect(html).toContain('aria-label="New job"')
        expect(html).toContain('title="New job"')
        expect(html).toContain('>New</button>')
    })

    it('shuts both halves with a reason the same way, reachable and never disabled', () => {
        const html = renderToStaticMarkup(
            <TooltipProvider>
                <SplitButton items={[{ label: 'Import', onSelect: () => undefined }]} reason="The project is archived">
                    New
                </SplitButton>
            </TooltipProvider>,
        )
        expect(html.match(/aria-disabled="true"/g)).toHaveLength(2)
        expect(html).not.toMatch(/\sdisabled=""/)
    })

    it('says on hover what its chevron chooses', () => {
        const html = renderToStaticMarkup(
            <SplitButton items={[]} words={{ more: 'Refresh on its own', moreHint: 'How often this refreshes on its own' }}>
                Refresh
            </SplitButton>,
        )
        expect(html).toContain('title="How often this refreshes on its own"')
    })

    it('mixes its separator in oklab, so a warm primary never turns it green', () => {
        const html = renderToStaticMarkup(<SplitButton items={[]}>New</SplitButton>)
        expect(html).toContain('in_oklab,var(--primary)')
        expect(html).not.toContain('in_oklch')
    })

    it('takes aria-pressed on an IconButton as pressed', () => {
        const html = renderToStaticMarkup(
            <TooltipProvider>
                <IconButton label="Pin" {...{ 'aria-pressed': true }}>
                    <svg />
                </IconButton>
            </TooltipProvider>,
        )
        expect(html).toContain('aria-pressed="true"')
    })
})
