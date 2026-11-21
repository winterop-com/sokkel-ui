import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MapView, pitchAtZoom } from './MapView'

describe('MapView on a server', () => {
    it('renders to a string with no document', () => {
        expect(renderToString(<MapView label="Sites" />)).toContain('Sites')
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
