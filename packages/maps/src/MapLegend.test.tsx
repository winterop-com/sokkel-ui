import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LEGEND_COLLAPSE_BELOW, MapLegend, legendNarrow, legendOpen } from './MapLegend'
import { classLabels, sequentialScale } from './scale'

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

    it('writes its classes and the no-data entry in the words it is given', () => {
        const scale = sequentialScale({ breaks: [200, 260] })
        const english = renderToStaticMarkup(<MapLegend title="Rainfall" scale={scale} layout="list" noData />)
        expect(english).toContain('Below 200')
        expect(english).toContain('260 and above')
        expect(english).toContain('No data')
        const words = { below: 'Under', above: 'og over', noData: 'Ingen data' }
        const said = renderToStaticMarkup(<MapLegend title="Rainfall" scale={scale} layout="list" noData words={words} />)
        expect(said).toContain('Under 200')
        expect(said).toContain('260 og over')
        expect(said).toContain('Ingen data')
        expect(classLabels(sequentialScale({ breaks: [] }), { all: 'Alle verdier' })).toEqual(['Alle verdier'])
    })
})
