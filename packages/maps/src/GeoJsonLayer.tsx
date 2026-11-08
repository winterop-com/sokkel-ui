import type { Feature, FeatureCollection } from 'geojson'
import type { ExpressionSpecification, FilterSpecification, LayerSpecification } from 'maplibre-gl'
import { useMemo } from 'react'

import { splitByKind, type GeometryKind } from './geometry'
import {
    CLASS_PROPERTY,
    classColor,
    prepareData,
    readValue,
    state,
    useGeoJsonLayer,
    type FeatureAccessor,
    type PreparedData,
} from './layer'
import type { MapLegendEntry } from './MapLegend'
import { HIGHLIGHT_COLOR, NO_DATA_POINT_COLOR, SELECTION_COLOR, classOf, scaleColors, type ColorScale } from './scale'

export type { GeometryKind } from './geometry'
export type { FeatureAccessor, PreparedData } from './layer'

/** The feature property each drawn part stores what it is drawn as under: `area`, `line` or `point`. */
export const KIND_PROPERTY = '__kind'

/** How much of its color an area's fill carries unless told; its outline carries all of it. */
export const GEOJSON_FILL = 0.28

/**
 * A layer's features made ready to draw, each split into one part per kind of geometry it holds
 * (`splitByKind`), every part marked with its kind and its feature's id and class. A feature whose
 * geometry cannot be read is left out and counted.
 */
export function prepareGeoJson(
    data: FeatureCollection,
    { idProperty, scale, value }: { idProperty?: string; scale?: ColorScale; value?: FeatureAccessor } = {},
): PreparedData {
    return prepareData(
        data,
        idProperty,
        (feature) => ({
            [CLASS_PROPERTY]: scale === undefined ? 0 : (classOf(scale, value === undefined ? undefined : readValue(feature, value)) ?? -1),
        }),
        (feature) =>
            splitByKind(feature.geometry).map(({ kind, geometry }): Feature => ({
                ...feature,
                geometry,
                properties: { ...feature.properties, [KIND_PROPERTY]: kind },
            })),
    )
}

/**
 * A legend line keying what a GeoJSON layer draws in one color, as the map paints it: an area as its
 * light fill inside its outline, a line as a stroke, a point as a dot. Give `fill` when the layer is
 * given one.
 */
export function geoJsonEntry(label: string, color: string, kind: GeometryKind = 'area', fill = GEOJSON_FILL): MapLegendEntry {
    if (kind !== 'area') return { label, color, shape: kind }
    return { label, color: `color-mix(in oklab, ${color} ${Math.round(fill * 100)}%, var(--card))`, edge: color, shape: 'area' }
}

export interface GeoJsonLayerProps {
    /** Unique among the map's layers. */
    id: string
    /**
     * Any features: polygons, lines and points, alone or mixed in one collection, their multi forms
     * and geometry collections of them.
     */
    data: FeatureCollection
    /** Colors each feature by its value. */
    scale?: ColorScale
    /** Where each feature's value is read, for the scale: a property's name or a function of the feature. */
    value?: FeatureAccessor
    /** The color of every feature without a scale: any CSS color, a token included. */
    color?: string
    /** The property a feature's id is read from when it has no `id` of its own. */
    idProperty?: string
    /** How much of its color an area's fill carries, from 0 to 1; outlines, lines and points carry all of it. */
    fill?: number
    /** The width of a line, in pixels. */
    lineWidth?: number
    /** The radius of a point, in pixels. */
    radius?: number
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
    /** Whether features answer hover and clicks. */
    interactive?: boolean
    /** The ids of features drawn at the middle emphasis, between the selected one and the rest. */
    highlighted?: readonly string[]
}

const IS: Record<GeometryKind, FilterSpecification> = {
    area: ['==', ['get', KIND_PROPERTY], 'area'],
    line: ['==', ['get', KIND_PROPERTY], 'line'],
    point: ['==', ['get', KIND_PROPERTY], 'point'],
}

/**
 * Any GeoJSON on the map, drawn by its geometry in the theme's colors: polygons as a light fill inside
 * an outline, lines as lines over a casing in the card color, points as circles ringed in it. One
 * collection may mix them, and a geometry collection is drawn part by part as one feature. Every
 * feature takes `color` (the first chart color unless told), or its class color from `scale` by its
 * `value`, and one with no value under a scale is drawn gray.
 *
 * The feature under the cursor grows. The selected feature is drawn in the selection color and the
 * `highlighted` ones in the highlight color: as their own color when the layer has one, and as an
 * area's outline, a line's casing or a point's ring when a scale colors them. Selection, popups, the
 * layer list and the legend work as for the other layers: the map reports the feature chosen, a
 * `MapPopup` points at it (halfway along a line), `visible` and `opacity` follow a `MapLayerList`,
 * and `geoJsonEntry` keys the layer in a `MapLegend` as the map paints it.
 */
