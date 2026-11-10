import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SearchField } from './SearchField'

const noop = () => undefined

describe('a search field', () => {
    it('is named by its placeholder when no label is given', () => {
        const html = renderToStaticMarkup(<SearchField value="" onChange={noop} />)
        expect(html).toContain('aria-label="Search"')
        expect(html).toContain('placeholder="Search"')
    })

    it('is named by its label while the placeholder stays short', () => {
        const html = renderToStaticMarkup(<SearchField value="" onChange={noop} label="Search jobs" />)
        expect(html).toContain('aria-label="Search jobs"')
        expect(html).toContain('placeholder="Search"')
    })

    it('passes aria and data attributes through to the input', () => {
        const html = renderToStaticMarkup(
            <SearchField
                value=""
                onChange={noop}
                inputProps={{ 'aria-describedby': 'jobs-hint', 'data-page-search': '', 'data-testid': 'jobs-search' }}
            />,
        )
        expect(html).toMatch(/<input[^>]*aria-describedby="jobs-hint"/)
        expect(html).toMatch(/<input[^>]*data-page-search=""/)
        expect(html).toMatch(/<input[^>]*data-testid="jobs-search"/)
    })

    it('refuses typing and drops clear and the key hint when disabled', () => {
        const html = renderToStaticMarkup(<SearchField value="nightly" onChange={noop} disabled />)
        expect(html).toMatch(/<input[^>]*disabled=""/)
        expect(html).toContain('data-disabled="true"')
        expect(html).not.toContain('Clear the search')
        expect(html).not.toContain('<kbd')
    })
})
