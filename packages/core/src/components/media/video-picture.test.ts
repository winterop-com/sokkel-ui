import { describe, expect, it } from 'vitest'

import { containedRect, viewTransform } from './video-picture'

const ROOM = { width: 800, height: 450 }

describe('containedRect', () => {
    it('fills a room of the same shape', () => {
        expect(containedRect(ROOM, { width: 1600, height: 900 })).toEqual({ left: 0, top: 0, width: 800, height: 450 })
    })

    it('leaves bars at the sides of a taller picture', () => {
        expect(containedRect(ROOM, { width: 900, height: 900 })).toEqual({ left: 175, top: 0, width: 450, height: 450 })
    })

    it('is the whole room before the picture has a size', () => {
        expect(containedRect(ROOM, { width: 0, height: 0 })).toEqual({ left: 0, top: 0, width: 800, height: 450 })
    })
})

describe('viewTransform', () => {
    const picture = { left: 0, top: 0, width: 800, height: 450 }

    it('fills the room with a quarter of the picture around its middle', () => {
        expect(viewTransform(ROOM, picture, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 })).toBe('translate(-400px, -225px) scale(2)')
    })

    it('holds the picture against an edge rather than leave it bare', () => {
        expect(viewTransform(ROOM, picture, { x: 0, y: 0, w: 0.5, h: 0.5 })).toBe('translate(0px, 0px) scale(2)')
        expect(viewTransform(ROOM, picture, { x: 0.6, y: 0.6, w: 0.5, h: 0.5 })).toBe('translate(-800px, -450px) scale(2)')
    })

    it('never scales below the whole picture', () => {
        expect(viewTransform(ROOM, picture, { x: 0, y: 0, w: 1, h: 1 })).toBe('translate(0px, 0px) scale(1)')
    })

    it('keeps a barred picture centered on the axis it does not fill', () => {
        const barred = { left: 175, top: 0, width: 450, height: 450 }
        expect(viewTransform(ROOM, barred, { x: 0, y: 0, w: 1, h: 1 })).toBe('translate(0px, 0px) scale(1)')
    })
})
