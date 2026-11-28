import { describe, expect, it } from 'vitest'

import { followRegion } from './VideoFollow'

describe('followRegion', () => {
    it('holds room times the larger side, centered on the box', () => {
        const region = followRegion({ x: 0.4, y: 0.4, w: 0.1, h: 0.2 }, 3)
        expect(region.w).toBeCloseTo(0.6)
        expect(region.x).toBeCloseTo(0.15)
        expect(region.y).toBeCloseTo(0.2)
    })

    it('comes no closer than a fifth of the picture, and stays inside it', () => {
        expect(followRegion({ x: 0.98, y: 0, w: 0.01, h: 0.01 }, 3)).toEqual({ x: 0.8, y: 0, w: 0.2, h: 0.2 })
    })

    it('is the whole picture for a box too large to come in on', () => {
        expect(followRegion({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, 3)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
    })
})
