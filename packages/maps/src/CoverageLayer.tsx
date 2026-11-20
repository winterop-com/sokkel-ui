import type { Feature, LineString, Polygon } from 'geojson'
import type { LayerSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'

import { useLocale } from '@winterop-com/sokkel-ui/lib/words'
import { ID_PROPERTY, useMapContext } from './context'
import { arc, destination, inUnit, UNIT_SYMBOLS, type DistanceUnit } from './geodesy'
import type { Bounds, LngLat } from './geometry'
import { useGeoJsonLayer, useProjectedPoints, type PlacedText, type PreparedData } from './layer'
import { MAP_TONE_COLORS, TONE_PROPERTY, toneColor, toneOf, type MapTone } from './tone'

/** What a sensor covers: a wedge from where it stands, turned to its bearing, as wide as its width and as long as its range. */
export interface SensorCone {
    /** Unique among the layer's cones. */
    id: string
    /** Where the sensor stands: longitude, latitude. */
    position: LngLat
    /** How far it reaches, in meters. */
    range: number
    /** Which way the wedge's middle points, in degrees clockwise from north; north unless given. */
    bearing?: number
    /** How wide the wedge opens, in degrees; 360, the whole circle, unless given. */
    width?: number
    /** The color it is drawn in; plain unless given. */
    tone?: MapTone
}

/** Circles at given distances round a position, each written with its distance. */
export interface RangeRings {
    /** Unique among the layer's rings. */
    id: string
    /** Their middle: longitude, latitude. */
    position: LngLat
    /** The distances, in meters. */
    distances: readonly number[]
    /** The color they are drawn in; plain unless given. */
    tone?: MapTone
    /** The bearing each ring's distance is written at, in degrees clockwise from north; north unless given. */
    labelBearing?: number
}

/** How much of its tone a cone's nearest band carries; each band further out carries less, down to nearly none. */
export const CONE_FILL = 0.28

/** How fast a cone fades with distance: each band's share of `CONE_FILL` is its nearness to the sensor raised to this. */
export const CONE_FADE = 1.6

/** How many positions an arc of a circle is drawn with, per degree it turns, and the fewest. */
const PER_DEGREE = 1 / 4
const FEWEST = 4

/** One band of a cone, from one distance to another: a wedge, a ring round a hole, or a whole disc. */
function bandRing(cone: SensorCone, inner: number, outer: number): Polygon['coordinates'] {
    const width = Math.min(360, Math.max(0, cone.width ?? 360))
    const bearing = cone.bearing ?? 0
    if (width >= 360) {
        const outside = arc(cone.position, outer, 0, 360, 72)
        return inner <= 0 ? [outside] : [outside, arc(cone.position, inner, 360, 0, 72)]
    }
    const steps = Math.max(FEWEST, Math.ceil(width * PER_DEGREE))
    const [from, to] = [bearing - width / 2, bearing + width / 2]
    const outside = arc(cone.position, outer, from, to, steps)
    const inside = inner <= 0 ? [cone.position] : arc(cone.position, inner, to, from, steps)
    return [[...outside, ...inside, outside[0]]]
}

/** A cone's edge: round the wedge from the sensor and back, or the whole circle. */
function coneEdge(cone: SensorCone): LngLat[] {
    const width = Math.min(360, Math.max(0, cone.width ?? 360))
    if (width >= 360) return arc(cone.position, cone.range, 0, 360, 72)
    const bearing = cone.bearing ?? 0
    const steps = Math.max(FEWEST, Math.ceil(width * PER_DEGREE))
    return [cone.position, ...arc(cone.position, cone.range, bearing - width / 2, bearing + width / 2, steps), cone.position]
}

/**
 * A ring's distance as it is written on the ring: in the unit with no more figures than it has
 * (`20 km`, `2.5 NM`), and whole meters under a kilometer.
 */
export function ringDistance(meters: number, unit: DistanceUnit = 'km', locale = 'en-US'): string {
    const small = unit === 'km' && meters < 1000
    const value = small ? meters : inUnit(meters, unit)
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: small ? 0 : 2 }).format(value)} ${small ? 'm' : UNIT_SYMBOLS[unit]}`
}

const readable = (position: readonly number[]) =>
    Number.isFinite(position[0]) && Number.isFinite(position[1]) && Math.abs(position[1]) <= 90

/** Sensors' cones and range rings as the map draws them, and the distances written on the rings. */
export interface CoverageData {
    shapes: PreparedData
    labels: PlacedText[]
}

/**
 * Cones and rings made ready to draw. Each cone is cut into `bands` bands from the sensor out, each
 * carrying `fade`, from 1 for the nearest to the share of the range the last begins at, which the
 * fill follows, and its edge drawn round it; each ring is a circle at its distance, its distance
 * written at `labelBearing` on it. A cone or ring whose position or range cannot be read is left out.
 */
export function coverageData(
    cones: readonly SensorCone[],
    rings: readonly RangeRings[],
    { bands = 6, unit = 'km', locale = 'en-US' }: { bands?: number; unit?: DistanceUnit; locale?: string } = {},
): CoverageData {
    const features: Feature[] = []
    const labels: PlacedText[] = []
    const all: LngLat[] = []
    const count = Math.max(1, Math.round(bands))
    let unreadable = 0
    for (const cone of cones) {
        if (!readable(cone.position) || !(cone.range > 0)) {
            unreadable += 1
            continue
        }
        const tone = toneOf(cone.tone)
        for (let band = 0; band < count; band += 1) {
            const coordinates = bandRing(cone, (cone.range * band) / count, (cone.range * (band + 1)) / count)
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates },
                properties: { [ID_PROPERTY]: `${cone.id}#${String(band)}`, kind: 'band', [TONE_PROPERTY]: tone, fade: 1 - band / count },
            })
        }
        const edge = coneEdge(cone)
        all.push(...edge)
        features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: edge } satisfies LineString,
            properties: { [ID_PROPERTY]: `${cone.id}#edge`, kind: 'edge', [TONE_PROPERTY]: tone },
        })
    }
    for (const ring of rings) {
        if (!readable(ring.position)) {
            unreadable += 1
            continue
        }
        const tone = toneOf(ring.tone)
        for (const meters of ring.distances) {
            if (!(meters > 0)) continue
            const circle = arc(ring.position, meters, 0, 360, 72)
            all.push(...circle)
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: circle },
                properties: { [ID_PROPERTY]: `${ring.id}#${String(meters)}`, kind: 'ring', [TONE_PROPERTY]: tone },
            })
            labels.push({
                key: `${ring.id}#${String(meters)}`,
                at: destination(ring.position, ring.labelBearing ?? 0, meters),
                text: ringDistance(meters, unit, locale),
            })
        }
    }
    const bounds: Bounds | null =
        all.length === 0
            ? null
            : [
                  Math.min(...all.map((at) => at[0])),
                  Math.min(...all.map((at) => at[1])),
                  Math.max(...all.map((at) => at[0])),
                  Math.max(...all.map((at) => at[1])),
              ]
    return { shapes: { collection: { type: 'FeatureCollection', features }, byId: new Map(), bounds, unreadable }, labels }
}

