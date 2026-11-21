import { describe, expect, test } from 'vitest'

import { GLOBE_STATE, MORPH_PROJECTION, globeRadius, globeShare, globeZoom, haloShadow, starfieldPosition, starlight } from './globe'

describe('the globe as the map is zoomed', () => {
    test('is whole up to zoom 11 and flat from 12, where the ground is drawn flat', () => {
        expect(globeShare(2)).toBe(1)
        expect(globeShare(11)).toBe(1)
        expect(globeShare(11.5)).toBeCloseTo(0.5)
        expect(globeShare(12)).toBe(0)
        expect(globeShare(16)).toBe(0)
    })

    test('reads how far it is a globe from the style, flat at 0 and the globe at 1', () => {
        expect(MORPH_PROJECTION.type).toEqual([
            'interpolate',
            ['linear'],
            ['global-state', GLOBE_STATE],
            0,
            'mercator',
            1,
            'vertical-perspective',
        ])
    })

    test('dims its stars as it grows, until it fills the view', () => {
        expect(starlight(1)).toBe(1)
        expect(starlight(2)).toBe(1)
        expect(starlight(3.25)).toBeCloseTo(0.5)
        expect(starlight(4.5)).toBe(0)
        expect(starlight(9)).toBe(0)
    })
})

describe('the globe on the screen', () => {
    test('is drawn at the radius its sphere shows from where the camera stands', () => {
        // Zoom 1.8 over latitude 30 on a canvas 780 pixels tall: a sphere of 328 pixels seen from 1170 away.
        expect(globeRadius(1.8, 30, 780)).toBeCloseTo(262.4, 0)
    })

    test('grows with the zoom, and toward the poles, where the engine draws the sphere larger', () => {
        expect(globeRadius(3, 0, 800)).toBeGreaterThan(globeRadius(2, 0, 800))
        expect(globeRadius(2, 60, 800)).toBeGreaterThan(globeRadius(2, 0, 800))
    })

    test('has a zoom for every radius: the one it is drawn at that radius at', () => {
        for (const [zoom, latitude, height] of [
            [0.5, 0, 600],
            [1.8, 30, 780],
            [3.2, -62, 900],
        ]) {
            expect(globeZoom(globeRadius(zoom, latitude, height), latitude, height)).toBeCloseTo(zoom, 6)
        }
    })

    test('glows round its rim in two bands that grow with it', () => {
        const small = haloShadow(100, 'var(--chart-2)')
        expect(small).toBe(
            '0 0 11.0px 1.2px color-mix(in oklab, var(--chart-2) 62%, transparent), 0 0 50.0px 5.0px color-mix(in oklab, var(--chart-2) 16%, transparent)',
        )
        expect(haloShadow(200, 'var(--chart-2)')).toContain('0 0 22.0px 2.4px')
    })
})

describe('the stars behind the globe', () => {
    test('stand still over the middle of the map', () => {
        expect(starfieldPosition([0, 0])).toBe('0.0px 0.0px, 0.0px 0.0px')
    })

    test('drift against the turn, the sparse layer twice as far as the dense one', () => {
        expect(starfieldPosition([90, 45])).toBe('-256.0px 128.0px, -128.0px 64.0px')
    })

    test('come round to where they began after a whole turn, each layer by its own tile', () => {
        const offsets = (lng: number) =>
            starfieldPosition([lng, 0])
                .split(', ')
                .map((layer) => parseFloat(layer))
        const [sparseWest, denseWest] = offsets(-180)
        const [sparseEast, denseEast] = offsets(180)
        expect(sparseWest - sparseEast).toBe(1024)
        expect(denseWest - denseEast).toBe(512)
    })
})
