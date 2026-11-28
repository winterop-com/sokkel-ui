'use client'

import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ID_PROPERTY, useMapContext } from './context'
import type { Bounds, LngLat } from './geometry'
import {
    hatchImage,
    LABEL_RANK,
    placeClear,
    state,
    useGeoJsonLayer,
    useLabelBoxes,
    useProjectedPoints,
    useTakenLabels,
    type PlacedText,
    type PixelBox,
    type PreparedData,
    type RenderedPoint,
    useSameContent,
} from './layer'
import type { MapLegendEntry } from './MapLegend'
import { SELECTION_COLOR } from './scale'
import { MAP_TONE_COLORS, MAP_TONES, TONE_PROPERTY, toneColor, toneOf, type MapTone } from './tone'

/** How a zone's inside is drawn: a light wash of its tone, diagonal lines in it, or nothing. */
export type ZoneFill = 'solid' | 'hatched' | 'none'

/** How a zone's edge is drawn: a line, or a dashed line. */
export type ZoneEdge = 'solid' | 'dashed'

/** One area on the map: a restricted water, a patrol box, an exercise area. */
export interface Zone {
    /** Unique among the layer's zones; what the map's selection names. */
    id: string
    /** Its outline as positions (longitude, latitude), closed or not, or a GeoJSON polygon or multipolygon, holes included. */
    area: readonly LngLat[] | Polygon | MultiPolygon
    /** The color it is drawn in; plain unless given. */
    tone?: MapTone
    /** How its inside is drawn, in place of the layer's. */
    fill?: ZoneFill
    /** How its edge is drawn, in place of the layer's. */
    edge?: ZoneEdge
    /** Written at its middle. */
    label?: string
}

/** A zone label's box, centered on the zone's middle: about six pixels a letter of the 2xs text, and its padding. */
export const zoneLabelBox = (point: RenderedPoint): PixelBox => {
    const half = (point.text.length * 6 + 8) / 2
    return [point.x - half, point.y - 8, point.x + half, point.y + 8]
}

/** How much of its tone a solid zone's inside carries at rest, under the pointer and selected. */
export const ZONE_FILL = { rest: 0.18, hover: 0.24, selected: 0.3 } as const

const finite = (position: readonly number[]): boolean =>
    position.length >= 2 && Number.isFinite(position[0]) && Number.isFinite(position[1]) && Math.abs(position[1]) <= 90

/** A ring closed on its first position, or null when it has fewer than three positions it can read. */
function closedRing(ring: readonly (readonly number[])[]): LngLat[] | null {
    const read = ring.filter(finite).map((position): LngLat => [position[0], position[1]])
    if (read.length < 3) return null
    const [first, last] = [read[0], read[read.length - 1]]
    return first[0] === last[0] && first[1] === last[1] ? (read.length < 4 ? null : read) : [...read, first]
}

/** A zone's area as a GeoJSON geometry with every ring closed, or null when it has no ring it can draw. */
export function zoneGeometry(area: Zone['area']): Polygon | MultiPolygon | null {
    if (Array.isArray(area)) {
        const ring = closedRing(area as readonly LngLat[])
        return ring === null ? null : { type: 'Polygon', coordinates: [ring] }
    }
    const shape = area as Polygon | MultiPolygon
    const polygons = shape.type === 'Polygon' ? [shape.coordinates] : shape.type === 'MultiPolygon' ? shape.coordinates : []
    const read = polygons
        .map((rings) => rings.map(closedRing))
        .filter((rings): rings is LngLat[][] => rings.length > 0 && rings.every((ring) => ring !== null))
    if (read.length === 0) return null
    return read.length === 1 ? { type: 'Polygon', coordinates: read[0] } : { type: 'MultiPolygon', coordinates: read }
}

/** The signed area of a closed ring in square degrees, and its centroid, by the shoelace formula. */
function ringCentroid(ring: readonly LngLat[]): { area: number; center: LngLat } {
    let twice = 0
    let x = 0
    let y = 0
    for (let index = 0; index + 1 < ring.length; index += 1) {
        const [x0, y0] = ring[index]
        const [x1, y1] = ring[index + 1]
        const cross = x0 * y1 - x1 * y0
        twice += cross
        x += (x0 + x1) * cross
        y += (y0 + y1) * cross
    }
    if (Math.abs(twice) < 1e-12) {
        const count = ring.length - 1
        const sum = ring.slice(0, count).reduce<LngLat>((total, [lng, lat]) => [total[0] + lng, total[1] + lat], [0, 0])
        return { area: 0, center: [sum[0] / count, sum[1] / count] }
    }
    return { area: Math.abs(twice / 2), center: [x / (3 * twice), y / (3 * twice)] }
}