export function GeoJsonLayer({
    id,
    data,
    scale,
    value,
    color = 'var(--chart-1)',
    idProperty,
    fill = GEOJSON_FILL,
    lineWidth = 2,
    radius = 5,
    opacity = 1,
    visible = true,
    interactive = true,
    highlighted,
}: GeoJsonLayerProps) {
    const prepared = useMemo(() => prepareGeoJson(data, { idProperty, scale, value }), [data, idProperty, scale, value])
    const plain = scale === undefined
    const classes = plain ? [color] : scaleColors(scale)
    const colors = {
        ...Object.fromEntries(classes.map((css, index) => [`class${index}`, css])),
        noData: NO_DATA_POINT_COLOR,
        card: 'var(--card)',
        selection: SELECTION_COLOR,
        highlight: HIGHLIGHT_COLOR,
    }

    useGeoJsonLayer({
        id,
        data: prepared,
        colors,
        interactive,
        visible,
        highlighted,
        tolerance: 3,
        hitLayers: (source) => [`${source}-circle`, `${source}-line`, `${source}-casing`, `${source}-fill`],
        layers: (source, resolved): LayerSpecification[] => {
            const fills = classes.map((_, index) => resolved[`class${index}` as keyof typeof resolved])
            const own: ExpressionSpecification | string = plain ? fills[0] : classColor(fills, resolved.noData)
            // With one color the emphasis is the feature's own color; under a scale it is the edge around it.
            const emphasized: ExpressionSpecification = [
                'case',
                state('selected'),
                resolved.selection,
                state('highlighted'),
                resolved.highlight,
                own,
            ]
            const edge: ExpressionSpecification | string = plain
                ? resolved.card
                : ['case', state('selected'), resolved.selection, state('highlighted'), resolved.highlight, resolved.card]
            return [
                {
                    id: `${source}-fill`,
                    type: 'fill',
                    source,
                    filter: IS.area,
                    paint: {
                        'fill-color': plain ? emphasized : own,
                        'fill-opacity': ['*', ['case', state('selected'), fill + 0.14, state('hover'), fill + 0.1, fill], opacity],
                    },
                },
                {
                    id: `${source}-halo`,
                    type: 'line',
                    source,
                    filter: IS.area,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.card, 'line-width': ['case', state('selected'), 5, 0], 'line-opacity': opacity },
                },
                {
                    id: `${source}-outline`,
                    type: 'line',
                    source,
                    filter: IS.area,
                    layout: { 'line-join': 'round' },
                    paint: {
                        'line-color': emphasized,
                        'line-width': ['case', state('selected'), 2.5, state('hover'), 2, state('highlighted'), 2, 1.25],
                        'line-opacity': opacity,
                    },
                },
                {
                    id: `${source}-casing`,
                    type: 'line',
                    source,
                    filter: IS.line,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': edge,
                        'line-width': [
                            '+',
                            lineWidth,
                            ['case', state('selected'), 5, state('highlighted'), plain ? 2 : 4, state('hover'), 3, 2],
                        ],
                        'line-opacity': ['*', plain ? 0.85 : ['case', state('selected'), 1, state('highlighted'), 1, 0.85], opacity],
                    },
                },
                {
                    id: `${source}-line`,
                    type: 'line',
                    source,
                    filter: IS.line,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': plain ? emphasized : own,
                        'line-width': ['+', lineWidth, ['case', state('selected'), 1.5, state('hover'), 1, 0]],
                        'line-opacity': opacity,
                    },
                },
                {
                    id: `${source}-circle`,
                    type: 'circle',
                    source,
                    filter: IS.point,
                    paint: {
                        'circle-color': plain ? emphasized : own,
                        'circle-radius': ['+', radius, ['case', state('selected'), 2.5, state('hover'), 1.5, 0]],
                        'circle-opacity': 0.95 * opacity,
                        'circle-stroke-opacity': opacity,
                        'circle-stroke-color': edge,
                        'circle-stroke-width': plain
                            ? ['case', state('selected'), 2, 1.25]
                            : ['case', state('selected'), 2.5, state('highlighted'), 2, 1.25],
                    },
                },
            ]
        },
    })
    return null
}
