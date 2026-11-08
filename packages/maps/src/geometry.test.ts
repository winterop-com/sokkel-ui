import type { FeatureCollection, Polygon } from 'geojson'
import { describe, expect, test } from 'vitest'

import { areaOf, autoTolerance, simplifyGeometry, simplifyLine } from './geometry'

describe('simplifying geometry', () => {
    test('drops points that lie within the tolerance of the line through their neighbors', () => {
        const line = [
            [0, 0],
            [1, 0.01],
            [2, -0.01],
            [3, 0],
            [3, 2],
        ]
        expect(simplifyLine(line, 0.05)).toEqual([
            [0, 0],
            [3, 0],
            [3, 2],
        ])
        expect(simplifyLine(line, 0)).toBe(line)
    })

    test('keeps a ring as it was when simplifying would leave it no area', () => {
        const ring = [
            [0, 0],
            [0.001, 0.001],
            [0, 0.002],
            [0, 0],
        ]
        const polygon: Polygon = { type: 'Polygon', coordinates: [ring] }
        expect(simplifyGeometry(polygon, 1)).toEqual(polygon)
    })

    test('simplifies on its own only past the position budget', () => {
        const square = (size: number): FeatureCollection => ({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [0, 0],
                                [size, 0],
                                [size, size],
                                [0, size],
                                [0, 0],
                            ],
                        ],
                    },
                },
            ],
        })
        expect(autoTolerance(square(10))).toBe(0)
        expect(autoTolerance(square(10), 4)).toBeCloseTo(10 / 5000)
        expect(areaOf(square(10).features[0])).toBe(100)
    })
})
