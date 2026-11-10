import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CopyButton } from './CopyButton'
import { SecretReveal } from './SecretReveal'
import { TooltipProvider } from './ui/tooltip'

describe('SecretReveal', () => {
    it('names its value by the label, or Secret when the label is not plain text', () => {
        expect(renderToStaticMarkup(<SecretReveal value="tdv_7f3a" label="sync-inventory token" />)).toContain(
            'aria-label="sync-inventory token"',
        )
        expect(renderToStaticMarkup(<SecretReveal value="tdv_7f3a" label={<b>token</b>} />)).toContain('aria-label="Secret"')
    })
})

describe('CopyButton', () => {
    it('draws a ghost in muted ink and an outline in the body ink', () => {
        const drawn = (variant: 'ghost' | 'outline') =>
            renderToStaticMarkup(
                <TooltipProvider>
                    <CopyButton value="nightly-export" variant={variant} />
                </TooltipProvider>,
            )
        expect(drawn('ghost')).toContain('text-muted-foreground')
        expect(drawn('outline')).not.toContain('text-muted-foreground')
    })
})
