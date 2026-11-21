import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useLocale, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { ID_PROPERTY, useMapContext } from './context'
import { normalizeBearing } from './geodesy'
import type { Bounds, LngLat } from './geometry'
import {
    LABEL_RANK,
    overlaps,
    state,
    useGeoJsonLayer,
    useLabelBoxes,
    groundAt,
    useRenderedPoints,
    type PixelBox,
    type PreparedData,
    type RenderedPoint,
} from './layer'
import type { MapLegendEntry } from './MapLegend'
import { SELECTION_COLOR } from './scale'

/** Whose a track is: one's own side, the other side, neither, not known yet, or waiting to be judged. */
export type TrackAffiliation = 'friend' | 'hostile' | 'neutral' | 'unknown' | 'pending'

/** What a track is, which picks its symbol. */
export type TrackKind = 'vessel' | 'aircraft' | 'vehicle' | 'sensor' | 'other'

/** Every affiliation, in the order a legend lists them. */
export const TRACK_AFFILIATIONS: readonly TrackAffiliation[] = ['friend', 'hostile', 'neutral', 'unknown', 'pending']

/** Every kind, in the order a legend lists them. */
export const TRACK_KINDS: readonly TrackKind[] = ['vessel', 'aircraft', 'vehicle', 'sensor', 'other']

/** The color each affiliation is drawn in: a token per affiliation, so a theme can change them. */
export const TRACK_COLORS: Record<TrackAffiliation, string> = {
    friend: 'var(--track-friend)',
    hostile: 'var(--track-hostile)',
    neutral: 'var(--track-neutral)',
    unknown: 'var(--track-unknown)',
    pending: 'var(--track-pending)',
}

/** One moving thing on the map. */
export interface Track {
    /** Unique among the layer's tracks; what the map's selection names. */
    id: string
    /** Where it is now: longitude, latitude. */
    position: LngLat
    /** Which way it is going, in degrees from north; drawn pointing north without one. */
    heading?: number
    affiliation: TrackAffiliation
    kind: TrackKind
    /** Written beside the symbol. */
    label?: string
    /** Where it has been, oldest first, drawn as a line that fades into the past up to where it is now. */
    trail?: readonly LngLat[]
    /**
     * The band it falls in, such as an altitude band: with the layer's `bands` naming it, the track
     * and its trail are painted in that band's color in place of the affiliation's.
     */
    band?: string
}

/** The names of the affiliations and the kinds, which a legend of the tracks says. */
export type TrackWords = Record<TrackAffiliation | TrackKind, string>

export const TRACK_WORDS: TrackWords = {
    friend: 'Friend',
    hostile: 'Hostile',
    neutral: 'Neutral',
    unknown: 'Unknown',
    pending: 'Pending',
    vessel: 'Vessel',
    aircraft: 'Aircraft',
    vehicle: 'Vehicle',
    sensor: 'Sensor',
    other: 'Other',
}

/** Where a catalog holds a track layer's words. */
export const TRACK_PART: WordsPart<TrackWords> = { id: 'track', words: TRACK_WORDS }

/** The affiliations as a `MapLegend`'s entries, in the colors the layer paints; `trackCounts` gives their counts. */
export function trackLegendEntries(
    words: Partial<TrackWords> = {},
    affiliations: readonly TrackAffiliation[] = TRACK_AFFILIATIONS,
): MapLegendEntry[] {
    const said = { ...TRACK_WORDS, ...words }
    return affiliations.map((affiliation) => ({ label: said[affiliation], color: TRACK_COLORS[affiliation], shape: 'point' }))
}

/** How many of the tracks are of each affiliation, in the legend's order, for `MapLegend`'s `counts`. */
export function trackCounts(tracks: readonly Track[], affiliations: readonly TrackAffiliation[] = TRACK_AFFILIATIONS): number[] {
    return affiliations.map((affiliation) => tracks.filter((track) => track.affiliation === affiliation).length)
}

const finite = (position: readonly number[] | undefined): position is LngLat =>
    position !== undefined &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1]) &&
    Math.abs(position[1]) <= 90

/** The tracks and their trails as the map draws them: one point per track, and a trail cut into fading pieces. */
export interface TrackData {
    tracks: PreparedData
    trails: PreparedData
}

/**
 * Tracks as the map draws them. Each track is a point carrying its affiliation, kind, heading and
 * label; each trail, ending where its track is now, is cut into one piece per step, each carrying
 * `fade`, from near 0 for the oldest step to 1 for the newest, which the trail's opacity follows. A
 * track whose position cannot be read is left out and counted; a trail's unreadable positions are skipped.
 */
