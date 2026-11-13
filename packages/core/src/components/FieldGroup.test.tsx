import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FieldGroup } from './FieldGroup'

describe('FieldGroup', () => {
    it('is a fieldset labelled by its name, with its hint, description, actions and fields', () => {
        const html = renderToStaticMarkup(
            <FieldGroup
                id="window"
                label="Window"
                hint="Europe/Oslo"
                keyHint
                description="Runs only between these."
                actions={<button type="button">JSON</button>}
            >
                <input id="start" />
            </FieldGroup>,
        )
        expect(html).toMatch(/^<fieldset aria-labelledby="window"/)
        expect(html).toContain('id="window"')
        expect(html).toContain('font-mono text-muted-foreground">Europe/Oslo<')
        expect(html).toContain('Runs only between these.')
        expect(html).toContain('>JSON</button>')
        expect(html).toContain('<input id="start"/>')
    })

    it('draws only its name and fields when given nothing else', () => {
        const html = renderToStaticMarkup(
            <FieldGroup label="Window">
                <input />
            </FieldGroup>,
        )
        expect(html).not.toContain('<p')
        expect(html).not.toContain('ml-auto')
    })
})