export interface CoverageLayerProps {
    /** Unique among the map's layers. */
    id: string
    /** What sensors cover, each as a wedge fading out with distance. */
    cones?: readonly SensorCone[]
    /** Circles at given distances, each written with its distance. */
    rings?: readonly RangeRings[]
    /** How many bands a cone fades out over. */
    bands?: number
    /** The unit the rings' distances are written in; meters below a kilometer. */
    unit?: DistanceUnit
    /** Writes each ring's distance on it. */
    labels?: boolean
    /** The colors of the tones, in place of their tokens. */
    colors?: Partial<Record<MapTone, string>>
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
}

/**
 * What sensors cover, under the tracks: each cone a wedge from where its sensor stands, turned to
 * its bearing and opened to its width (360 is a whole disc), in its tone, fading out with distance
 * to its range, inside a faint edge; and range rings, dashed circles at given distances round a
 * position, each written with its distance. The layer answers no pointer, so what lies under it
 * stays pickable.
 */
export function CoverageLayer({
    id,
    cones = [],
    rings = [],
    bands = 6,
    unit = 'km',
    labels = true,
    colors,
    opacity = 1,
    visible = true,
}: CoverageLayerProps) {
    const { map, overlay } = useMapContext()
    const locale = useLocale()
    const data = useMemo(() => coverageData(cones, rings, { bands, unit, locale }), [cones, rings, bands, unit, locale])
    const palette = { ...MAP_TONE_COLORS, ...colors }

    useGeoJsonLayer({
        id,
        data: data.shapes,
        colors: palette,
        interactive: false,
        visible,
        tolerance: 0,
        hitLayers: () => [],
        layers: (source, resolved): LayerSpecification[] => {
            const tone = toneColor(resolved)
            return [
                {
                    id: `${source}-band`,
                    type: 'fill',
                    source,
                    filter: ['==', ['get', 'kind'], 'band'],
                    paint: {
                        'fill-color': tone,
                        'fill-opacity': ['*', CONE_FILL, ['^', ['to-number', ['get', 'fade'], 1], CONE_FADE], opacity],
                        'fill-antialias': false,
                    },
                },
                {
                    id: `${source}-edge`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'kind'], 'edge'],
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': tone, 'line-width': 1, 'line-opacity': 0.55 * opacity },
                },
                {
                    id: `${source}-ring`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'kind'], 'ring'],
                    paint: { 'line-color': tone, 'line-width': 1, 'line-opacity': 0.7 * opacity, 'line-dasharray': [2, 2] },
                },
            ]
        },
    })

    const distances = useProjectedPoints(map, data.labels, labels && visible)
    if (!visible || distances.length === 0) return null
    return createPortal(
        distances.map((distance) => (
            <span
                key={`ring-${distance.key}`}
                aria-hidden
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-mini bg-card/80 px-1 text-2xs leading-tight whitespace-nowrap text-muted-foreground tabular-nums"
                style={{ left: distance.x, top: distance.y }}
            >
                {distance.text}
            </span>
        )),
        overlay,
    )
}
