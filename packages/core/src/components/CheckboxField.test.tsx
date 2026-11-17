import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CheckboxField } from './CheckboxField'

describe('CheckboxField', () => {
    it('fades a disabled row once, at the disabled opacity, its box with it', () => {
        const html = renderToStaticMarkup(<CheckboxField label="Reproduce it" disabled />)
        const row = /<label class="([^"]*)"/.exec(html)?.[1] ?? ''
        const box = /<button[^>]*class="([^"]*)"/.exec(html)?.[1] ?? ''
        expect(row.split(' ')).toContain('has-disabled:opacity-disabled')
        expect(row).not.toMatch(/opacity-\d/)
        // The box fades with its row rather than again on its own.
        expect(box.split(' ')).toContain('disabled:opacity-100')
        expect(box.split(' ')).not.toContain('disabled:opacity-disabled')
    })
})
