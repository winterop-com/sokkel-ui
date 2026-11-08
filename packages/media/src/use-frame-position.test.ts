import { describe, expect, it } from 'vitest'

import { drawnPosition } from './use-frame-position'

describe('the position drawn between reports', () => {
    it('is the given one before any frame is read', () => {
        expect(drawnPosition(12, null, true)).toBe(12)
        expect(drawnPosition(12, null, false)).toBe(12)
    })

    it('is the frame read while playing, whatever was reported', () => {
        expect(drawnPosition(12, { at: 12.4, given: 12 }, true)).toBe(12.4)
        expect(drawnPosition(12.25, { at: 12.4, given: 12 }, true)).toBe(12.4)
    })

    it('once paused, holds the last frame until the reported position moves', () => {
        expect(drawnPosition(12, { at: 12.4, given: 12 }, false)).toBe(12.4)
        expect(drawnPosition(40, { at: 12.4, given: 12 }, false)).toBe(40)
    })
})