/**
 * The sign of a `line-offset` that moves a line off a zone's edge to its outside: -1 when its
 * outline runs counterclockwise on the map, 1 when clockwise.
 */
export function zoneOutward(geometry: Polygon | MultiPolygon): 1 | -1 {
    const ring = (geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0]) as LngLat[]
    let twice = 0
    for (let index = 0; index + 1 < ring.length; index += 1)
        twice += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
    return twice >= 0 ? -1 : 1
}

/** Where a zone's label stands: the middle of its outline's area, or of its largest part's. */
export function zoneCenter(geometry: Polygon | MultiPolygon): LngLat {
    const outers = (geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((rings) => rings[0])) as LngLat[][]
    return outers.map(ringCentroid).reduce((largest, each) => (each.area > largest.area ? each : largest)).center
}

/** Zones as the map draws them: one feature each carrying its tone, fill and edge, and the labels at their middles. */
export interface ZoneData {
    zones: PreparedData
    labels: PlacedText[]
}

/**
 * Zones made ready to draw, each zone's fill and edge its own or the layer's. A zone whose area
 * cannot be read is left out and counted.
 */
export function zoneData(zones: readonly Zone[], fill: ZoneFill = 'solid', edge: ZoneEdge = 'solid'): ZoneData {
    const features: Feature[] = []
    const byId = new Map<string, Feature>()
    const labels: PlacedText[] = []
    let bounds: Bounds | null = null
    for (const zone of zones) {
        const geometry = zoneGeometry(zone.area)
        if (geometry === null) continue
        const feature: Feature = {
            type: 'Feature',
            geometry,
            properties: {
                [ID_PROPERTY]: zone.id,
                [TONE_PROPERTY]: toneOf(zone.tone),
                fill: zone.fill ?? fill,
                edge: zone.edge ?? edge,
                label: zone.label ?? null,
                outward: zoneOutward(geometry),
            },
        }
        features.push(feature)
        byId.set(zone.id, feature)
        const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((each) => each[0])
        for (const [lng, lat] of rings.flat()) {
            bounds =
                bounds === null
                    ? [lng, lat, lng, lat]
                    : [Math.min(bounds[0], lng), Math.min(bounds[1], lat), Math.max(bounds[2], lng), Math.max(bounds[3], lat)]
        }
        if (zone.label !== undefined && zone.label !== '') labels.push({ key: zone.id, at: zoneCenter(geometry), text: zone.label })
    }
    return {
        zones: { collection: { type: 'FeatureCollection', features }, byId, bounds, unreadable: zones.length - features.length },
        labels,
    }
}

/**
 * A legend line keying zones of a tone as the map draws them: a light wash, diagonal lines or only
 * the edge, inside an edge of the tone.
 */
export function zoneLegendEntry(label: string, tone: MapTone, fill: ZoneFill = 'solid', color = MAP_TONE_COLORS[tone]): MapLegendEntry {
    const ground =
        fill === 'solid'
            ? `color-mix(in oklab, ${color} ${String(Math.round(ZONE_FILL.rest * 100))}%, var(--card))`
            : fill === 'hatched'
              ? `repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 4px)`
              : 'transparent'
    return { label, color: ground, edge: color, shape: 'area' }
}

export interface ZoneLayerProps {
    /** Unique among the map's layers. */
    id: string
    zones: readonly Zone[]
    /** How each zone's inside is drawn unless the zone says. */
    fill?: ZoneFill
    /** How each zone's edge is drawn unless the zone says. */
    edge?: ZoneEdge
    /** Writes each zone's label at its middle. */
    labels?: boolean
    /** The colors of the tones, in place of their tokens. */
    colors?: Partial<Record<MapTone, string>>
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
    /** Whether zones answer hover and clicks; a click selects one as the map's selection. */
    interactive?: boolean
    /** A soft glow in each zone's tone just outside its edge. */
    glow?: boolean
}

/** A zone's glow: how wide, how soft and how strong it is, standing just outside the edge. */
export const ZONE_GLOW = { width: 10, blur: 8, opacity: 0.55 } as const

const FILLED: Record<ZoneFill, ExpressionSpecification> = {
    solid: ['==', ['get', 'fill'], 'solid'],
    hatched: ['==', ['get', 'fill'], 'hatched'],
    none: ['==', ['get', 'fill'], 'none'],
}

