import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LEGEND_COLLAPSE_BELOW, MapLegend, legendNarrow, legendOpen } from './MapLegend'

describe('legendOpen', () => {
    it('is open on a wide map, and on a narrow one only once opened', () => {
        expect(legendOpen(1200, LEGEND_COLLAPSE_BELOW, false)).toBe(true)
        expect(legendOpen(358, LEGEND_COLLAPSE_BELOW, false)).toBe(false)
        expect(legendOpen(358, LEGEND_COLLAPSE_BELOW, true)).toBe(true)
    })

    it('is open before the map is measured, and at any width without a collapse width', () => {
        expect(legendOpen(null, LEGEND_COLLAPSE_BELOW, false)).toBe(true)
        expect(legendOpen(200, false, false)).toBe(true)
        expect(legendNarrow(200, false)).toBe(false)
    })
})

describe('MapLegend', () => {
    it('draws open, with no collapse button, outside a map', () => {
        const html = renderToStaticMarkup(<MapLegend title="Sites" entries={[{ label: 'Operational', color: 'var(--good)' }]} />)
        expect(html).toContain('Sites')
        expect(html).toContain('Operational')
        expect(html).not.toContain('aria-expanded')
    })
})
