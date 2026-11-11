import { describe, expect, it } from 'vitest'

import { focusHeading } from './Shell'

/** A heading as much as `focusHeading` touches: its tab index, its attributes, focus and blur. */
function heading(tabindex?: string) {
    const attributes = new Map<string, string>(tabindex === undefined ? [] : [['tabindex', tabindex]])
    const blurs: (() => void)[] = []
    const node = {
        focused: false,
        set tabIndex(value: number) {
            attributes.set('tabindex', String(value))
        },
        hasAttribute: (name: string) => attributes.has(name),
        removeAttribute: (name: string) => attributes.delete(name),
        addEventListener: (_type: string, listener: () => void) => blurs.push(listener),
        focus: () => {
            node.focused = true
        },
        attributes,
        blur: () => blurs.forEach((listener) => listener()),
    }
    return node
}

/** A page's area holding `found` as its first `h1`. */
const area = (found: unknown) => ({ querySelector: (selector: string) => (selector === 'h1' ? found : null) }) as unknown as ParentNode

describe('focusHeading', () => {
    it('focuses the page’s first h1, focusable only until the focus leaves it', () => {
        const h1 = heading()
        expect(focusHeading(area(h1))).toBe(true)
        expect(h1.focused).toBe(true)
        expect(h1.attributes.get('tabindex')).toBe('-1')
        h1.blur()
        expect(h1.attributes.has('tabindex')).toBe(false)
    })

    it('leaves a heading that was focusable already as it was', () => {
        const h1 = heading('0')
        focusHeading(area(h1))
        h1.blur()
        expect(h1.attributes.get('tabindex')).toBe('0')
    })

    it('does nothing for a page without a heading, or before the page area is there', () => {
        expect(focusHeading(area(null))).toBe(false)
        expect(focusHeading(null)).toBe(false)
    })
})
