import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Code } from './Code'

describe('Code', () => {
    it("sets the app's actions beside the copy button", () => {
        const html = renderToStaticMarkup(<Code value="rows: 812" actions={<button type="button">Open</button>} />)
        expect(html).toMatch(/data-slot="code-block-actions"[^>]*><button type="button">Open<\/button>/)
    })

    it('gives the buttons a head row of their own without a title, off the text', () => {
        expect(renderToStaticMarkup(<Code value="rows: 812" />)).not.toContain('data-slot="code-block-header"')
        expect(renderToStaticMarkup(<Code value="rows: 812" header />)).toContain('data-slot="code-block-header"')
        expect(renderToStaticMarkup(<Code value="rows: 812" title="output.yaml" />)).toContain('data-slot="code-block-header"')
    })
})