export function trackData(tracks: readonly Track[]): TrackData {
    const points: Feature<Point>[] = []
    const pieces: Feature<LineString>[] = []
    const byId = new Map<string, Feature>()
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    const extend = ([lng, lat]: LngLat) => {
        west = Math.min(west, lng)
        east = Math.max(east, lng)
        south = Math.min(south, lat)
        north = Math.max(north, lat)
    }
    for (const track of tracks) {
        if (!finite(track.position)) continue
        const feature: Feature<Point> = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [track.position[0], track.position[1]] },
            properties: {
                [ID_PROPERTY]: track.id,
                affiliation: track.affiliation,
                kind: track.kind,
                heading: Number.isFinite(track.heading) ? track.heading : 0,
                label: track.label ?? null,
                band: track.band ?? null,
            },
        }
        points.push(feature)
        byId.set(track.id, feature)
        extend(track.position)
        const path = [...(track.trail ?? []).filter(finite), track.position]
        for (let index = 1; index < path.length; index += 1) {
            pieces.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [path[index - 1], path[index]] },
                properties: {
                    [ID_PROPERTY]: `${track.id}#${String(index)}`,
                    affiliation: track.affiliation,
                    band: track.band ?? null,
                    fade: index / (path.length - 1),
                },
            })
            extend(path[index - 1])
        }
    }
    const bounds: Bounds | null = points.length === 0 ? null : [west, south, east, north]
    return {
        tracks: {
            collection: { type: 'FeatureCollection', features: points },
            byId,
            bounds,
            unreadable: tracks.length - points.length,
        },
        trails: {
            collection: { type: 'FeatureCollection', features: pieces } as FeatureCollection,
            byId: new Map(),
            bounds: null,
            unreadable: 0,
        },
    }
}

/** The shortest turn from one heading to another, in degrees, from -180 to 180. */
export function turn(from: number, to: number): number {
    return ((((to - from + 180) % 360) + 360) % 360) - 180
}

/**
 * The tracks a share `t` (0 to 1) of the way from where they were to where they are: each track
 * that was drawn before moves along the straight line and turns the short way round; a new track
 * stands where it is.
 */
export function between(before: ReadonlyMap<string, Track>, after: readonly Track[], t: number): Track[] {
    if (t >= 1) return [...after]
    return after.map((track) => {
        const was = before.get(track.id)
        if (was === undefined || !finite(was.position) || !finite(track.position)) return track
        const position: LngLat = [
            was.position[0] + (track.position[0] - was.position[0]) * t,
            was.position[1] + (track.position[1] - was.position[1]) * t,
        ]
        const heading =
            was.heading === undefined || track.heading === undefined
                ? track.heading
                : normalizeBearing(was.heading + turn(was.heading, track.heading) * t)
        return { ...track, position, heading }
    })
}

/** The size of a symbol image on a side, in device pixels at twice the CSS pixel; it is drawn at half that. */
const ICON = 48
/** How far the distance field runs either side of a symbol's edge, in device pixels. */
const ICON_BUFFER = 4

/** Each kind's symbol pointing north, in a 48 square. */
const OUTLINES: Record<Exclude<TrackKind, 'sensor'>, [number, number][]> = {
    // A hull: a pointed bow, straight sides and a narrower stern.
    vessel: [
        [24, 4],
        [35, 17],
        [35, 37],
        [30, 44],
        [18, 44],
        [13, 37],
        [13, 17],
    ],
    // An arrowhead with a notched tail.
    aircraft: [
        [24, 4],
        [41, 43],
        [24, 34],
        [7, 43],
    ],
    // A box with a point on its front.
    vehicle: [
        [24, 5],
        [31, 13],
        [36, 13],
        [36, 43],
        [12, 43],
        [12, 13],
        [17, 13],
    ],
    // A plain triangle.
    other: [
        [24, 6],
        [40, 41],
        [8, 41],
    ],
}

/**
 * A symbol drawn as a signed distance field, which maplibre colors with `icon-color` and rings with
 * `icon-halo-color`: the shape is painted, then each pixel takes its distance to the shape's edge,
 * 0.75 of full at the edge as maplibre reads it, rising inside and falling outside.
 */
