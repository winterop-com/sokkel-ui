import type { FeatureCollection } from 'geojson'
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useLocale } from '@winterop-com/sokkel-ui/lib/words'
import { ID_PROPERTY, useMapContext } from './context'
import { anchorOf, type LngLat } from './geometry'
import {
    CLASS_PROPERTY,
    LABEL_RANK,
    classColor,
    overlaps,
    prepareData,
    readValue,
    state,
    useGeoJsonLayer,
    useLabelBoxes,
    useProjectedPoints,
    useRenderedPoints,
    useTakenLabels,
    type FeatureAccessor,
    type PixelBox,
    type RenderedPoint,
} from './layer'
import { HIGHLIGHT_COLOR, NO_DATA_POINT_COLOR, SELECTION_COLOR, classOf, scaleColors, type ColorScale } from './scale'

export type { FeatureAccessor } from './layer'

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
    /**
     * Draws each point as a light: a soft halo of its color round a core with no ring, lying on the
     * ground, so it thins toward a globe's rim. For points over a dark ground. Read once.
     */
    glow?: boolean
    /**
     * Where each point's name is read, to be written beside it: as many names as fit without
     * covering one another, those of the points with the largest `size` value first, so more appear
     * as the map is zoomed in. The name of the point under the cursor and of the selected point is
     * always written.
     */
    label?: FeatureAccessor
    /** The property a feature's id is read from when it has no `id` of its own. */
    idProperty?: string
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
    /** Whether points answer hover and clicks. */
    interactive?: boolean
    /** The ids of points drawn at the middle emphasis, such as the points under the selected area. */
    highlighted?: readonly string[]
}

/**
 * A point's radius: one radius without `size`, or its value's square root drawn from one end of the
 * range to the other across the domain, ends below zero taken as zero. A domain whose ends are equal
 * (one point, or every value the same) draws every point at the range's far end, and a reversed one
 * runs the other way, as maplibre refuses an interpolation whose stops do not rise, and the layer with it.
 */
export function pointRadius(size: PointSize | undefined, radius: number): ExpressionSpecification | number {
    if (size === undefined) return radius
    const [near, far] = [size.range?.[0] ?? 3, size.range?.[1] ?? 14]
    const [low, high] = size.domain.map((end) => Math.sqrt(Math.max(end, 0)))
    if (!(Number.isFinite(low) && Number.isFinite(high)) || low === high) return far
    const [from, to] =
        low < high
            ? [
                  [low, near],
                  [high, far],
              ]
            : [
                  [high, far],
                  [low, near],
              ]
    return ['interpolate', ['linear'], ['sqrt', ['max', ['to-number', ['get', SIZE_PROPERTY], 0], 0]], from[0], from[1], to[0], to[1]]
}

/** A point's radius in pixels for its size value, as `pointRadius` has the map draw it. */
export function radiusOf(size: PointSize | undefined, radius: number, value: unknown): number {
    if (size === undefined) return radius
    const [near, far] = [size.range?.[0] ?? 3, size.range?.[1] ?? 14]
    const [low, high] = size.domain.map((end) => Math.sqrt(Math.max(end, 0)))
    if (!(Number.isFinite(low) && Number.isFinite(high)) || low === high) return far
    const at = Math.sqrt(Math.max(typeof value === 'number' ? value : 0, 0))
    return near + (far - near) * Math.min(1, Math.max(0, (at - low) / (high - low)))
}

/** A light's core for its color: the color lifted toward starlight, so the middle of its halo burns brighter than its edge. */
const lit = (color: string) => `color-mix(in oklab, ${color} 45%, var(--globe-star))`

/** How far a point's hit reaches beyond its edge, in pixels. */
const TOLERANCE = 4

/** A point's name as it is written: its text, where its point is, how far right of the point it starts, and its place in line for room. */
interface PointName {
    text: string
    at: LngLat
    offset: number
    order: number
}

/** A point name's box beside its point: about six pixels a letter of the 2xs text, and its padding. */
export const pointLabelBox = (point: RenderedPoint, offset: number): PixelBox => {
    const left = point.x + offset
    return [left, point.y - 8, left + point.text.length * 6 + 8, point.y + 8]
}

/** The room a name keeps clear around its box, across and down in pixels, so the names on a crowded map stand apart. */
const ROOM: readonly [number, number] = [16, 5]

/**
 * The names that fit beside their points: each taken in the order given, where its box and the
 * room around it cover no name taken before it nor a box already `taken`, and where its far end
 * and the ground just before its point are `onGround`, so no name hangs past the rim of a globe or
 * names a point that is turning out of sight there. The `first` key's name is always taken.
 */
