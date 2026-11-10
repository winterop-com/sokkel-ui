import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

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
})