function symbolImage(kind: TrackKind): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = ICON
    canvas.height = ICON
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context === null) return new ImageData(ICON, ICON)
    context.beginPath()
    if (kind === 'sensor') {
        context.lineWidth = 5
        context.arc(24, 24, 14, 0, Math.PI * 2)
        context.stroke()
        context.beginPath()
        context.arc(24, 24, 4.5, 0, Math.PI * 2)
        context.fill()
    } else {
        const [first, ...rest] = OUTLINES[kind]
        context.moveTo(first[0], first[1])
        for (const [x, y] of rest) context.lineTo(x, y)
        context.closePath()
        context.fill()
    }
    const alpha = context.getImageData(0, 0, ICON, ICON).data
    const inside = new Uint8Array(ICON * ICON)
    for (let index = 0; index < inside.length; index += 1) inside[index] = alpha[index * 4 + 3] > 127 ? 1 : 0
    const edges: [number, number][] = []
    for (let y = 0; y < ICON; y += 1) {
        for (let x = 0; x < ICON; x += 1) {
            const here = inside[y * ICON + x]
            const differs =
                (x > 0 && inside[y * ICON + x - 1] !== here) ||
                (x < ICON - 1 && inside[y * ICON + x + 1] !== here) ||
                (y > 0 && inside[(y - 1) * ICON + x] !== here) ||
                (y < ICON - 1 && inside[(y + 1) * ICON + x] !== here)
            if (differs) edges.push([x, y])
        }
    }
    const image = new ImageData(ICON, ICON)
    for (let y = 0; y < ICON; y += 1) {
        for (let x = 0; x < ICON; x += 1) {
            let nearest = Infinity
            for (const [ex, ey] of edges) nearest = Math.min(nearest, (ex - x) ** 2 + (ey - y) ** 2)
            const reach = Math.max(0, Math.sqrt(nearest) - 0.5)
            const signed = inside[y * ICON + x] === 1 ? -reach : reach
            const value = 1 - (signed / ICON_BUFFER + 0.25)
            const at = (y * ICON + x) * 4
            image.data[at] = 0
            image.data[at + 1] = 0
            image.data[at + 2] = 0
            image.data[at + 3] = Math.round(255 * Math.min(1, Math.max(0, value)))
        }
    }
    return image
}

const SYMBOLS = new Map<TrackKind, ImageData>()

/** Each kind's symbol, drawn once for every map. */
function symbols(): Record<string, ImageData> {
    return Object.fromEntries(
        TRACK_KINDS.map((kind) => {
            let image = SYMBOLS.get(kind)
            if (image === undefined) {
                image = symbolImage(kind)
                SYMBOLS.set(kind, image)
            }
            return [`wui-track-${kind}`, image]
        }),
    )
}

/** A `match` on the affiliation: each one's color. */
function affiliationColor(colors: Record<TrackAffiliation, string>): ExpressionSpecification {
    return [
        'match',
        ['get', 'affiliation'],
        ...TRACK_AFFILIATIONS.flatMap((affiliation) => [affiliation, colors[affiliation]]),
        colors.unknown,
    ] as unknown as ExpressionSpecification
}

/** The key a band's color is held under among a layer's colors, apart from the affiliations'. */
const bandKey = (band: string) => `band:${band}`

/** A layer's band colors under their keys, to be resolved with the affiliations'. */
function bandColors(bands: Readonly<Record<string, string>> | undefined): Record<string, string> {
    return Object.fromEntries(Object.entries(bands ?? {}).map(([band, color]) => [bandKey(band), color]))
}

/** A track's color: its band's when the layer names that band, its affiliation's otherwise. */
function trackColor(colors: Record<TrackAffiliation, string> & Record<string, string>, bands: readonly string[]): ExpressionSpecification {
    if (bands.length === 0) return affiliationColor(colors)
    return [
        'match',
        ['to-string', ['get', 'band']],
        ...bands.flatMap((band) => [band, colors[bandKey(band)] ?? colors.unknown]),
        affiliationColor(colors),
    ] as unknown as ExpressionSpecification
}

/** How far right of its track's point a label starts, in pixels. */
const labelOffset = (size: number) => Math.round(size * 0.75) + 4

/** A track's symbol's box, centered on its point. */
export const trackSymbolBox = (point: RenderedPoint, size: number): PixelBox => [
    point.x - size / 2,
    point.y - size / 2,
    point.x + size / 2,
    point.y + size / 2,
]

/** A track label's box beside its track: about six pixels a letter of the 2xs text, and its padding. */
export const trackLabelBox = (point: RenderedPoint, size: number): PixelBox => {
    const left = point.x + labelOffset(size)
    return [left, point.y - 8, left + point.text.length * 6 + 8, point.y + 8]
}

/**
 * The labels that fit beside their tracks without covering another label or another track's
 * symbol: the selected track's first, then in the order given, each taken only where it is clear.
 * A label's box is reckoned from its length, at about six pixels a letter of the 2xs text. A label
 * whose far end is not `onGround` is left out, so none hangs past the rim of a globe.
 */
