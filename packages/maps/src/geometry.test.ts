import type { FeatureCollection, Polygon } from 'geojson'
import { describe, expect, test } from 'vitest'

import { areaOf, autoTolerance, boundsOfIds, isReadable, simplifyGeometry, simplifyLine } from './geometry'

describe('reading geometry', () => {
    test('draws what has finite positions, lines of two and rings of four', () => {
        expect(isReadable(null)).toBe(true)
        expect(isReadable({ type: 'Point', coordinates: [-11.7, 7.9] })).toBe(true)
        expect(isReadable({ type: 'Point', coordinates: [Number.NaN, 7.9] })).toBe(false)
        expect(isReadable({ type: 'Point', coordinates: [-11.7, 97] })).toBe(false)
        expect(isReadable({ type: 'LineString', coordinates: [[0, 0]] })).toBe(false)
        const ring = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
        ]
        expect(isReadable({ type: 'Polygon', coordinates: [ring] })).toBe(true)
        expect(isReadable({ type: 'Polygon', coordinates: [ring.slice(1)] })).toBe(false)
        expect(isReadable({ type: 'MultiPolygon', coordinates: [[ring], []] })).toBe(false)
        expect(isReadable({ type: 'Circle', coordinates: [0, 0] } as unknown as Polygon)).toBe(false)
    })

    test('frames the features named by id', () => {
        const points: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', id: 'a', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', id: 'b', properties: {}, geometry: { type: 'Point', coordinates: [3, 5] } },
                { type: 'Feature', id: 'c', properties: {}, geometry: { type: 'Point', coordinates: [9, 9] } },
            ],
        }
        expect(boundsOfIds(points, ['a', 'b'])).toEqual([1, 2, 3, 5])
        expect(boundsOfIds(points, ['z'])).toBeNull()
    })
})

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
