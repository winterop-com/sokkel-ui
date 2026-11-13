import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore, parseStored, readStored, setStoredPrefix, storedKey, subscribeStored, writeStored } from './stored'

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

describe('stored values', () => {
    it('keep text in localStorage and remove it with null', () => {
        writeStored('panel', '320')
        expect(storage.items.get('panel')).toBe('320')
        expect(readStored('panel')).toBe('320')
        writeStored('panel', null)
        expect(readStored('panel')).toBeNull()
    })

    it('hold a value in memory while storage refuses it, and let it go once storage works', () => {
        vi.stubGlobal('localStorage', BLOCKED)
        writeStored('tab', '"runs"')
        expect(readStored('tab')).toBe('"runs"')
        vi.stubGlobal('localStorage', storage)
        writeStored('tab', '"jobs"')
        expect(storage.items.get('tab')).toBe('"jobs"')
        expect(readStored('tab')).toBe('"jobs"')
    })

    it('hold a value in memory when there is no storage at all', () => {
        vi.stubGlobal('localStorage', undefined)
        expect(readStored('gone')).toBeNull()
        writeStored('gone', '1')
        expect(readStored('gone')).toBe('1')
        vi.stubGlobal('localStorage', storage)
        writeStored('gone', null)
    })

    it('tell the listeners of a key when it is written', () => {
        const heard = vi.fn()
        const other = vi.fn()
        const stop = subscribeStored('folded', heard)
        const stopOther = subscribeStored('width', other)
        writeStored('folded', 'true')
        expect(heard).toHaveBeenCalledTimes(1)
        expect(other).not.toHaveBeenCalled()
        stop()
        writeStored('folded', 'false')
        expect(heard).toHaveBeenCalledTimes(1)
        stopOther()
    })

    it('take the app prefix unless the key gives its own', () => {
        expect(storedKey('width')).toBe('width')
        setStoredPrefix('tidevann.')
        expect(storedKey('width')).toBe('tidevann.width')
        expect(storedKey('width', 'harbor:')).toBe('harbor:width')
        expect(storedKey('width', '')).toBe('width')
    })

    it('read back JSON, or the fallback when there is none, it does not parse or the check refuses it', () => {
        expect(parseStored('{"open":true}', { open: false })).toEqual({ open: true })
        expect(parseStored(null, 4)).toBe(4)
        expect(parseStored('not json', 'runs')).toBe('runs')
        const volume = (value: unknown) => typeof value === 'number' && value >= 0 && value <= 1
        expect(parseStored('"loud"', 0.5, volume)).toBe(0.5)
        expect(parseStored('0.8', 0.5, volume)).toBe(0.8)
    })
    it('read back a value the check lets through as normalize repairs it, and never normalize a refused one', () => {
        const isNumber = (value: unknown) => typeof value === 'number'
        const clamp = vi.fn((width: number) => Math.min(Math.max(width, 200), 640))
        expect(parseStored('900', 320, isNumber, clamp)).toBe(640)
        expect(parseStored('120', 320, isNumber, clamp)).toBe(200)
        expect(parseStored('480', 320, isNumber, clamp)).toBe(480)
        clamp.mockClear()
        expect(parseStored('"wide"', 320, isNumber, clamp)).toBe(320)
        expect(parseStored(null, 320, isNumber, clamp)).toBe(320)
        expect(parseStored('{', 320, isNumber, clamp)).toBe(320)
        expect(clamp).not.toHaveBeenCalled()
        expect(parseStored('["api","gone"]', [], undefined, (list: string[]) => list.filter((name) => name !== 'gone'))).toEqual(['api'])
    })
})

describe('stores', () => {
    it('hold a value, tell their listeners of a change, and not of the same value again', () => {
        const store = createStore({ folded: false })
        const heard = vi.fn()
        const stop = store.subscribe(heard)
        const first = store.get()
        expect(store.get()).toBe(first)
        store.update((current) => ({ folded: !current.folded }))
        expect(store.get()).toEqual({ folded: true })
        const now = store.get()
        store.set(now)
        expect(heard).toHaveBeenCalledTimes(1)
        stop()
    })

    it('let a listener stop itself without skipping the next', () => {
        const store = createStore(0)
        const order: string[] = []
        const stopFirst = store.subscribe(() => {
            order.push('first')
            stopFirst()
        })
        store.subscribe(() => order.push('second'))
        store.set(1)
        expect(order).toEqual(['first', 'second'])
    })

    it('keep a value under its key, read it back, and follow a write to the key elsewhere', () => {
        setStoredPrefix('tidevann.')
        storage.items.set('tidevann.volume', '0.3')
        const store = createStore(1, { key: 'volume', check: (value) => typeof value === 'number' })
        expect(store.get()).toBe(0.3)
        store.set(0.6)
        expect(storage.items.get('tidevann.volume')).toBe('0.6')
        const heard = vi.fn()
        const stop = store.subscribe(heard)
        writeStored('tidevann.volume', '0.9')
        expect(store.get()).toBe(0.9)
        expect(heard).toHaveBeenCalledTimes(1)
        writeStored('tidevann.volume', '"loud"')
        expect(store.get()).toBe(1)
        stop()
    })

    it('clamp a kept value with normalize, on load and on a write elsewhere, leaving what is kept as it was', () => {
        storage.items.set('panel-width', '900')
        const store = createStore(320, {
            key: 'panel-width',
            check: (value) => typeof value === 'number',
            normalize: (width) => Math.min(width, 640),
        })
        expect(store.get()).toBe(640)
        expect(storage.items.get('panel-width')).toBe('900')
        const stop = store.subscribe(() => undefined)
        writeStored('panel-width', '1200')
        expect(store.get()).toBe(640)
        writeStored('panel-width', '400')
        expect(store.get()).toBe(400)
        stop()
    })

    it('without a key, keep nothing', () => {
        const store = createStore('runs')
        store.set('jobs')
        expect(storage.items.size).toBe(0)
    })
})