export function placeLabels(
    points: readonly RenderedPoint[],
    selected: string | null,
    size: number,
    onGround: (x: number, y: number) => boolean = () => true,
): RenderedPoint[] {
    const symbols = points.map((point): [string, PixelBox] => [point.key, trackSymbolBox(point, size)])
    const ordered = [...points].sort((a, b) => Number(b.key === selected) - Number(a.key === selected))
    const taken: PixelBox[] = []
    const placed: RenderedPoint[] = []
    for (const point of ordered) {
        const box = trackLabelBox(point, size)
        const clear =
            point.key === selected ||
            (!taken.some((other) => overlaps(box, other)) &&
                !symbols.some(([key, symbol]) => key !== point.key && overlaps(box, symbol)) &&
                onGround(box[2], box[1]) &&
                onGround(box[2], box[3]))
        if (!clear) continue
        taken.push(box)
        placed.push(point)
    }
    return placed
}

const COMPACT = new Map<string, Intl.NumberFormat>()

function compact(locale: string): Intl.NumberFormat {
    let found = COMPACT.get(locale)
    if (found === undefined) {
        found = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
        COMPACT.set(locale, found)
    }
    return found
}

export interface TrackLayerProps {
    /** Unique among the map's layers. */
    id: string
    tracks: readonly Track[]
    /** Draws each track's trail. */
    trails?: boolean
    /** Writes each track's label beside it. */
    labels?: boolean
    /** The symbol's size in pixels. */
    size?: number
    /** The colors of the affiliations, in place of their tokens. */
    colors?: Partial<Record<TrackAffiliation, string>>
    /**
     * Colors by band, such as altitude bands: a track whose `band` is named here is painted in its
     * color in place of its affiliation's, and one with no band or a band not named here keeps its
     * affiliation's. Any CSS color, a token included.
     */
    bands?: Readonly<Record<string, string>>
    /**
     * Gathers nearby tracks into counted clusters, which zoom in when clicked; a cluster holding a
     * hostile track is ringed in its color. Read once.
     */
    cluster?: boolean | { radius?: number; maxZoom?: number }
    /** How long a track takes to glide from where it was to where it is, in milliseconds; 0 moves it at once. */
    transition?: number
    visible?: boolean
    /** Whether tracks answer hover and clicks. */
    interactive?: boolean
}

/**
 * Moving things on the map: each track a symbol for its kind turned to its heading, in its
 * affiliation's color (a token each, `--track-friend` and the rest) ringed in the card color, its
 * label beside it and its trail behind it, fading into the past. The selected track (the map's
 * `selected`, picked by a click) is ringed in the selection color. When the tracks change, each
 * glides from where it was to where it is over `transition`, setting the source's data in place,
 * so nothing flickers. With `cluster`, dense tracks gather into counted clusters.
 */
