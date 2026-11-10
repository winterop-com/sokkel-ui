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

    it('keeps the name its room and drops the detail from a narrow face', () => {
        const html = renderToStaticMarkup(<AccountMenu name="grace" detail="admin" />)
        expect(html).toMatch(/<button[^>]*class="@container /)
        expect(html).toMatch(/<span class="max-w-full shrink-0 truncate font-medium">grace<\/span>/)
        expect(html).toMatch(/<span class="[^"]*@max-\[13rem\]:hidden[^"]*">admin<\/span>/)
    })
})
