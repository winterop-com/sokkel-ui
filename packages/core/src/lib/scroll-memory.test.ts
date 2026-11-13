import { afterEach, describe, expect, it, vi } from 'vitest'

import { holdScroll, keepScroll, recallScroll, rememberScroll } from './scroll-memory'

/** A session storage held in a map. */
function storage() {
    const held = new Map<string, string>()
    return {
        held,
        getItem: (key: string) => held.get(key) ?? null,
        setItem: (key: string, value: string) => void held.set(key, value),
        removeItem: (key: string) => void held.delete(key),
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('scroll memory', () => {
    it('recalls nothing for a place never left', () => {
        expect(recallScroll('never-left')).toBeUndefined()
    })

    it('recalls where a scroller was left this page', () => {
        rememberScroll('albums', { top: 1200, left: 0 })
        expect(recallScroll('albums')).toEqual({ top: 1200, left: 0 })
    })

    it('keeps a place in session storage, so a reload finds it', () => {
        const session = storage()
        vi.stubGlobal('sessionStorage', session)
        rememberScroll('artists', { top: 480, left: 12 })
        keepScroll('artists')
        expect(JSON.parse(session.held.get('scroll.artists') ?? 'null')).toEqual({ top: 480, left: 12 })
        session.held.set('scroll.shelf', JSON.stringify({ top: 90, left: 0 }))
        expect(recallScroll('shelf')).toEqual({ top: 90, left: 0 })
        session.held.set('scroll.broken', '{"top":"far"}')
        expect(recallScroll('broken')).toBeUndefined()
    })

    it('holds a place in memory where session storage is refused', () => {
        vi.stubGlobal('sessionStorage', {
            getItem: () => {
                throw new Error('refused')
            },
            setItem: () => {
                throw new Error('refused')
            },
        })
        rememberScroll('runs', { top: 64, left: 0 })
        expect(() => keepScroll('runs')).not.toThrow()
        expect(recallScroll('runs')).toEqual({ top: 64, left: 0 })
        expect(recallScroll('elsewhere')).toBeUndefined()
    })
})

/** A scroller of fixed height, 600px tall, that scrolls as far as its content reaches, and the listeners on it. */
function scroller(content = 600) {
    const listeners = new Map<string, () => void>()
    const box = {
        content,
        clientHeight: 600,
        top: 0,
        left: 0,
        children: [] as unknown[],
        get scrollHeight() {
            return box.content
        },
        get scrollTop() {
            return box.top
        },
        set scrollTop(value: number) {
            box.top = Math.max(0, Math.min(value, box.content - box.clientHeight))
        },
        get scrollLeft() {
            return box.left
        },
        set scrollLeft(value: number) {
            box.left = Math.max(0, value)
        },
        addEventListener: (type: string, listener: () => void) => void listeners.set(type, listener),
        removeEventListener: (type: string) => void listeners.delete(type),
    }
    return { box, listeners, area: box as unknown as HTMLElement }
}

/** A mutation observer whose changes the test calls, one for the page. */
function mutations() {
    const watching: { callback: () => void; stopped: boolean }[] = []
    class Watcher {
        entry: { callback: () => void; stopped: boolean }
        constructor(callback: () => void) {
            this.entry = { callback, stopped: false }
            watching.push(this.entry)
        }
        observe() {}
        disconnect() {
            this.entry.stopped = true
        }
    }
    vi.stubGlobal('MutationObserver', Watcher)
    return { change: () => watching.filter((one) => !one.stopped).forEach((one) => one.callback()), watching }
}

describe('holding a place while the page loads', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('puts back a place at once when the content is there', () => {
        const { box, area } = scroller(3000)
        const settled = vi.fn()
        holdScroll(area, { top: 1200, left: 0 }, { onSettled: settled })
        expect(box.top).toBe(1200)
        expect(settled).toHaveBeenCalledOnce()
    })

    it('puts back a place in a box of fixed height once content loaded below it reaches it', () => {
        const { change } = mutations()
        const { box, area } = scroller()
        const settled = vi.fn()
        holdScroll(area, { top: 1200, left: 0 }, { onSettled: settled })
        expect(box.top).toBe(0)
        expect(settled).not.toHaveBeenCalled()
        box.content = 1000
        change()
        expect(box.top).toBe(400)
        box.content = 3000
        change()
        expect(box.top).toBe(1200)
        expect(settled).toHaveBeenCalledOnce()
    })

    it('gives up when the person scrolls or the wait runs out', () => {
        vi.useFakeTimers()
        const { change } = mutations()
        const moved = scroller()
        holdScroll(moved.area, { top: 1200, left: 0 })
        moved.listeners.get('wheel')?.()
        moved.box.content = 3000
        change()
        expect(moved.box.top).toBe(0)

        const late = scroller()
        const settled = vi.fn()
        holdScroll(late.area, { top: 1200, left: 0 }, { wait: 5000, onSettled: settled })
        vi.advanceTimersByTime(5000)
        expect(settled).toHaveBeenCalledOnce()
        late.box.content = 3000
        change()
        expect(late.box.top).toBe(0)
    })
})
