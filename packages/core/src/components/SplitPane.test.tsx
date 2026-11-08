import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStoredPrefix } from '../lib/stored'
import { SplitPane, clampShare, keepShare, keptShare, parseShare, shareKey } from './SplitPane'

class FakeStorage {
    items = new Map<string, string>()
    getItem(key: string) {
        return this.items.get(key) ?? null
    }
    setItem(key: string, value: string) {
        this.items.set(key, value)
    }
    removeItem(key: string) {
        this.items.delete(key)
    }
}

const BLOCKED = {
    getItem: () => {
        throw new Error('blocked')
    },
    setItem: () => {
        throw new Error('blocked')
    },
    removeItem: () => {
        throw new Error('blocked')
    },
}

let storage: FakeStorage

beforeEach(() => {
    storage = new FakeStorage()
    vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
    vi.unstubAllGlobals()
    setStoredPrefix('')
})

describe('clampShare', () => {
    it('holds a share within its bounds', () => {
        expect(clampShare(0.5, 0.2, 0.8)).toBe(0.5)
        expect(clampShare(0.1, 0.2, 0.8)).toBe(0.2)
        expect(clampShare(0.95, 0.2, 0.8)).toBe(0.8)
    })

    it('holds the bounds themselves within 0 and 1, and a lower bound above the upper one wins', () => {
        expect(clampShare(1.4, -1, 3)).toBe(1)
        expect(clampShare(-0.4, -1, 3)).toBe(0)
        expect(clampShare(0.5, 0.7, 0.3)).toBe(0.7)
    })

    it('gives a share that is not a number the lower bound', () => {
        expect(clampShare(Number.NaN, 0.25, 0.75)).toBe(0.25)
        expect(clampShare(Number.POSITIVE_INFINITY, 0.25, 0.75)).toBe(0.75)
    })
})

describe('the remembered share', () => {
    it('is kept under the app prefix and the split id', () => {
        setStoredPrefix('tidevann.')
        expect(shareKey('mail')).toBe('tidevann.split-pane.mail')
        keepShare('mail', 0.375)
        expect(storage.items.get('tidevann.split-pane.mail')).toBe('0.375')
        expect(keptShare('mail')).toBe(0.375)
    })

    it('is rounded as it is kept, and forgotten with undefined', () => {
        keepShare('query', 1 / 3)
        expect(keptShare('query')).toBe(0.3333)
        keepShare('query', undefined)
        expect(storage.items.has('split-pane.query')).toBe(false)
        expect(keptShare('query')).toBeUndefined()
    })

    it('reads back nothing from a value that is not a share', () => {
        expect(parseShare(null)).toBeUndefined()
        expect(parseShare('')).toBeUndefined()
        expect(parseShare('"wide"')).toBeUndefined()
        expect(parseShare('1.5')).toBeUndefined()
        expect(parseShare('-0.1')).toBeUndefined()
        expect(parseShare('{')).toBeUndefined()
        expect(parseShare('0.42')).toBe(0.42)
    })

    it('is held in memory where storage is refused', () => {
        vi.stubGlobal('localStorage', BLOCKED)
        expect(keptShare('blocked')).toBeUndefined()
        keepShare('blocked', 0.6)
        expect(keptShare('blocked')).toBe(0.6)
        keepShare('blocked', undefined)
        expect(keptShare('blocked')).toBeUndefined()
    })
})

describe('SplitPane', () => {
    it('sizes the first pane by its share, side by side or one over the other', () => {
        const across = renderToStaticMarkup(<SplitPane first="list" second="detail" defaultShare={0.3} />)
        expect(across).toContain('data-direction="across"')
        expect(across).toContain('style="width:30%"')
        const down = renderToStaticMarkup(<SplitPane direction="down" first="program" second="output" />)
        expect(down).toContain('data-direction="down"')
        expect(down).toContain('style="height:50%"')
    })

    it('holds a share given from outside within its bounds', () => {
        expect(renderToStaticMarkup(<SplitPane first="a" second="b" share={0.95} maxShare={0.7} />)).toContain('style="width:70%"')
        expect(renderToStaticMarkup(<SplitPane first="a" second="b" share={0.05} minShare={0.25} />)).toContain('style="width:25%"')
    })
})