/**
 * Areas on the map, each in its tone (a track affiliation's color, or plain): its inside a light
 * wash of the tone, diagonal lines in it (a pattern made in code) or nothing, inside a solid or a
 * dashed edge, and its label written at its middle, unless it would cover another zone's label or a
 * track's label (the selected zone's is placed first, and always). The zone under the pointer
 * deepens; the selected one (the map's `selected`, picked by a click) is edged in the selection color.
 * With `glow`, a soft blurred line in the zone's tone stands just outside its edge, one more line
 * layer and no animation.
 */
export function ZoneLayer({
    id,
    zones: given,
    fill = 'solid',
    edge = 'solid',
    labels = true,
    colors,
    opacity = 1,
    visible = true,
    interactive = true,
    glow = false,
}: ZoneLayerProps) {
    const { map, overlay, selected } = useMapContext()
    const zones = useSameContent(given)
    const data = useMemo(() => zoneData(zones, fill, edge), [zones, fill, edge])
    const palette = { ...MAP_TONE_COLORS, ...colors, card: 'var(--card)', selection: SELECTION_COLOR }
    const hatch = (tone: MapTone) => `wui-${id}-hatch-${tone}`

    useGeoJsonLayer({
        id,
        data: data.zones,
        colors: palette,
        images: (resolved) => Object.fromEntries(MAP_TONES.map((tone) => [hatch(tone), hatchImage('transparent', resolved[tone])])),
        interactive,
        visible,
        tolerance: 2,
        hitLayers: (source) => [`${source}-fill`, `${source}-hatch`, `${source}-area`, `${source}-edge`, `${source}-dashed`],
        layers: (source, resolved): LayerSpecification[] => {
            const tone = toneColor(resolved)
            const line: ExpressionSpecification = ['case', state('selected'), resolved.selection, tone]
            const width: ExpressionSpecification = ['case', state('selected'), 2.5, state('hover'), 2, 1.5]
            return [
                {
                    id: `${source}-fill`,
                    type: 'fill',
                    source,
                    filter: FILLED.solid,
                    paint: {
                        'fill-color': tone,
                        'fill-opacity': [
                            '*',
                            ['case', state('selected'), ZONE_FILL.selected, state('hover'), ZONE_FILL.hover, ZONE_FILL.rest],
                            opacity,
                        ],
                    },
                },
                {
                    id: `${source}-hatch`,
                    type: 'fill',
                    source,
                    filter: FILLED.hatched,
                    paint: {
                        'fill-pattern': ['concat', `wui-${id}-hatch-`, ['get', TONE_PROPERTY]],
                        'fill-opacity': ['*', ['case', state('selected'), 1, state('hover'), 0.95, 0.7], opacity],
                    },
                },
                {
                    // A zone drawn with no inside still answers the pointer inside it.
                    id: `${source}-area`,
                    type: 'fill',
                    source,
                    filter: FILLED.none,
                    paint: { 'fill-color': tone, 'fill-opacity': 0 },
                },
                {
                    // A line at no opacity is not drawn at all, so a layer without the glow pays nothing for it.
                    id: `${source}-glow`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': tone,
                        'line-width': ZONE_GLOW.width,
                        'line-blur': ZONE_GLOW.blur,
                        'line-offset': ['*', ['to-number', ['get', 'outward'], 1], ZONE_GLOW.width / 2],
                        'line-opacity': glow ? ZONE_GLOW.opacity * opacity : 0,
                    },
                },
                {
                    id: `${source}-halo`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.card, 'line-width': ['case', state('selected'), 5, 0], 'line-opacity': opacity },
                },
                {
                    id: `${source}-edge`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'edge'], 'solid'],
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': line, 'line-width': width, 'line-opacity': opacity },
                },
                {
                    id: `${source}-dashed`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'edge'], 'dashed'],
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': line, 'line-width': width, 'line-opacity': opacity, 'line-dasharray': [3, 2] },
                },
            ]
        },
    })

    const names = useProjectedPoints(map, data.labels, labels && visible)
    const placed = placeClear(names, zoneLabelBox, selected, useTakenLabels(LABEL_RANK.zone))
    useLabelBoxes(`wui-${id}`, LABEL_RANK.zone, visible ? placed.map(zoneLabelBox) : [])
    if (!visible || placed.length === 0) return null
    return createPortal(
        placed.map((name) => (
            <span
                key={`zone-${name.key}`}
                aria-hidden
                className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-mini bg-card/80 px-1 text-2xs leading-tight font-medium whitespace-nowrap text-foreground',
                    name.key === selected && 'bg-card ring-1 ring-map-selection',
                )}
                style={{ left: name.x, top: name.y }}
            >
                {name.text}
            </span>
        )),
        overlay,
    )
}
