import { describe, expect, it } from 'vitest'

import { actualZoom, clampPan, clampZoom, fitScale, maxZoom, onImage, zoomAt } from './ImageLightbox'

describe('fitScale', () => {
    it('shrinks an image larger than the room to fit it whole', () => {
        expect(fitScale({ width: 1600, height: 1200 }, { width: 800, height: 800 })).toBe(0.5)
        expect(fitScale({ width: 1000, height: 2000 }, { width: 800, height: 500 })).toBe(0.25)
    })

    it('never draws an image larger than its own pixels', () => {
        expect(fitScale({ width: 200, height: 100 }, { width: 800, height: 800 })).toBe(1)
    })

    it('reads an image with no size as drawn at its own size', () => {
        expect(fitScale({ width: 0, height: 0 }, { width: 800, height: 800 })).toBe(1)
    })
})

describe('the zoom', () => {
    it('goes four times past the fit, or twice the own pixels when that is more', () => {
        expect(maxZoom(1)).toBe(4)
        expect(maxZoom(0.1)).toBe(20)
    })

    it('is held between the fit and the most', () => {
        expect(clampZoom(0.4, 4)).toBe(1)
        expect(clampZoom(2.5, 4)).toBe(2.5)
        expect(clampZoom(9, 4)).toBe(4)
        expect(clampZoom(Number.NaN, 4)).toBe(1)
    })

    it('goes to the own pixels on a double press, or twice the fit for an image already at them', () => {
        expect(actualZoom(0.25)).toBe(4)
        expect(actualZoom(1)).toBe(2)
    })
})

describe('the pan', () => {
    const drawn = { width: 400, height: 300 }
    const stage = { width: 800, height: 600 }

    it('stays centered while the zoomed image is smaller than the stage', () => {
        expect(clampPan({ x: 50, y: -40 }, drawn, 1.5, stage)).toEqual({ x: 0, y: 0 })
    })

    it('goes no further than the image overflows on each side', () => {
        // At 3x the image is 1200 by 900: 200 over on each side across, 150 down.
        expect(clampPan({ x: 500, y: -500 }, drawn, 3, stage)).toEqual({ x: 200, y: -150 })
        expect(clampPan({ x: -120, y: 90 }, drawn, 3, stage)).toEqual({ x: -120, y: 90 })
    })

    it('keeps the point under the pointer in place as it zooms', () => {
        const at = { x: 100, y: -50 }
        const pan = zoomAt({ x: 0, y: 0 }, at, 1, 2)
        expect(pan).toEqual({ x: -100, y: 50 })
        // The image's point under `at` was at 100 from its middle at 1x; at 2x it is drawn at pan + 2 * 100 = at.
        expect(pan.x + 2 * 100).toBe(at.x)
    })

    it('zooms about the middle without moving it', () => {
        expect(zoomAt({ x: 30, y: 20 }, { x: 0, y: 0 }, 2, 4)).toEqual({ x: 60, y: 40 })
    })
})

describe('onImage', () => {
    it('tells a press on the image from one on the ground around it', () => {
        const drawn = { width: 400, height: 300 }
        expect(onImage({ x: 150, y: 100 }, drawn, { zoom: 1, pan: { x: 0, y: 0 } })).toBe(true)
        expect(onImage({ x: 250, y: 0 }, drawn, { zoom: 1, pan: { x: 0, y: 0 } })).toBe(false)
        expect(onImage({ x: 250, y: 0 }, drawn, { zoom: 2, pan: { x: 0, y: 0 } })).toBe(true)
    })
})
