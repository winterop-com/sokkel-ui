import type { FeatureCollection } from 'geojson'
import { describe, expect, test } from 'vitest'

import { ID_PROPERTY } from './context'
import { KIND_PROPERTY, geoJsonEntry, prepareGeoJson } from './GeoJsonLayer'
import { CLASS_PROPERTY } from './layer'
import { categoricalScale } from './scale'

const MIXED: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'park',
            properties: { kind: 'park' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-11.0, 7.4],
                        [-10.8, 7.4],
                        [-10.8, 7.6],
                        [-11.0, 7.4],
                    ],
                ],
            },
        },
        {
            type: 'Feature',
            properties: { kind: 'river' },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [-12.0, 9.0],
                    [-11.0, 8.5],
                ],
            },
        },
        {
            type: 'Feature',
            id: 'crossing',
            properties: { kind: 'ferry' },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [-12.2, 8.3] },
                    {
                        type: 'LineString',
                        coordinates: [
                            [-12.2, 8.3],
                            [-12.3, 8.4],
                        ],
                    },
                ],
            },
        },
        { type: 'Feature', id: 'nowhere', properties: { kind: 'town' }, geometry: { type: 'Point', coordinates: [Number.NaN, 8] } },
    ],
}

describe('a GeoJSON layer', () => {
    test('draws each feature as one part per kind of geometry, marked with its kind and its id', () => {
        const prepared = prepareGeoJson(MIXED)
        const drawn = prepared.collection.features.map((feature) => [
            feature.properties?.[ID_PROPERTY],
            feature.properties?.[KIND_PROPERTY],
        ])
        expect(drawn).toEqual([
            ['park', 'area'],
            ['#1', 'line'],
            ['crossing', 'line'],
            ['crossing', 'point'],
        ])
        expect(prepared.byId.get('crossing')).toBe(MIXED.features[2])
        expect(prepared.unreadable).toBe(1)
    })

    test('classes every part by its feature, and a feature without a value as no data', () => {
        const scale = categoricalScale([
            { value: 'park', label: 'Parks' },
            { value: 'river', label: 'Rivers' },
        ])
        const classes = prepareGeoJson(MIXED, { scale, value: 'kind' }).collection.features.map(
            (feature) => feature.properties?.[CLASS_PROPERTY],
        )
        expect(classes).toEqual([0, 1, -1, -1])
    })

    test('keys an area by its light fill inside its outline, and a line or a point by its color', () => {
        expect(geoJsonEntry('Parks', 'var(--chart-3)')).toEqual({
            label: 'Parks',
            color: 'color-mix(in oklab, var(--chart-3) 28%, var(--card))',
            edge: 'var(--chart-3)',
            shape: 'area',
        })
        expect(geoJsonEntry('Parks', 'var(--chart-3)', 'area', 0.5).color).toBe('color-mix(in oklab, var(--chart-3) 50%, var(--card))')
        expect(geoJsonEntry('Rivers', 'var(--chart-2)', 'line')).toEqual({ label: 'Rivers', color: 'var(--chart-2)', shape: 'line' })
        expect(geoJsonEntry('Towns', 'var(--chart-1)', 'point')).toEqual({ label: 'Towns', color: 'var(--chart-1)', shape: 'point' })
    })
})
