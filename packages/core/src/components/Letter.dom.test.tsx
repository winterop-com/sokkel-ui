// @vitest-environment happy-dom
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Letter } from './Letter'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
})

function draw(node: ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(node))
    return host
}

const GRACE = { name: 'grace', address: 'grace@example.org' }

describe('Letter', () => {
    it('folds over its body: the snippet while folded, the address, recipients and body once a press opens it', () => {
        const page = draw(
            <Letter from={GRACE} to={['me', 'linus']} time="09:42" attached snippet="The plan for Saturday">
                <p>The whole plan</p>
            </Letter>,
        )
        const head = page.querySelector('button')
        expect(head?.getAttribute('aria-expanded')).toBe('false')
        expect(page.textContent).toContain('The plan for Saturday')
        expect(page.textContent).not.toContain('The whole plan')
        expect(page.textContent).not.toContain('grace@example.org')
        expect(page.querySelector('[aria-label="Has attachments"]')).not.toBeNull()
        act(() => head?.click())
        expect(head?.getAttribute('aria-expanded')).toBe('true')
        expect(page.textContent).toContain('The whole plan')
        expect(page.textContent).toContain('grace@example.org')
        expect(page.textContent).toContain('to me, linus')
        expect(page.textContent).not.toContain('The plan for Saturday')
        act(() => head?.click())
        expect(page.textContent).not.toContain('The whole plan')
    })

    it('is held from outside with `open` and `onOpenChange`', () => {
        const told = vi.fn()
        function Held() {
            const [open, setOpen] = useState(true)
            return (
                <Letter
                    from={GRACE}
                    time="09:42"
                    open={open}
                    onOpenChange={(next) => {
                        told(next)
                        setOpen(next)
                    }}
                >
                    <p>Body</p>
                </Letter>
            )
        }
        const page = draw(<Held />)
        expect(page.textContent).toContain('Body')
        act(() => page.querySelector('button')?.click())
        expect(told).toHaveBeenCalledWith(false)
        expect(page.textContent).not.toContain('Body')
    })

    it('stays open with a head that is no button when it does not fold, and says its words as given', () => {
        const page = draw(
            <Letter
                from={GRACE}
                to={['me']}
                time="09:42"
                attached
                foldable={false}
                words={{ attached: 'Har vedlegg', to: (names) => `til ${names}` }}
            >
                <p>Body</p>
            </Letter>,
        )
        expect(page.querySelector('button')).toBeNull()
        expect(page.textContent).toContain('Body')
        expect(page.textContent).toContain('til me')
        expect(page.querySelector('[aria-label="Har vedlegg"]')).not.toBeNull()
    })
})