export function placeNames(
    points: readonly RenderedPoint[],
    box: (point: RenderedPoint) => PixelBox,
    first: string | null,
    taken: readonly PixelBox[],
    onGround: (x: number, y: number) => boolean,
): RenderedPoint[] {
    const ordered = [...points].sort((a, b) => Number(b.key === first) - Number(a.key === first))
    const held: PixelBox[] = [...taken]
    const placed: RenderedPoint[] = []
    for (const point of ordered) {
        const own = box(point)
        const roomy: PixelBox = [own[0] - ROOM[0], own[1] - ROOM[1], own[2] + ROOM[0], own[3] + ROOM[1]]
        const fits =
            point.key === first ||
            (!held.some((other) => overlaps(roomy, other)) &&
                onGround(point.x - ROOM[0], point.y) &&
                onGround(own[2], own[1]) &&
                onGround(own[2], own[3]))
        if (!fits) continue
        held.push(own)
        placed.push(point)
    }
    return placed
}

/** The id of the point of a style layer under the cursor, or null: the point whose name is written whatever else is. */
function useHoveredPoint(map: MapLibreMap, layer: string, enabled: boolean): string | null {
    const [hovered, setHovered] = useState<string | null>(null)
    useEffect(() => {
        if (!enabled) {
            setHovered(null)
            return
        }
        const move = (event: MapMouseEvent) => {
            if (map.getLayer(layer) === undefined) return
            const { x, y } = event.point
            const found = map.queryRenderedFeatures(
                [
                    [x - TOLERANCE, y - TOLERANCE],
                    [x + TOLERANCE, y + TOLERANCE],
                ],
                { layers: [layer] },
            )[0]
            const id: unknown = found?.properties[ID_PROPERTY]
            setHovered(typeof id === 'string' ? id : null)
        }
        const leave = () => setHovered(null)
        map.on('mousemove', move)
        map.on('mouseout', leave)
        return () => {
            map.off('mousemove', move)
            map.off('mouseout', leave)
        }
    }, [map, layer, enabled])
    return hovered
}

const COMPACT = new Map<string, Intl.NumberFormat>()

/** A cluster's count written short in a locale: `1.2K`. */
function compact(locale: string): Intl.NumberFormat {
    let found = COMPACT.get(locale)
    if (found === undefined) {
        found = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
        COMPACT.set(locale, found)
    }
    return found
}

