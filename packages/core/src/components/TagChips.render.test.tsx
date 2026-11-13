import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TagChips } from './TagChips'

describe('TagChips', () => {
    it('draws each tag as words alone, and as a button with onSelect', () => {
        expect(renderToStaticMarkup(<TagChips tags={['nightly', 'harbor']} />)).not.toContain('<button')
        const html = renderToStaticMarkup(
            <TagChips tags={['nightly', 'harbor']} onSelect={() => undefined} words={{ select: (tag) => `Filter by ${tag}` }} />,
        )
        expect(html.match(/<button type="button"/g)).toHaveLength(2)
        expect(html).toContain('aria-label="Filter by harbor"')
    })
})