export function TrackLayer({
    id,
    tracks,
    trails = true,
    labels = true,
    size = 24,
    colors,
    bands,
    cluster = false,
    transition = 600,
    visible = true,
    interactive = true,
}: TrackLayerProps) {
    const { map, overlay, selected } = useMapContext()
    const locale = useLocale()
    const data = useMemo(() => trackData(tracks), [tracks])
    const clusterOptions = cluster === false ? undefined : cluster === true ? {} : cluster
    const bandNames = Object.keys(bands ?? {})
    const palette = { ...TRACK_COLORS, ...colors, ...bandColors(bands) }
    const layerColors = {
        ...palette,
        ring: 'var(--card)',
        selection: SELECTION_COLOR,
        hover: 'color-mix(in oklab, var(--foreground) 55%, var(--card))',
        cluster: 'color-mix(in oklab, var(--foreground) 78%, var(--card))',
    }

    const { source: trailSource } = useGeoJsonLayer({
        id: `${id}-trail`,
        data: data.trails,
        colors: palette,
        interactive: false,
        visible: visible && trails,
        holdData: true,
        tolerance: 0,
        hitLayers: () => [],
        layers: (source, resolved): LayerSpecification[] => [
            {
                id: `${source}-line`,
                type: 'line',
                source,
                layout: { 'line-cap': 'butt' },
                paint: {
                    'line-color': trackColor(resolved, bandNames),
                    'line-width': 2,
                    'line-opacity': ['*', 0.85, ['^', ['to-number', ['get', 'fade'], 1], 1.5]],
                },
            },
        ],
    })

    const scale = size / (ICON / 2)
    const { source } = useGeoJsonLayer({
        id,
        data: data.tracks,
        source:
            clusterOptions === undefined
                ? undefined
                : {
                      cluster: true,
                      clusterRadius: clusterOptions.radius ?? 40,
                      clusterMaxZoom: clusterOptions.maxZoom ?? 10,
                      clusterProperties: { hostile: ['+', ['case', ['==', ['get', 'affiliation'], 'hostile'], 1, 0]] },
                  },
        colors: layerColors,
        images: symbols,
        sdf: true,
        holdData: true,
        interactive,
        visible,
        tolerance: 6,
        hitLayers: (source) => [`${source}-symbol`, `${source}-cluster`],
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
            const layers: LayerSpecification[] = [
                {
                    id: `${source}-ring`,
                    type: 'circle',
                    source,
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-radius': size * 0.75,
                        'circle-color': resolved.selection,
                        'circle-opacity': ['case', state('selected'), 0.18, 0],
                        'circle-stroke-color': ['case', state('selected'), resolved.selection, resolved.hover],
                        'circle-stroke-width': ['case', state('selected'), 2, 1.25],
                        'circle-stroke-opacity': ['case', state('selected'), 1, state('hover'), 0.8, 0],
                    },
                },
                {
                    id: `${source}-symbol`,
                    type: 'symbol',
                    source,
                    filter: ['!', ['has', 'point_count']],
                    layout: {
                        'icon-image': ['concat', 'wui-track-', ['get', 'kind']],
                        'icon-size': scale,
                        'icon-rotate': ['to-number', ['get', 'heading'], 0],
                        'icon-rotation-alignment': 'map',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                    },
                    paint: {
                        'icon-color': trackColor(resolved, bandNames),
                        'icon-halo-color': resolved.ring,
                        'icon-halo-width': 1.25,
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
                        'circle-radius': ['step', ['get', 'point_count'], 12, 10, 15, 50, 18, 150, 22],
                        'circle-stroke-color': ['case', ['>', ['get', 'hostile'], 0], resolved.hostile, resolved.ring],
                        'circle-stroke-width': ['case', ['>', ['get', 'hostile'], 0], 3, 2],
                    },
                })
            }
            return layers
        },
    })

    // Each track glides from where it was drawn last to where it is now, set on the sources frame by frame.
    const drawn = useRef<Map<string, Track>>(new Map())
    useEffect(() => {
        const before = drawn.current
        const after = tracks
        const set = (shown: readonly Track[]) => {
            const next = shown === after ? data : trackData(shown)
            ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(next.tracks.collection)
            ;(map.getSource(trailSource) as GeoJSONSource | undefined)?.setData(next.trails.collection)
            drawn.current = new Map(shown.map((track) => [track.id, track]))
        }
        const moves = transition > 0 && after.some((track) => before.has(track.id))
        if (!moves) {
            set(after)
            return
        }
        let frame = 0
        let start: number | null = null
        const step = (now: number) => {
            start ??= now
            const t = Math.min(1, (now - start) / transition)
            const eased = 1 - (1 - t) ** 2
            set(t >= 1 ? after : between(before, after, eased))
            if (t < 1) frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
    }, [map, source, trailSource, tracks, data, transition])

    const clustered = clusterOptions !== undefined
    const counts = useRenderedPoints(map, `${source}-cluster`, clustered && visible, (properties) => {
        const clusterId: unknown = properties['cluster_id']
        const count: unknown = properties['point_count']
        return typeof clusterId === 'number' && typeof count === 'number'
            ? { key: String(clusterId), text: compact(locale).format(count) }
            : null
    })
    const names = useRenderedPoints(map, `${source}-symbol`, labels && visible, (properties) => {
        const key: unknown = properties[ID_PROPERTY]
        const label: unknown = properties['label']
        return typeof key === 'string' && typeof label === 'string' && label !== '' ? { key, text: label } : null
    })

    const placed = placeLabels(names, selected, size, groundAt(map))
    useLabelBoxes(`wui-${id}`, LABEL_RANK.track, visible ? placed.map((name) => trackLabelBox(name, size)) : [])

    if (!visible || (counts.length === 0 && names.length === 0)) return null
    return createPortal(
        <>
            {placed.map((name) => (
                <span
                    key={`name-${name.key}`}
                    aria-hidden
                    className={cn(
                        'absolute -translate-y-1/2 rounded-mini bg-card/80 px-1 text-2xs leading-tight whitespace-nowrap text-foreground',
                        name.key === selected && 'bg-card font-medium ring-1 ring-map-selection',
                    )}
                    style={{ left: name.x + labelOffset(size), top: name.y }}
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
