import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { awaitHeading, focusHeading, headingMarks } from './Shell'

/** A heading as much as the helpers touch: whether it shows, its words, its tab index, focus and blur. */
function heading({
    tabindex,
    shown = true,
    hiddenBy = false,
    text = 'nightly-export',
}: { tabindex?: string; shown?: boolean; hiddenBy?: boolean; text?: string } = {}) {
    const attributes = new Map<string, string>(tabindex === undefined ? [] : [['tabindex', tabindex]])
    const blurs: (() => void)[] = []
    const node = {
        focused: false,
        shown,
        textContent: text,
        set tabIndex(value: number) {
            attributes.set('tabindex', String(value))
        },
        getClientRects: () => ({ length: node.shown ? 1 : 0 }),
        closest: () => (hiddenBy ? {} : null),
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

/** A page's area holding `headings` as its `h1`s, in order. */
const area = (...headings: unknown[]) =>
    ({ querySelectorAll: (selector: string) => (selector === 'h1' ? headings : []) }) as unknown as HTMLElement

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
        const h1 = heading({ tabindex: '0' })
        focusHeading(area(h1))
        h1.blur()
        expect(h1.attributes.get('tabindex')).toBe('0')
    })

    it('does nothing for a page without a heading, or before the page area is there', () => {
        expect(focusHeading(area())).toBe(false)
        expect(focusHeading(null)).toBe(false)
    })
})

describe('focusHeading’s choice', () => {
    it('passes over a heading not laid out, or inside an inert or aria-hidden part', () => {
        const hidden = heading({ shown: false })
        const inert = heading({ hiddenBy: true })
        const shown = heading()
        expect(focusHeading(area(hidden, inert))).toBe(false)
        expect(focusHeading(area(hidden, inert, shown))).toBe(true)
        expect([hidden.focused, inert.focused, shown.focused]).toEqual([false, false, true])
    })

    it('passes over the headings shown before the route changed, unless their words changed', () => {
        const old = heading({ text: 'nightly-export' })
        const before = headingMarks(area(old))
        expect(focusHeading(area(old), before)).toBe(false)
        old.textContent = 'sync-inventory'
        expect(focusHeading(area(old), before)).toBe(true)
    })
})

describe('awaitHeading', () => {
    let listeners: Map<string, { listener: () => void; signal: AbortSignal }>

    beforeEach(() => {
        vi.useFakeTimers()
        listeners = new Map()
        vi.stubGlobal('addEventListener', (type: string, listener: () => void, options: { signal: AbortSignal }) =>
            listeners.set(type, { listener, signal: options.signal }),
        )
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    /** The page drawing on for a moment, as the waiter looks again. */
    const later = () => vi.advanceTimersByTime(50)
    const press = (type: string) => {
        const entry = listeners.get(type)
        if (entry && !entry.signal.aborted) entry.listener()
    }

    it('focuses a heading already shown at once, and stops looking', () => {
        const h1 = heading()
        awaitHeading(area(h1))
        expect(h1.focused).toBe(true)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('waits for a page still loading, then focuses its heading as it shows', () => {
        const h1 = heading({ shown: false })
        awaitHeading(area(h1))
        later()
        expect(h1.focused).toBe(false)
        h1.shown = true
        later()
        expect(h1.focused).toBe(true)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('never takes the page before’s heading, still shown, for the new one’s', () => {
        const old = heading({ text: 'nightly-export' })
        const next = heading({ shown: false, text: 'sync-inventory' })
        awaitHeading(area(old, next), headingMarks(area(old)))
        later()
        expect(old.focused).toBe(false)
        next.shown = true
        later()
        expect(next.focused).toBe(true)
        expect(old.focused).toBe(false)
    })

    it('gives up after the wait', () => {
        const h1 = heading({ shown: false })
        awaitHeading(area(h1), undefined, 3000)
        vi.advanceTimersByTime(3100)
        expect(vi.getTimerCount()).toBe(0)
        h1.shown = true
        later()
        expect(h1.focused).toBe(false)
    })

    it('gives up as the reader presses a key or the pointer', () => {
        for (const type of ['keydown', 'pointerdown']) {
            const h1 = heading({ shown: false })
            awaitHeading(area(h1))
            press(type)
            h1.shown = true
            later()
            expect(h1.focused).toBe(false)
        }
    })

    it('stops when told to, as when the route changes again', () => {
        const h1 = heading({ shown: false })
        const stop = awaitHeading(area(h1))
        stop()
        h1.shown = true
        later()
        expect(h1.focused).toBe(false)
    })
})
