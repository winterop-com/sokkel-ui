import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson'
import { describe, expect, test } from 'vitest'

import { anchorOf, areaOf, autoTolerance, boundsOfIds, isReadable, kindOf, simplifyGeometry, simplifyLine, splitByKind } from './geometry'

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

const RING = [
    [-13.2, 8.4],
    [-13.0, 8.4],
    [-13.0, 8.6],
    [-13.2, 8.4],
]
const AREA: Polygon = { type: 'Polygon', coordinates: [RING] }
const RIVER: Geometry = {
    type: 'LineString',
    coordinates: [
        [-12.0, 9.0],
        [-11.0, 9.0],
        [-11.0, 8.0],
    ],
}
const TOWN: Geometry = { type: 'Point', coordinates: [-11.74, 7.96] }

describe('splitting geometry by kind', () => {
    test('names what each geometry is drawn as', () => {
        expect(kindOf(AREA)).toBe('area')
        expect(kindOf({ type: 'MultiPolygon', coordinates: [[RING]] })).toBe('area')
        expect(kindOf(RIVER)).toBe('line')
        expect(kindOf({ type: 'MultiLineString', coordinates: [] })).toBe('line')
        expect(kindOf(TOWN)).toBe('point')
        expect(kindOf({ type: 'MultiPoint', coordinates: [] })).toBe('point')
        expect(kindOf({ type: 'GeometryCollection', geometries: [TOWN] })).toBeNull()
        expect(kindOf(null)).toBeNull()
    })

    test('keeps a single geometry as its own one part', () => {
        expect(splitByKind(RIVER)).toEqual([{ kind: 'line', geometry: RIVER }])
        expect(splitByKind(null)).toEqual([])
    })

    test("gathers a collection's members by kind, in drawing order, nested collections included", () => {
        const parts = splitByKind({
            type: 'GeometryCollection',
            geometries: [TOWN, RIVER, { type: 'GeometryCollection', geometries: [AREA] }],
        })
        expect(parts).toEqual([
            { kind: 'area', geometry: AREA },
            { kind: 'line', geometry: RIVER },
            { kind: 'point', geometry: TOWN },
        ])
    })

    test('joins several members of a kind into one multi geometry', () => {
        const parts = splitByKind({
            type: 'GeometryCollection',
            geometries: [
                TOWN,
                {
                    type: 'MultiPoint',
                    coordinates: [
                        [-12.5, 8.1],
                        [-12.6, 8.2],
                    ],
                },
                AREA,
                { type: 'MultiPolygon', coordinates: [[RING]] },
                RIVER,
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [-12.0, 7.5],
                            [-11.5, 7.5],
                        ],
                    ],
                },
            ],
        })
        expect(parts.map((part) => part.kind)).toEqual(['area', 'line', 'point'])
        expect(parts[0].geometry).toEqual({ type: 'MultiPolygon', coordinates: [[RING], [RING]] })
        expect(parts[1].geometry).toEqual({
            type: 'MultiLineString',
            coordinates: [
                (RIVER as { coordinates: number[][] }).coordinates,
                [
                    [-12.0, 7.5],
                    [-11.5, 7.5],
                ],
            ],
        })
        expect(parts[2].geometry).toEqual({
            type: 'MultiPoint',
            coordinates: [
                [-11.74, 7.96],
                [-12.5, 8.1],
                [-12.6, 8.2],
            ],
        })
    })

    test('gives an empty collection no parts', () => {
        expect(splitByKind({ type: 'GeometryCollection', geometries: [] })).toEqual([])
    })
})

describe('anchoring a popup', () => {
    const feature = (geometry: Geometry): Feature => ({ type: 'Feature', properties: {}, geometry })

    test('points halfway along a line, on the line', () => {
        expect(anchorOf(feature(RIVER))).toEqual([-11.0, 9.0])
        const [lng, lat] = anchorOf(
            feature({
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [4, 0],
                ],
            }),
        ) ?? [Number.NaN, Number.NaN]
        expect(lng).toBeCloseTo(2)
        expect(lat).toBeCloseTo(0)
    })

    test('points along the longest part of a multi line', () => {
        expect(
            anchorOf(
                feature({
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [0, 0],
                            [1, 0],
                        ],
                        [
                            [10, 5],
                            [10, 9],
                        ],
                    ],
                }),
            ),
        ).toEqual([10, 7])
    })
})
