import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SplitButton } from './SplitButton'

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
})
