// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Markdown } from './Markdown'
import type { MarkdownLinks } from './markdown-view'

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
    root = undefined
    host = undefined
})

function show(content: string, links: MarkdownLinks): HTMLElement {
    const made = document.createElement('div')
    document.body.append(made)
    host = made
    root = createRoot(made)
    act(() => root?.render(<Markdown content={content} links={links} />))
    return made
}

/** Presses a link as a reader would, and says whether the browser was left to follow it. */
function press(link: Element, init: MouseEventInit = {}): boolean {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
    act(() => {
        link.dispatchEvent(event)
    })
    return !event.defaultPrevented
}

const address = (target: string, heading?: string) => `#/page/${encodeURIComponent(target)}${heading === undefined ? '' : `/${heading}`}`

describe('Markdown links with addresses', () => {
    it('gives a link between notes the address href makes, its heading included', () => {
        const page = show('See [[Nightly export]] and [[Nightly export#Steps]].', { onOpen: vi.fn(), href: address })
        const [plain, headed] = page.querySelectorAll('a[data-wiki-link]')
        expect(plain.getAttribute('href')).toBe('#/page/Nightly%20export')
        expect(headed.getAttribute('href')).toBe('#/page/Nightly%20export/Steps')
    })

    it('opens the note on a plain press and leaves a modified or middle press to the browser', () => {
        const onOpen = vi.fn()
        const link = show('See [[Nightly export#Steps]].', { onOpen, href: address }).querySelector('a[data-wiki-link]')!
        expect(press(link)).toBe(false)
        expect(onOpen).toHaveBeenCalledWith('Nightly export', 'Steps')
        for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
            expect(press(link, init), JSON.stringify(init)).toBe(true)
        }
        expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('gives an embed drawn as a framed link the address too', () => {
        const onOpen = vi.fn()
        const link = show('![[Nightly export]]', { onOpen, href: address }).querySelector('[data-embed] a')!
        expect(link.getAttribute('href')).toBe('#/page/Nightly%20export')
        expect(press(link, { metaKey: true })).toBe(true)
        expect(press(link)).toBe(false)
        expect(onOpen).toHaveBeenCalledWith('Nightly export', undefined)
    })

    it('keeps # and opens on every press without an address, or with one that may not be followed', () => {
        for (const href of [undefined, () => undefined, () => 'javascript:alert(1)']) {
            const onOpen = vi.fn()
            const link = show('See [[harbor]].', { onOpen, href }).querySelector('a[data-wiki-link]')!
            expect(link.getAttribute('href')).toBe('#')
            expect(press(link, { metaKey: true })).toBe(false)
            expect(onOpen).toHaveBeenCalledWith('harbor', undefined)
            act(() => root?.unmount())
            host?.remove()
        }
    })
})
