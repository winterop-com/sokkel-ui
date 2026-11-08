import { afterEach, describe, expect, it, vi } from 'vitest'

import { keepScroll, recallScroll, rememberScroll } from './scroll-memory'

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
