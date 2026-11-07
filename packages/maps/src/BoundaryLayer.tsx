import type { FeatureCollection } from 'geojson'
import type { LayerSpecification } from 'maplibre-gl'
import { useMemo } from 'react'

import { CLASS_PROPERTY, classColor, hatchImage, prepareData, readValue, state, useGeoJsonLayer, type FeatureAccessor } from './layer'
import { NO_DATA_COLOR, NO_DATA_HATCH, classOf, scaleColors, type ColorScale } from './scale'

export interface BoundaryLayerProps {
    /** Unique among the map's layers. */
    id: string
    /** Polygons and multipolygons. */
    data: FeatureCollection
    /** Colors each area by its value; without one the areas are drawn as plain boundaries. */
    scale?: ColorScale
    /** Where each area's value is read, for the scale. */
    value?: FeatureAccessor
    /** The property a feature's id is read from when it has no `id` of its own. */
    idProperty?: string
    /** The area color without a scale. */
    color?: string
    /** How opaque the whole layer is, from 0 to 1, so tiles under it can show through. */
    opacity?: number
    visible?: boolean
    /** Whether areas answer hover and clicks. */
    interactive?: boolean
}

/**
 * Areas on the map: a choropleth when given a scale and a value, plain boundaries otherwise. An
 * area without a value is hatched. The area under the cursor is outlined, and the selected one is
 * outlined heavier over a halo in the card color.
 */
export function BoundaryLayer({
    id,
    data,
    scale,
    value,
    idProperty,
    color = 'var(--muted-foreground)',
    opacity = 1,
    visible = true,
    interactive = true,
}: BoundaryLayerProps) {
    const prepared = useMemo(
        () =>
            prepareData(data, idProperty, (feature) => {
                if (scale === undefined) return { [CLASS_PROPERTY]: 0 }
                return { [CLASS_PROPERTY]: classOf(scale, value === undefined ? undefined : readValue(feature, value)) ?? -1 }
            }),
        [data, idProperty, scale, value],
    )
    const classes = scale === undefined ? [color] : scaleColors(scale)
    const colors = {
        ...Object.fromEntries(classes.map((css, index) => [`class${index}`, css])),
        line:
            scale === undefined
                ? 'color-mix(in oklab, var(--muted-foreground) 70%, var(--card))'
                : 'color-mix(in oklab, var(--foreground) 22%, var(--card))',
        ink: 'var(--foreground)',
        halo: 'var(--card)',
        noData: NO_DATA_COLOR,
        hatch: NO_DATA_HATCH,
    }
    const plain = scale === undefined

    useGeoJsonLayer({
        id,
        data: prepared,
        colors,
        images: (resolved) => ({ 'wui-no-data': hatchImage(resolved.noData, resolved.hatch) }),
        interactive,
        visible,
        tolerance: 0,
        hitLayers: (source) => [`${source}-fill`, `${source}-no-data`],
        layers: (source, resolved): LayerSpecification[] => {
            const fills = classes.map((_, index) => resolved[`class${index}` as keyof typeof resolved])
            return [
                {
                    id: `${source}-fill`,
                    type: 'fill',
                    source,
                    filter: ['>=', ['get', CLASS_PROPERTY], 0],
                    paint: {
                        'fill-color': classColor(fills, resolved.noData),
                        'fill-opacity': plain
                            ? ['*', ['case', state('selected'), 0.22, state('hover'), 0.16, 0.07], opacity]
                            : 0.88 * opacity,
                    },
                },
                {
                    id: `${source}-no-data`,
                    type: 'fill',
                    source,
                    filter: ['<', ['get', CLASS_PROPERTY], 0],
                    paint: { 'fill-pattern': 'wui-no-data', 'fill-opacity': 0.88 * opacity },
                },
                {
                    id: `${source}-line`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.line, 'line-width': plain ? 1 : 0.8, 'line-opacity': opacity },
                },
                {
                    id: `${source}-halo`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.halo, 'line-width': ['case', state('selected'), 5, 0], 'line-opacity': opacity },
                },
                {
                    id: `${source}-outline`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: {
                        'line-color': resolved.ink,
                        'line-width': ['case', state('selected'), 2.25, state('hover'), 1.25, 0],
                        'line-opacity': ['*', ['case', state('selected'), 1, 0.75], opacity],
                    },
                },
            ]
        },
    })
    return null
}
