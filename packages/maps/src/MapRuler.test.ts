import { describe, expect, test } from 'vitest'

import { scaleBar } from './MapCoordinates'
import { measure, rulerShape } from './MapRuler'

describe('the ruler', () => {
    test('measures the distance and the bearing from the first point', () => {
        const reading = measure([0, 0], [0, 1])
        expect(reading.meters / 1000).toBeCloseTo(111.2, 1)
        expect(reading.bearing).toBeCloseTo(0, 6)
    })

    test('draws its first point alone until the second is set', () => {
        expect(rulerShape([5, 60], null).features.map((feature) => feature.geometry.type)).toEqual(['Point'])
    })

    test('draws the line along the great circle between its two ends', () => {
        const shape = rulerShape([5, 60], [6, 61])
        expect(shape.features.map((feature) => feature.geometry.type)).toEqual(['LineString', 'Point', 'Point'])
        const line = shape.features[0].geometry
        expect(line.type === 'LineString' && line.coordinates).toHaveLength(49)
    })
})

describe('the scale bar', () => {
    test('takes the longest round length that fits', () => {
        // 100 px span 7.3 km, so 96 px span about 7 km, and 5 km is drawn at 68 px.
        expect(scaleBar(7_300, 100, 'km')).toEqual({ width: 68, text: '5 km' })
        expect(scaleBar(130, 100, 'km')).toEqual({ width: 77, text: '100 m' })
        expect(scaleBar(1852 * 4, 100, 'nmi')).toEqual({ width: 50, text: '2 NM' })
    })

    test('is not drawn without a span', () => {
        expect(scaleBar(0, 100, 'km')).toBeNull()
    })
})
