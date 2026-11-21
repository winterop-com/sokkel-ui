import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DARK_BASEMAP, LIGHT_BASEMAP } from './basemap'
import { MapView, pitchAtZoom } from './MapView'

describe('MapView on a server', () => {
    it('renders to a string with no document', () => {
        expect(renderToString(<MapView label="Sites" />)).toContain('Sites')
    })

    it('wears the dark scheme over a dark basemap in the light scheme, in the theme the page wears', () => {
        const root = (html: string) => /<div [^>]*data-map-view=""[^>]*>/.exec(html)?.[0] ?? ''
        const classes = (html: string) => (/class="([^"]*)"/.exec(root(html))?.[1] ?? '').split(' ')
        const dark = renderToString(<MapView label="Sites" basemap={DARK_BASEMAP} />)
        expect(classes(dark)).toContain('dark')
        expect(root(dark)).toContain('data-theme-scope="tidevann"')
        const light = renderToString(<MapView label="Sites" basemap={LIGHT_BASEMAP} />)
        expect(classes(light)).not.toContain('dark')
        expect(root(light)).not.toContain('data-theme-scope')
    })

    it('renders with its camera options, which only a drawn map reads', () => {
        expect(renderToString(<MapView label="Sites" projection="globe" flyToSelected pitchWithZoom momentum={false} />)).toContain('Sites')
    })
})

describe('a map that leans as it is zoomed in', () => {
    const lean = { from: 10, to: 14, pitch: 45 }

    it('is level up to the zoom it starts to lean at', () => {
        expect(pitchAtZoom(3, lean)).toBe(0)
        expect(pitchAtZoom(10, lean)).toBe(0)
    })

    it('leans all the way from the zoom it ends at', () => {
        expect(pitchAtZoom(14, lean)).toBe(45)
        expect(pitchAtZoom(19, lean)).toBe(45)
    })

    it('eases in and out between, half way at the middle', () => {
        expect(pitchAtZoom(12, lean)).toBeCloseTo(22.5)
        expect(pitchAtZoom(11, lean)).toBeLessThan(45 / 4)
        expect(pitchAtZoom(13, lean)).toBeGreaterThan((45 * 3) / 4)
    })

    it('steps where the two zooms are one', () => {
        expect(pitchAtZoom(11.9, { from: 12, to: 12, pitch: 30 })).toBe(0)
        expect(pitchAtZoom(12, { from: 12, to: 12, pitch: 30 })).toBe(30)
    })
})
