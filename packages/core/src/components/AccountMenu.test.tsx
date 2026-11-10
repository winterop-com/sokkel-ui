import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AccountMenu } from './AccountMenu'

describe('AccountMenu', () => {
    it('draws the detail muted beside the name in the face', () => {
        const html = renderToStaticMarkup(<AccountMenu name="grace" detail="admin" />)
        expect(html).toContain('>grace</span>')
        expect(html).toMatch(/<span class="[^"]*text-muted-foreground[^"]*">admin<\/span>/)
    })

    it('draws no detail without one', () => {
        expect(renderToStaticMarkup(<AccountMenu name="grace" />)).not.toContain('text-xs text-muted-foreground')
    })

    it('leaves the detail out of a collapsed face', () => {
        const html = renderToStaticMarkup(<AccountMenu name="grace" detail="admin" collapsed />)
        expect(html).not.toContain('admin')
        expect(html).not.toContain('>grace<')
    })
})
