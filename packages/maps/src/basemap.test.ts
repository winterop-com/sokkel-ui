import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'

import { composeStyle, DARK_BASEMAP, darkGround, inksLabels, LIGHT_BASEMAP, SATELLITE_BASEMAP, STREETS_BASEMAP } from './basemap'

const STYLE: StyleSpecification = {
    version: 8,
    glyphs: 'https://example.org/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#111' } },
        {
            id: 'place_city',
            type: 'symbol',
            source: 'openmaptiles',
            layout: { 'text-field': '{name}' },
            paint: { 'text-color': '#ccc', 'text-halo-color': '#000' },
        },
    ],
}

const place = (style: StyleSpecification) => style.layers.find((layer) => layer.id === 'place_city') as { paint: Record<string, unknown> }

describe('place names over a basemap', () => {
    it('are inked in the tokens when the basemap is as dark as the scheme', () => {
        const drawn = composeStyle(STYLE, undefined, { ground: 'white', ink: 'black', opacity: 1, visible: true, inked: true })
        expect(place(drawn).paint['text-color']).toBe('black')
        expect(place(drawn).paint['text-halo-color']).toBe('white')
    })

    it("keep the basemap's own colors when it is darker or lighter than the scheme", () => {
        const drawn = composeStyle(STYLE, undefined, { ground: 'white', ink: 'black', opacity: 1, visible: true, inked: false })
        expect(place(drawn).paint['text-color']).toBe('#ccc')
        expect(place(drawn).paint['text-halo-color']).toBe('#000')
    })

    it('follow the basemap tone against the scheme, for every basemap the library offers', () => {
        expect(inksLabels(DARK_BASEMAP, true)).toBe(true)
        expect(inksLabels(DARK_BASEMAP, false)).toBe(false)
        expect(inksLabels(LIGHT_BASEMAP, false)).toBe(true)
        expect(inksLabels(LIGHT_BASEMAP, true)).toBe(false)
        expect(inksLabels(STREETS_BASEMAP, false)).toBe(true)
        expect(inksLabels(STREETS_BASEMAP, true)).toBe(false)
        expect(inksLabels(SATELLITE_BASEMAP, true)).toBe(true)
        expect(inksLabels({ id: 'custom', name: 'Custom', style: 'https://example.org/style.json' }, false)).toBe(true)
        expect(inksLabels({ id: 'custom', name: 'Custom', style: 'https://example.org/style.json' }, true)).toBe(true)
    })
})

describe('the scheme over a basemap', () => {
    it('is dark over a dark basemap in the light scheme, and the page scheme otherwise', () => {
        expect(darkGround(DARK_BASEMAP, false)).toBe(true)
        expect(darkGround(SATELLITE_BASEMAP, false)).toBe(true)
        expect(darkGround(DARK_BASEMAP, true)).toBe(false)
        expect(darkGround(LIGHT_BASEMAP, false)).toBe(false)
        expect(darkGround(STREETS_BASEMAP, true)).toBe(false)
        expect(darkGround({ id: 'custom', name: 'Custom', style: 'https://example.org/style.json' }, false)).toBe(false)
    })
})