/**
 * Points on the map, as circles colored by a scale or one color and sized by a value or one
 * radius, each ringed in the card color so neighbors stay apart. Clustered points gather into
 * circles carrying their count. The selected point grows in the selection color and the
 * `highlighted` ones take the highlight color: as their fill when the layer has one color, as
 * their ring when a scale colors them. A point whose position cannot be read is left out and
 * counted in the map's note. With `glow` each point is a light, a halo round a core, and with
 * `label` the points are named beside them as far as the names fit, the largest first, the one
 * under the cursor and the selected one always.
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
    glow = false,
    label,
    idProperty,
    opacity = 1,
    visible = true,
    interactive = true,
    highlighted,
}: PointLayerProps) {
    const { map, overlay, selected } = useMapContext()
    const locale = useLocale()
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
    const plain = scale === undefined
    const classes = plain ? [color] : scaleColors(scale)
    const clusterOptions = cluster === false ? undefined : cluster === true ? {} : cluster
    const colors = {
        ...Object.fromEntries(classes.map((css, index) => [`class${index}`, css])),
        ...Object.fromEntries(classes.map((css, index) => [`core${index}`, lit(css)])),
        noData: NO_DATA_POINT_COLOR,
        ring: 'var(--card)',
        selection: SELECTION_COLOR,
        selectionCore: lit(SELECTION_COLOR),
        highlight: HIGHLIGHT_COLOR,
        highlightCore: lit(HIGHLIGHT_COLOR),
        cluster: 'color-mix(in oklab, var(--foreground) 78%, var(--card))',
    }

    const base = pointRadius(size, radius)

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
        highlighted,
        tolerance: TOLERANCE,
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
            const fill: ExpressionSpecification | string = plain
                ? ['case', state('selected'), resolved.selection, state('highlighted'), resolved.highlight, fills[0]]
                : classColor(fills, resolved.noData)
            const cores = classes.map((_, index) => resolved[`core${index}` as keyof typeof resolved])
            const core: ExpressionSpecification | string = !glow
                ? fill
                : plain
                  ? ['case', state('selected'), resolved.selectionCore, state('highlighted'), resolved.highlightCore, cores[0]]
                  : classColor(cores, resolved.noData)
            const grown: ExpressionSpecification = ['+', base, ['case', state('selected'), 2.5, state('hover'), 1.5, 0]]
            const layers: LayerSpecification[] = []
            if (glow) {
                layers.push({
                    id: `${source}-glow`,
                    type: 'circle',
                    source,
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-color': fill,
                        'circle-radius': ['*', grown, 3.4],
                        'circle-blur': 1,
                        'circle-opacity': ['*', ['case', state('selected'), 0.75, state('hover'), 0.65, 0.42], opacity],
                        'circle-pitch-alignment': 'map',
                    },
                })
            }
            layers.push({
                id: `${source}-circle`,
                type: 'circle',
                source,
                filter: ['!', ['has', 'point_count']],
                layout: { 'circle-sort-key': ['-', 0, ['to-number', ['get', SIZE_PROPERTY], 0]] },
                paint: {
                    'circle-color': core,
                    'circle-radius': grown,
                    'circle-opacity': 0.95 * opacity,
                    'circle-stroke-opacity': opacity,
                    'circle-stroke-color': plain
                        ? resolved.ring
                        : ['case', state('selected'), resolved.selection, state('highlighted'), resolved.highlight, resolved.ring],
                    'circle-stroke-width': glow
                        ? 0
                        : plain
                          ? ['case', state('selected'), 2, 1.25]
                          : ['case', state('selected'), 2.5, state('highlighted'), 2, 1.25],
                    'circle-pitch-alignment': glow ? 'map' : 'viewport',
                },
            })
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

    const clustered = clusterOptions !== undefined
    const counts = useRenderedPoints(map, `${source}-cluster`, clustered, (properties) => {
        const clusterId: unknown = properties['cluster_id']
        const count: unknown = properties['point_count']
        return typeof clusterId === 'number' && typeof count === 'number'
            ? { key: String(clusterId), text: compact(locale).format(count) }
            : null
    })

    // Each point's name by its id, the points with the largest size value first in line for room.
    const names = useMemo(() => {
        const found = new Map<string, PointName>()
        if (label === undefined) return found
        const weighed = [...prepared.byId].map(([key, feature]) => {
            const text = readValue(feature, label)
            const sized = size === undefined ? undefined : readValue(feature, size.value)
            return { key, at: anchorOf(feature), text: typeof text === 'string' || typeof text === 'number' ? String(text) : '', sized }
        })
        const weight = (sized: unknown) => (typeof sized === 'number' ? sized : -Infinity)
        weighed.sort((a, b) => weight(b.sized) - weight(a.sized))
        weighed.forEach(({ key, at, text, sized }, order) => {
            if (text !== '' && at !== null) found.set(key, { text, at, offset: Math.round(radiusOf(size, radius, sized)) + 5, order })
        })
        return found
    }, [prepared, label, size, radius])
    const named = names.size > 0 && visible
    // Where the named points stand: each where it is, or, when points gather into clusters, the ones the map draws on their own.
    const places = useMemo(
        () => (clustered ? [] : [...names].map(([key, name]) => ({ key, at: name.at, text: name.text }))),
        [names, clustered],
    )
    const standing = useProjectedPoints(map, places, named && !clustered)
    const drawn = useRenderedPoints(map, `${source}-circle`, named && clustered, (properties) => {
        const key: unknown = properties[ID_PROPERTY]
        const name = typeof key === 'string' ? names.get(key) : undefined
        return typeof key !== 'string' || name === undefined ? null : { key, text: name.text }
    })
    const points = clustered ? drawn : standing
    const hovered = useHoveredPoint(map, `${source}-circle`, named && interactive)
    const taken = useTakenLabels(LABEL_RANK.point)
    const box = (point: RenderedPoint) => pointLabelBox(point, names.get(point.key)?.offset ?? 0)
    const inLine = [...points].sort((a, b) => (names.get(a.key)?.order ?? 0) - (names.get(b.key)?.order ?? 0))
    // A place on the screen is over the ground when the position read there is drawn back at it; past a globe's rim it is not.
    const onGround = (x: number, y: number) => {
        const back = map.project(map.unproject([x, y]))
        return Math.abs(back.x - x) < 2 && Math.abs(back.y - y) < 2
    }
    const placed = named ? placeNames(inLine, box, selected, taken, onGround) : []
    useLabelBoxes(source, LABEL_RANK.point, placed.map(box))
    const pointed =
        hovered === null || placed.some((point) => point.key === hovered) ? undefined : points.find((point) => point.key === hovered)
    const written = pointed === undefined ? placed : [...placed, pointed]

    if (!visible || (counts.length === 0 && written.length === 0)) return null
    return createPortal(
        <>
            {written.map((name) => (
                <span
                    key={`name-${name.key}`}
                    aria-hidden
                    className={cn(
                        'absolute -translate-y-1/2 rounded-mini bg-card/80 px-1 text-2xs leading-tight whitespace-nowrap text-foreground',
                        name.key === hovered && 'z-10 bg-card font-medium',
                        name.key === selected && 'bg-card font-medium ring-1 ring-map-selection',
                    )}
                    style={{ left: name.x + (names.get(name.key)?.offset ?? 0), top: name.y }}
                >
                    {name.text}
                </span>
            ))}
            {counts.map((count) => (
                <span
                    key={`count-${count.key}`}
                    aria-hidden
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-2xs leading-none font-medium text-card tabular-nums"
                    style={{ left: count.x, top: count.y }}
                >
                    {count.text}
                </span>
            ))}
        </>,
        overlay,
    )
}
