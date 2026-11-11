import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { KbdSequence } from './kbd'

describe('KbdSequence', () => {
    it('draws a chord as one press held together, with no word', () => {
        const html = renderToStaticMarkup(<KbdSequence keys={['⌘', 'K']} />)
        expect(html.match(/data-slot="kbd-group"/g)).toHaveLength(1)
        expect(html).not.toContain('then')
    })

    it('draws a sequence as its two presses with the word between, as G then D', () => {
        const html = renderToStaticMarkup(<KbdSequence keys={['G']} next={['D']} />)
        expect(
            html
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim(),
        ).toBe('G then D')
        expect(html.match(/data-slot="kbd-group"/g)).toHaveLength(2)
    })

    it('takes its word from the app', () => {
        expect(renderToStaticMarkup(<KbdSequence keys={['G']} next={['D']} sequence="og så" />)).toContain('og så')
    })
})
