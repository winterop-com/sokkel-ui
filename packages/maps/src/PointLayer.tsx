import type { FeatureCollection, Point } from 'geojson'
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMapContext } from './context'
import { CLASS_PROPERTY, classColor, prepareData, readValue, state, useGeoJsonLayer, type FeatureAccessor } from './layer'
import { NO_DATA_POINT_COLOR, classOf, scaleColors, type ColorScale } from './scale'

/** The feature property a layer stores each point's size value under. */
const SIZE_PROPERTY = '__size'

/** Sizes points by a value: the value's domain, and the radii its two ends are drawn at. */
export interface PointSize {
    value: FeatureAccessor
    domain: [number, number]
    /** Radii in pixels; area grows with the value. */
    range?: [number, number]
}

export interface PointLayerProps {
    /** Unique among the map's layers. */
    id: string
    /** Points. */
    data: FeatureCollection
    /** Colors each point by its value. */
    scale?: ColorScale
    /** Where each point's value is read, for the scale. */
    value?: FeatureAccessor
    /** The point color without a scale. */
    color?: string
    /** The radius in pixels when points are not sized by a value. */
    radius?: number
    size?: PointSize
    /** Gathers nearby points into counted clusters, which zoom in when clicked. Read once. */
    cluster?: boolean | { radius?: number; maxZoom?: number }
    /** The property a feature's id is read from when it has no `id` of its own. */
    idProperty?: string
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
    /** Whether points answer hover and clicks. */
    interactive?: boolean
}

interface ClusterLabel {
    id: number
    x: number
    y: number
    count: number
}

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Points on the map, as circles colored by a scale or one color and sized by a value or one
 * radius, each ringed in the card color so neighbors stay apart. Clustered points gather into
 * circles carrying their count.
 */
export function PointLayer({
    id,
    data,
    scale,
    value,
    color = 'var(--chart-2)',
    radius = 5,
    size,
    cluster = false,
    idProperty,
    opacity = 1,
    visible = true,
    interactive = true,
}: PointLayerProps) {
    const { map, overlay } = useMapContext()
    const prepared = useMemo(
        () =>
            prepareData(data, idProperty, (feature) => {
                const sized = size === undefined ? undefined : readValue(feature, size.value)
                return {
                    [CLASS_PROPERTY]:
                        scale === undefined ? 0 : (classOf(scale, value === undefined ? undefined : readValue(feature, value)) ?? -1),
                    [SIZE_PROPERTY]: typeof sized === 'number' ? sized : null,
                }
            }),
        [data, idProperty, scale, value, size],
    )
    const classes = scale === undefined ? [color] : scaleColors(scale)
    const clusterOptions = cluster === false ? undefined : cluster === true ? {} : cluster
    const colors = {
        ...Object.fromEntries(classes.map((css, index) => [`class${index}`, css])),
        noData: NO_DATA_POINT_COLOR,
        ink: 'var(--foreground)',
        ring: 'var(--card)',
        cluster: 'color-mix(in oklab, var(--foreground) 78%, var(--card))',
    }

    const base: ExpressionSpecification | number =
        size === undefined
            ? radius
            : [
                  'interpolate',
                  ['linear'],
                  ['sqrt', ['max', ['to-number', ['get', SIZE_PROPERTY], 0], 0]],
                  Math.sqrt(Math.max(size.domain[0], 0)),
                  size.range?.[0] ?? 3,
                  Math.sqrt(Math.max(size.domain[1], 0)),
                  size.range?.[1] ?? 14,
              ]

    const { source } = useGeoJsonLayer({
        id,
        data: prepared,
        source:
            clusterOptions === undefined
                ? undefined
                : { cluster: true, clusterRadius: clusterOptions.radius ?? 40, clusterMaxZoom: clusterOptions.maxZoom ?? 11 },
        colors,
        interactive,
        visible,
        tolerance: 4,
        hitLayers: (source) => [`${source}-circle`, `${source}-cluster`],
        click: (feature, source) => {
            const clusterId: unknown = feature.properties['cluster_id']
            if (typeof clusterId !== 'number' || feature.geometry.type !== 'Point') return false
            const center = feature.geometry.coordinates as [number, number]
            void (map.getSource(source) as GeoJSONSource)
                .getClusterExpansionZoom(clusterId)
                .then((zoom) => map.easeTo({ center, zoom, duration: 400 }))
            return true
        },
        layers: (source, resolved): LayerSpecification[] => {
            const fills = classes.map((_, index) => resolved[`class${index}` as keyof typeof resolved])
            const layers: LayerSpecification[] = [
                {
                    id: `${source}-circle`,
                    type: 'circle',
                    source,
                    filter: ['!', ['has', 'point_count']],
                    layout: { 'circle-sort-key': ['-', 0, ['to-number', ['get', SIZE_PROPERTY], 0]] },
                    paint: {
                        'circle-color': classColor(fills, resolved.noData),
                        'circle-radius': ['+', base, ['case', state('selected'), 2.5, state('hover'), 1.5, 0]],
                        'circle-opacity': 0.95 * opacity,
                        'circle-stroke-opacity': opacity,
                        'circle-stroke-color': ['case', state('selected'), resolved.ink, resolved.ring],
                        'circle-stroke-width': ['case', state('selected'), 2, 1.25],
                    },
                },
            ]
            if (clusterOptions !== undefined) {
                layers.push({
                    id: `${source}-cluster`,
                    type: 'circle',
                    source,
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': resolved.cluster,
                        'circle-radius': ['step', ['get', 'point_count'], 11, 10, 14, 50, 17, 150, 21],
                        'circle-stroke-color': resolved.ring,
                        'circle-stroke-width': 2,
                        'circle-opacity': opacity,
                        'circle-stroke-opacity': opacity,
                    },
                })
            }
            return layers
        },
    })

    const [labels, setLabels] = useState<ClusterLabel[]>([])
    const clustered = clusterOptions !== undefined
    useEffect(() => {
        if (!clustered) return
        const layer = `${source}-cluster`
        let frame = 0
        const measure = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                if (map.getLayer(layer) === undefined) return
                const seen = new Map<number, ClusterLabel>()
                for (const feature of map.queryRenderedFeatures({ layers: [layer] })) {
                    const clusterId: unknown = feature.properties['cluster_id']
                    const count: unknown = feature.properties['point_count']
                    if (typeof clusterId !== 'number' || typeof count !== 'number' || seen.has(clusterId)) continue
                    const [lng, lat] = (feature.geometry as Point).coordinates
                    const point = map.project([lng, lat])
                    seen.set(clusterId, { id: clusterId, x: Math.round(point.x), y: Math.round(point.y), count })
                }
                const next = [...seen.values()].sort((a, b) => a.id - b.id)
                setLabels((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))
            })
        }
        measure()
        map.on('render', measure)
        return () => {
            cancelAnimationFrame(frame)
            map.off('render', measure)
        }
    }, [map, source, clustered])

    if (!clustered || !visible || labels.length === 0) return null
    return createPortal(
        labels.map((label) => (
            <span
                key={label.id}
                aria-hidden
                className="absolute -translate-x-1/2 -translate-y-1/2 text-2xs leading-none font-medium text-card tabular-nums"
                style={{ left: label.x, top: label.y }}
            >
                {COMPACT.format(label.count)}
            </span>
        )),
        overlay,
    )
}
