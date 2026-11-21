import type { Feature, LineString, Point } from 'geojson'
import type {
    ExpressionSpecification,
    FilterSpecification,
    GeoJSONFeatureDiff,
    GeoJSONSource,
    LayerSpecification,
    Map as MapLibreMap,
} from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useReducedMotion } from '@winterop-com/sokkel-ui/hooks/use-reduced-motion'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { TRACK_OUTLINES } from '@winterop-com/sokkel-ui/lib/tracks'
import { useLocale, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { ID_PROPERTY, useMapContext } from './context'
import { bearing as bearingTo, distance, EARTH_RADIUS, normalizeBearing } from './geodesy'
import type { Bounds, LngLat } from './geometry'
import {
    LABEL_RANK,
    nearLongitude,
    overlaps,
    state,
    useGeoJsonLayer,
    useLabelBoxes,
    groundAt,
    useProjectedPoints,
    useRenderedPoints,
    type PixelBox,
    type PlacedText,
    type PreparedData,
    type RenderedPoint,
} from './layer'
import type { MapLegendEntry } from './MapLegend'
import { SELECTION_COLOR } from './scale'

/** Whose a track is: one's own side, the other side, neither, not known yet, or waiting to be judged. */
export type TrackAffiliation = 'friend' | 'hostile' | 'neutral' | 'unknown' | 'pending'

/** What a track is, which picks its symbol. */
export type TrackKind = 'vessel' | 'aircraft' | 'vehicle' | 'sensor' | 'satellite' | 'other'

/** Every affiliation, in the order a legend lists them. */
export const TRACK_AFFILIATIONS: readonly TrackAffiliation[] = ['friend', 'hostile', 'neutral', 'unknown', 'pending']

/** Every kind, in the order a legend lists them. */
export const TRACK_KINDS: readonly TrackKind[] = ['vessel', 'aircraft', 'vehicle', 'sensor', 'satellite', 'other']

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
    /**
     * How fast it goes over the ground, in meters per second. A track with a speed and a heading
     * is moved on along its heading between reports, when the layer's `motion` is on.
     */
    speed?: number
    affiliation: TrackAffiliation
    kind: TrackKind
    /** Written beside the symbol. */
    label?: string
    /** Where it has been, oldest first, drawn as a line that fades into the past up to where it is drawn now. */
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
    satellite: 'Satellite',
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

/**
 * The tracks and their trails as the map draws them: one point per track, each trail as one line
 * through its past positions, and a short line from the trail's end to where its track is now.
 */
export interface TrackData {
    tracks: PreparedData
    trails: PreparedData
    heads: PreparedData
}

/** How many bands a trail can fade in; a track in a later band fades in its affiliation's color. */
const BAND_TONES = 8

/** The tone a trail fades in under the band at a place among the layer's bands. */
const bandTone = (index: number) => `band-${String(index)}`

/**
 * Which of the layer's trail colors a track's trail fades in: its band's, when the layer names
 * that band among its first eight, its affiliation's otherwise. A gradient along a line takes one
 * color a layer, so each tone has a layer of its own.
 */
export function trailTone(track: Pick<Track, 'affiliation' | 'band'>, bands: readonly string[] = []): string {
    const index = track.band === undefined ? -1 : bands.indexOf(track.band)
    return index >= 0 && index < BAND_TONES ? bandTone(index) : track.affiliation
}

/** A track as the point its symbol is drawn at. */
function pointFeature(track: Track, at: LngLat, heading: number | undefined): Feature<Point> {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: at },
        properties: {
            [ID_PROPERTY]: track.id,
            affiliation: track.affiliation,
            kind: track.kind,
            heading: heading !== undefined && Number.isFinite(heading) ? heading : 0,
            label: track.label ?? null,
            band: track.band ?? null,
        },
    }
}

/** A track's trail as one line through its past positions, oldest first, which the map fades along its length. */
function trailFeature(track: Track, path: LngLat[], tone: string): Feature<LineString> {
    return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: path },
        properties: { [ID_PROPERTY]: track.id, affiliation: track.affiliation, band: track.band ?? null, tone },
    }
}

/** The line on from a trail's end to where its track is drawn, which moves with the track while the trail stays. */
function headFeature(track: Track, path: LngLat[]): Feature<LineString> {
    return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: path },
        properties: { [ID_PROPERTY]: track.id, affiliation: track.affiliation, band: track.band ?? null },
    }
}

/** Positions as one line: each beside the one before it, so a line across the antimeridian runs on past 180 rather than back round the world. */
function joined(positions: readonly LngLat[]): LngLat[] {
    const line: LngLat[] = []
    for (const [lng, lat] of positions) {
        const before = line.at(-1)
        line.push([before === undefined ? lng : nearLongitude(lng, before[0]), lat])
    }
    return line
}

/** The positions of a track's trail that can be read, oldest first, as one line. */
const pastOf = (track: Track): LngLat[] => joined((track.trail ?? []).filter(finite))

/** A layer's data with nothing to hit or to fit. */
const drawnOnly = (features: Feature[]): PreparedData => ({
    collection: { type: 'FeatureCollection', features },
    byId: new Map(),
    bounds: null,
    unreadable: 0,
})

/**
 * Tracks as the map draws them. Each track is a point carrying its affiliation, kind, heading and
 * label. Each trail of two positions or more is one line through them, carrying the `tone` it
 * fades in (`trailTone`, by the layer's `bands`), and its head is the line on from its newest
 * position to where the track is now, so the layer moves the head with the track and leaves the
 * trail alone. A track whose position cannot be read is left out and counted; a trail's unreadable
 * positions are skipped. Of two tracks under one id the first is drawn, since the map tells its
 * features apart by their ids.
 */
export function trackData(tracks: readonly Track[], bands: readonly string[] = []): TrackData {
    const points: Feature<Point>[] = []
    const trails: Feature<LineString>[] = []
    const heads: Feature<LineString>[] = []
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
    let unreadable = 0
    for (const track of tracks) {
        if (!finite(track.position)) {
            unreadable += 1
            continue
        }
        if (byId.has(track.id)) continue
        const feature = pointFeature(track, [track.position[0], track.position[1]], track.heading)
        points.push(feature)
        byId.set(track.id, feature)
        extend(track.position)
        const past = pastOf(track)
        if (past.length === 0) continue
        if (past.length > 1) trails.push(trailFeature(track, past, trailTone(track, bands)))
        heads.push(headFeature(track, joined([past[past.length - 1], track.position])))
        past.forEach(extend)
    }
    const bounds: Bounds | null = points.length === 0 ? null : [west, south, east, north]
    return {
        tracks: {
            collection: { type: 'FeatureCollection', features: points },
            byId,
            bounds,
            unreadable,
        },
        trails: drawnOnly(trails),
        heads: drawnOnly(heads),
    }
}

/** The shortest turn from one heading to another, in degrees, from -180 to 180. */
export function turn(from: number, to: number): number {
    return ((((to - from + 180) % 360) + 360) % 360) - 180
}

/** How long a track keeps going on its last report, in milliseconds, unless the layer says. */
const COAST = 60_000
/** How long a moving track takes to settle onto a new report, in milliseconds, unless the layer says. */
const BLEND = 1_000

/** How a layer moves its tracks: whether it moves them on, for how long, and how long each settles. */
export interface TrackPace {
    /** Whether a track with a speed and a heading is moved on between reports. */
    moving: boolean
    /** How long a track keeps going on its last report, in milliseconds. */
    coast: number
    /** How long a moving track takes to settle onto a new report, in milliseconds. */
    blend: number
    /** How long a track that is not moved on takes to glide to a new report, in milliseconds. */
    transition: number
}

/**
 * A track's course from one report: where the report put it, how it goes on from there, and how
 * far from that course it was drawn when the report came, which it sheds as it settles.
 */
export interface TrackCourse {
    /** Where the report put it, its longitude the copy beside where the track was drawn: past 180 across the antimeridian. */
    from: LngLat
    /** The reported heading, in degrees; 0 without one. */
    bearing: number
    /** How far it goes on along its heading, in meters a millisecond; 0 for a track that is not moved on. */
    pace: number
    /** The direction `ahead` is measured along, in degrees: its heading when it is moved on, north otherwise. */
    along: number
    /** How much a degree of longitude narrows at its latitude. */
    narrow: number
    /** How far ahead of the report it was drawn, along its heading, in meters; behind when negative. */
    ahead: number
    /** How far to the right of the heading it was drawn, in meters. */
    aside: number
    /** How far it was drawn turned from the heading, in degrees. */
    turned: number
    /** Whether it waits where it was drawn until its course reaches it, rather than move back. */
    hold: boolean
    /** How long it takes to settle, in milliseconds. */
    settle: number
}

/** Where a track is drawn at one moment. */
export interface TrackDrawn {
    lng: number
    lat: number
    /** In degrees from north; 0 for a track with no heading. */
    heading: number
    /** Whether it has gone past where its report put it, on along its heading. */
    past: boolean
    /** Whether it has come to rest: settled on its course, and gone on for as long as it may. */
    resting: boolean
}

/**
 * The course a report sets a track on. A track with a speed and a heading goes on along its
 * heading at its speed (`moving`); any other stands where the report put it. `was` is where the
 * track was drawn when the report came, with the pace it had: the course starts that far off and
 * sheds it over `blend` (or over `transition`, for a track that is not moved on). A moving track
 * drawn ahead of its report waits for its course to reach it, so it never goes back, unless it is
 * further ahead than it could have run in a `coast`, which is a jump. All of it is reckoned on
 * the sphere, so it holds by the poles and across the antimeridian.
 */
export function plotCourse(
    track: Track,
    was: { lng: number; lat: number; heading?: number; pace?: number } | null,
    { moving, coast, blend, transition }: TrackPace,
): TrackCourse {
    const lat = track.position[1]
    // Beside where it was drawn, and brought back once it has run most of the way round the world.
    let lng = was === null ? track.position[0] : nearLongitude(track.position[0], was.lng)
    if (Math.abs(lng) > 270) lng -= Math.sign(lng) * 360
    const speed = track.speed ?? Number.NaN
    const headed = track.heading !== undefined && Number.isFinite(track.heading)
    const reckoned = moving && headed && Number.isFinite(speed) && speed > 0
    const bearing = headed ? (track.heading ?? 0) : 0
    const along = reckoned ? bearing : 0
    const narrow = Math.max(0.01, Math.cos((lat * Math.PI) / 180))
    const pace = reckoned ? speed / 1000 : 0
    const settle = reckoned ? blend : transition
    let ahead = 0
    let aside = 0
    let turned = 0
    if (was !== null && settle > 0) {
        const away = distance([lng, lat], [was.lng, was.lat])
        const toward = away === 0 ? 0 : ((bearingTo([lng, lat], [was.lng, was.lat]) - along) * Math.PI) / 180
        ahead = away * Math.cos(toward)
        aside = away * Math.sin(toward)
        turned = headed && was.heading !== undefined ? turn(bearing, was.heading) : 0
    }
    const hold = reckoned && ahead > 0 && ahead <= Math.max(pace, was?.pace ?? 0) * coast
    const off = ahead !== 0 || aside !== 0 || turned !== 0
    return { from: [lng, lat], bearing, pace, along, narrow, ahead, aside, turned, hold, settle: off ? settle : 0 }
}

/** Where a course has brought its track `elapsed` milliseconds after its report, written into `out`. */
function follow(course: TrackCourse, elapsed: number, coast: number, out: TrackDrawn): void {
    const since = Math.max(0, elapsed)
    const run = course.pace * Math.min(since, coast)
    const left = since < course.settle ? (1 - since / course.settle) ** 2 : 0
    let ahead = run + course.ahead * left
    if (course.hold && ahead < course.ahead) ahead = course.ahead
    const aside = course.aside * left
    const far = Math.hypot(ahead, aside)
    if (far === 0) {
        out.lng = course.from[0]
        out.lat = course.from[1]
    } else {
        // That far along the great circle, toward where the two offsets point together: over a pole it comes down the far side.
        const toward = (course.along * Math.PI) / 180 + Math.atan2(aside, ahead)
        const start = (course.from[1] * Math.PI) / 180
        const angle = far / EARTH_RADIUS
        const sine = Math.min(1, Math.max(-1, Math.sin(start) * Math.cos(angle) + Math.cos(start) * Math.sin(angle) * Math.cos(toward)))
        const turned = Math.atan2(Math.sin(toward) * Math.sin(angle) * Math.cos(start), Math.cos(angle) - Math.sin(start) * sine)
        out.lng = course.from[0] + (turned * 180) / Math.PI
        out.lat = (Math.asin(sine) * 180) / Math.PI
    }
    out.heading = left === 0 ? course.bearing : normalizeBearing(course.bearing + course.turned * left)
    out.past = course.pace > 0 && ahead > 0
    out.resting = left === 0 && (course.pace === 0 || since >= coast)
}

/**
 * Where a course has brought its track `elapsed` milliseconds after its report: on along its
 * heading for at most `coast`, and as much nearer its course as it has settled, easing out.
 */
export function courseAt(course: TrackCourse, elapsed: number, coast = COAST): TrackDrawn {
    const drawn: TrackDrawn = { lng: 0, lat: 0, heading: 0, past: false, resting: false }
    follow(course, elapsed, coast, drawn)
    return drawn
}

/** How much larger than its size a symbol is drawn at a zoom: the zoom, and the share of the size. */
const ZOOM_SCALE: readonly (readonly [number, number])[] = [
    [3, 0.72],
    [6, 1],
    [11, 1.25],
]

/**
 * How a track's symbol scales with the zoom, as a share of its size: a little smaller far out,
 * where many tracks share the canvas, its size at zoom 6, and a little larger close in.
 */
export function trackScale(zoom: number): number {
    const [first] = ZOOM_SCALE
    if (zoom <= first[0]) return first[1]
    for (let index = 1; index < ZOOM_SCALE.length; index += 1) {
        const [from, low] = ZOOM_SCALE[index - 1]
        const [to, high] = ZOOM_SCALE[index]
        if (zoom <= to) return low + ((zoom - from) / (to - from)) * (high - low)
    }
    return ZOOM_SCALE[ZOOM_SCALE.length - 1][1]
}

/**
 * A length on the canvas that follows the symbols as the zoom scales them: `length` pixels, times
 * what `by` gives for a feature when it is given.
 */
function reach(length: number, scaled: boolean, by?: ExpressionSpecification): number | ExpressionSpecification {
    const at = (share: number) => (by === undefined ? length * share : ['*', length * share, by])
    if (!scaled) return at(1) as number | ExpressionSpecification
    return ['interpolate', ['linear'], ['zoom'], ...ZOOM_SCALE.flatMap(([zoom, share]) => [zoom, at(share)])] as ExpressionSpecification
}

/** The size of a symbol image on a side, in device pixels at twice the CSS pixel; it is drawn at half that. */
const ICON = 48
/** How far the distance field runs either side of a symbol's edge, in device pixels. */
const ICON_BUFFER = 4

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
        const [first, ...rest] = TRACK_OUTLINES[kind]
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

/** The light and the scaling a track layer draws beyond its symbols, each on unless it is turned off. */
export interface TrackEffects {
    /** A soft glow under each symbol, in its color. */
    glow?: boolean
    /** A halo that breathes slowly around the selected track. */
    halo?: boolean
    /** A ring that spreads and fades where a track first appears. */
    ripple?: boolean
    /** A slow, strong pulse under each hostile track. */
    pulse?: boolean
    /** Trails that fade along their length from the symbol's color into nothing; an even line without. */
    fade?: boolean
    /** Symbols a little smaller far out and a little larger close in. */
    scale?: boolean
}

const EFFECTS: Required<TrackEffects> = { glow: true, halo: true, ripple: true, pulse: true, fade: true, scale: true }
const NO_EFFECTS: Required<TrackEffects> = { glow: false, halo: false, ripple: false, pulse: false, fade: false, scale: false }

/** How a layer moves its tracks between reports. */
export interface TrackMotion {
    /** How long a track keeps going on its last report before it stops, in milliseconds. */
    coast?: number
    /** How long a track takes to settle onto a new report's course, in milliseconds. */
    blend?: number
}

/** How far the fastest track moves on the canvas before the map is told, in pixels: less than an eye follows as a step. */
const STEP = 0.25
/** The least a track has moved to be told with the rest, in pixels. */
const LEAST = 0.05
/** How far a track moves before the labels are placed again, in pixels. */
const NAME_STEP = 0.5
/** How far a heading turns before its symbol is turned, in degrees. */
const TURN_STEP = 0.5
/** The least time between two paints of the halo, the ripples and the pulse, in milliseconds: thirty a second. */
const LIGHT_EVERY = 32
/** How long the layer waits for the map to draw what it was told before it tells it more all the same, in milliseconds. */
const PATIENCE = 1_000
/**
 * How long a map of moving tracks goes without coming to rest, in milliseconds: this long after it
 * last rested, the layer lets it rest before it tells it more, so whatever waits on the map (a
 * test, an export) finds it at rest four times a second however fast its tracks move.
 */
const REST_EVERY = 250
/**
 * How long the layer waits for the map to come to rest, in frames the map draws and in
 * milliseconds: a map still loading, or moving something else, cannot, and the layer goes on.
 */
const REST_FRAMES = 6
const REST_PATIENCE = 500
/**
 * How long the trails wait between taking their newest positions, in milliseconds for each trail
 * there is: the map draws a fading line afresh pixel by pixel, so many trails take them less often,
 * and each head runs on from where its trail ends meanwhile.
 */
const TRAILS_EVERY = 4
/** The longest the trails wait, in milliseconds. */
const TRAILS_EVERY_MOST = 8_000
/** How long the selected track's halo takes to breathe out and in again, in milliseconds. */
const BREATH = 3_200
/** How long a new track's ripple spreads, in milliseconds. */
const RIPPLE = 1_800
/** How long one pulse under a hostile track takes, in milliseconds. */
const PULSE = 3_600
/** A pulse's radius as a share of the symbol's size, from its start to its end. */
const PULSE_REACH = [0.8, 2.1] as const
/** The share of a pulse spent swelling to its full strength; it fades for the rest. */
const PULSE_RISE = 0.14

/** A paint property that changes at once, since the layer steps it itself. */
const AT_ONCE = { duration: 0, delay: 0 }

/** What a layer's stage reads of the layer each time it draws. */
interface StageSettings extends TrackPace {
    /** Whether nothing may move: motion is reduced. */
    still: boolean
    /** Whether the layer is drawn. */
    shown: boolean
    trails: boolean
    /** Whether the stage tells where the labels go. */
    names: boolean
    bands: readonly string[]
    selected: string | null
    halo: boolean
    ripple: boolean
    pulse: boolean
    /** A pulse's opacity at its strongest. */
    pulseStrength: number
    size: number
    scale: boolean
}

/** One track on the stage: its course, where it is drawn, and what the map was last told of it. */
interface Mover extends TrackDrawn {
    track: Track
    course: TrackCourse
    /** When its report came, on the page's clock. */
    at: number
    /** When it first appeared, for its ripple. */
    born: number
    /** The readable positions of its trail, and the tone the trail fades in. */
    before: LngLat[]
    tone: string
    /** Whether the trail source holds a line for it, the place in `before` that line ends at, the line it holds, and whether that line is to be set again when the trails next are. */
    trailed: boolean
    trailEnd: number
    line: LngLat[]
    behind: boolean
    /** Whether the head source holds a line for it, whether that line is to be set again, and whether it ran through the reported position. */
    headed: boolean
    stale: boolean
    headPast: boolean
    /** Where the map last had its point, its heading and its label. */
    sentLng: number
    sentLat: number
    sentHeading: number
    nameLng: number
    nameLat: number
    /** How far it has moved on the canvas since the map was told, in pixels squared, and how far it has turned. */
    gap: number
    swing: number
}

/** The changes a source is to be told of together. */
interface Pending {
    add: Feature[]
    remove: string[]
    update: Map<string, GeoJSONFeatureDiff>
}

const pending = (): Pending => ({ add: [], remove: [], update: new Map() })

/** The change held for a feature, made when there is none yet. */
function changeOf(changes: Pending, id: string): GeoJSONFeatureDiff {
    let change = changes.update.get(id)
    if (change === undefined) {
        change = { id }
        changes.update.set(id, change)
    }
    return change
}

/** Sets one property in a feature's change. */
function put(change: GeoJSONFeatureDiff, key: string, value: unknown): void {
    change.addOrUpdateProperties = [...(change.addOrUpdateProperties ?? []), { key, value }]
}

/** Takes a feature out of a source, and with it whatever change was held for it. */
function drop(changes: Pending, id: string): void {
    changes.remove.push(id)
    changes.update.delete(id)
}

/** The line from where a track's trail ends, through any newer positions the trail has yet to take, to where the track is drawn. */
function headOf(mover: Mover): LngLat[] {
    const head = mover.before.slice(mover.trailEnd)
    if (mover.past) head.push(mover.course.from)
    head.push([mover.lng, mover.lat])
    return joined(head)
}

interface TrackStage {
    /** Takes the tracks as the layer now has them: new ones appear, gone ones leave, and each moved one is set on its new course. */
    report: (tracks: readonly Track[]) => void
    /** Draws again after the layer's settings changed, and goes on drawing if anything moves. */
    wake: () => void
    stop: () => void
}

/**
 * When the track layers on one map let it come to rest: when it last rested, and the layers waiting
 * for it to now and since when. Each layer that rests holds the others' moves too, so a map with
 * several layers of moving tracks comes to rest as often as one with a single layer does.
 */
interface RestClock {
    restedAt: number
    resting: Set<object>
    since: number
}
const REST_CLOCKS = new WeakMap<MapLibreMap, RestClock>()
const restClockOf = (map: MapLibreMap): RestClock => {
    let clock = REST_CLOCKS.get(map)
    if (clock === undefined) {
        clock = { restedAt: performance.now(), resting: new Set(), since: 0 }
        REST_CLOCKS.set(map, clock)
    }
    return clock
}

/**
 * What moves a layer's tracks and lights them, frame by frame. It holds each track's course, tells
 * the sources only of what moved far enough to show (the points and the trails' heads in one
 * change each, the trails themselves far less often), steps the halo, the ripples and the pulse,
 * and rests when nothing moves, when the page is hidden and when the map is off the screen. It
 * tells the map of the next moves only once the map has drawn the last, so the map is never told
 * more than it draws, and four times a second it first lets the map come to rest: a map whose
 * tracks never stop is idle again and again, as one of still tracks is.
 */
function trackStage(
    map: MapLibreMap,
    sources: { points: string; trails: string; heads: string },
    read: () => StageSettings,
    publish: (places: PlacedText[]) => void,
): TrackStage {
    const source = sources.points
    const movers = new Map<string, Mover>()
    const ripples = new Set<Mover>()
    const points = pending()
    const lines = pending()
    const heads = pending()
    let filled = false
    let started = 0
    let frame = 0
    let lit = Number.NEGATIVE_INFINITY
    let pulsed = false
    let onscreen = true
    let hostile = 0
    let paced = ''
    let trailing = true
    let trailCount = 0
    let lagging = false
    let trailsAt = Number.NEGATIVE_INFINITY
    let named = true
    /**
     * What the next moves wait for: the map to draw the last change it was told of, the map to come
     * to rest, one frame to pass after it did, or nothing; and when the wait began.
     */
    let wait: 'draw' | 'rest' | 'frame' | 'none' = 'none'
    let waitFrom = 0
    /** How many frames the map has drawn while it was waited on to come to rest. */
    let restless = 0
    /** How many frames the map has drawn, and how many it had drawn, and when it was, when the pulse was last stepped. */
    let frames = 0
    let pulsedAt = -2
    let pulsedWhen = 0
    /** When the map last came to rest, shared with the map's other track layers, and this layer among those waiting for it to. */
    const rest = restClockOf(map)
    const self = {}

    const allowed = (now: StageSettings) => now.shown && !now.still && onscreen && !document.hidden

    /** Tells a source of the changes held for it; whether there were any. */
    const send = (changes: Pending, to: string): boolean => {
        if (changes.add.length === 0 && changes.remove.length === 0 && changes.update.size === 0) return false
        const held = map.getSource(to) as GeoJSONSource | undefined
        void held?.updateData({ remove: changes.remove, add: changes.add, update: [...changes.update.values()] })
        changes.add = []
        changes.remove = []
        changes.update = new Map()
        return held !== undefined
    }

    /**
     * Hears the map draw a frame: once its sources have taken what they were told, the last change
     * is drawn, and the map is let come to rest when it has not for a while and its camera is still.
     */
    const drawn = () => {
        frames += 1
        if (wait === 'rest') {
            restless += 1
            if (restless > REST_FRAMES) unrested(performance.now())
            return
        }
        if (wait !== 'draw') return
        for (const id of [sources.points, sources.trails, sources.heads]) {
            if (map.getSource(id) !== undefined && !map.isSourceLoaded(id)) return
        }
        const time = performance.now()
        wait = time - rest.restedAt >= REST_EVERY && !map.isMoving() ? 'rest' : 'none'
        if (wait === 'rest') {
            if (rest.resting.size === 0) rest.since = time
            rest.resting.add(self)
        }
        waitFrom = time
        restless = 0
    }
    /** Goes on without the map having come to rest, and lets it try again a second later. */
    const unrested = (time: number) => {
        wait = 'none'
        rest.resting.delete(self)
        rest.restedAt = time + 3 * REST_EVERY
    }
    /** Hears the map come to rest: a frame later, so what waits on the map can see it rest, the moves go on. */
    const calmed = () => {
        rest.restedAt = performance.now()
        rest.resting.delete(self)
        if (wait === 'draw' || wait === 'rest') wait = 'frame'
    }
    map.on('render', drawn)
    map.on('idle', calmed)

    /** Steps the halo, the ripples and the pulse; true while any of them goes on. */
    const light = (time: number, now: StageSettings): boolean => {
        const moving = allowed(now)
        const due = time - lit >= LIGHT_EVERY
        if (due) lit = time
        const chosen = moving && now.halo && now.selected !== null && movers.has(now.selected) ? now.selected : null
        if (chosen !== null && due) {
            const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * (time - started)) / BREATH)
            map.setFeatureState({ source, id: chosen }, { breath })
        }
        if (ripples.size > 0 && (due || !moving)) {
            for (const mover of ripples) {
                const spread = moving && now.ripple ? (time - mover.born) / RIPPLE : 1
                if (spread >= 1) ripples.delete(mover)
                map.setFeatureState({ source, id: mover.track.id }, { ripple: spread >= 1 ? 1 : 1 - (1 - spread) ** 2 })
            }
        }
        const layer = `${source}-pulse`
        const pulsing = moving && now.pulse && hostile > 0 && map.getLayer(layer) !== undefined
        // A paint property set leaves the map's style changed for the frame it is drawn in, and a map is not at rest in such
        // a frame: the pulse is stepped only once two frames are drawn since its last step, so the one between them is clean.
        // A map that draws nothing is stepped all the same after a while, which makes it draw.
        if (pulsing && due && (frames - pulsedAt >= 2 || time - pulsedWhen > PATIENCE / 2)) {
            pulsedAt = frames
            pulsedWhen = time
            const beat = ((time - started) % PULSE) / PULSE
            const size = now.size * (now.scale ? trackScale(map.getZoom()) : 1)
            const swell = 1 - (1 - beat) ** 3
            const strength = beat < PULSE_RISE ? beat / PULSE_RISE : ((1 - beat) / (1 - PULSE_RISE)) ** 2
            map.setPaintProperty(layer, 'circle-radius', size * (PULSE_REACH[0] + (PULSE_REACH[1] - PULSE_REACH[0]) * swell), {
                validate: false,
            })
            map.setPaintProperty(layer, 'circle-opacity', now.pulseStrength * strength, { validate: false })
            pulsed = true
        } else if (!pulsing && pulsed) {
            if (map.getLayer(layer) !== undefined) map.setPaintProperty(layer, 'circle-opacity', 0, { validate: false })
            pulsed = false
        }
        return chosen !== null || ripples.size > 0 || pulsing
    }

    /** Brings every track to where it is drawn at `time` and tells the sources of those that moved; `all` tells of every change, however small. */
    const step = (time: number, all: boolean) => {
        if (map.getSource(source) === undefined) return
        const now = read()
        if (now.trails && !trailing) {
            for (const mover of movers.values()) mover.stale = true
            trailsAt = Number.NEGATIVE_INFINITY
        }
        trailing = now.trails
        // A map that does not draw, or cannot come to rest, is not waited on for good.
        if (wait === 'draw' && time - waitFrom > PATIENCE) wait = 'none'
        if (wait === 'rest' && time - waitFrom > REST_PATIENCE) unrested(time)
        // The moves wait; what a report changed never does.
        // Another layer waiting for the map to rest holds these moves too, as long as this layer would wait itself.
        if (rest.resting.size > 0 && time - rest.since > REST_PATIENCE) {
            rest.resting.clear()
            rest.restedAt = time + 3 * REST_EVERY
        }
        const held = !all && (wait !== 'none' || rest.resting.size > 0)
        if (wait === 'frame') wait = 'none'
        let sweep = all
        // The trails take their newest positions together, and the heads then start from where they now end.
        if (!held && now.trails && lagging && time - trailsAt >= Math.min(TRAILS_EVERY_MOST, trailCount * TRAILS_EVERY)) {
            for (const mover of movers.values()) {
                if (!mover.trailed || !mover.behind) continue
                changeOf(lines, mover.track.id).newGeometry = { type: 'LineString', coordinates: mover.before }
                mover.line = mover.before
                mover.behind = false
                mover.trailEnd = mover.before.length - 1
                mover.stale = true
            }
            lagging = false
            trailsAt = time
            sweep = true
        }
        const perDegree = (512 * 2 ** map.getZoom()) / 360
        const squared = (lng: number, lat: number, narrow: number) => (lng * perDegree) ** 2 + ((lat * perDegree) / narrow) ** 2
        let far = 0
        let moving = false
        let owed = false
        for (const mover of movers.values()) {
            if (!mover.resting) {
                follow(mover.course, time - mover.at, now.coast, mover)
                moving ||= !mover.resting
            }
            mover.gap = squared(mover.lng - mover.sentLng, mover.lat - mover.sentLat, mover.course.narrow)
            mover.swing = Math.abs(turn(mover.sentHeading, mover.heading))
            if (mover.gap > far) far = mover.gap
            // A turn is told as a move is, and a track that has come to rest is told exactly where.
            const settled = mover.resting && mover.gap + mover.swing > 0
            if ((mover.swing >= TURN_STEP || settled) && far < STEP * STEP) far = STEP * STEP
            owed ||= settled
        }
        if (!held && (sweep || far >= STEP * STEP)) {
            for (const mover of movers.values()) {
                const id = mover.track.id
                const exact = all || mover.resting
                const moved = exact ? mover.gap > 0 : mover.gap >= LEAST * LEAST
                const turned = exact ? mover.swing > 0 : mover.swing >= TURN_STEP
                if (moved || turned) {
                    const change = changeOf(points, id)
                    if (moved) {
                        change.newGeometry = { type: 'Point', coordinates: [mover.lng, mover.lat] }
                        mover.sentLng = mover.lng
                        mover.sentLat = mover.lat
                    }
                    if (turned) {
                        put(change, 'heading', Math.round(mover.heading * 10) / 10)
                        mover.sentHeading = mover.heading
                    }
                }
                if (mover.headed && now.trails && (moved || mover.stale || mover.past !== mover.headPast)) {
                    changeOf(heads, id).newGeometry = { type: 'LineString', coordinates: headOf(mover) }
                    mover.stale = false
                    mover.headPast = mover.past
                }
                if (!named && now.names && mover.track.label !== undefined) {
                    named = squared(mover.lng - mover.nameLng, mover.lat - mover.nameLat, mover.course.narrow) >= NAME_STEP * NAME_STEP
                }
            }
        }
        const told = [send(points, source), send(lines, sources.trails), send(heads, sources.heads)]
        if (told.includes(true)) {
            wait = 'draw'
            waitFrom = time
        }
        if (named && now.names) {
            const places: PlacedText[] = []
            for (const mover of movers.values()) {
                const text = mover.track.label
                if (text === undefined || text === '') continue
                places.push({ key: mover.track.id, at: [mover.lng, mover.lat], text })
                mover.nameLng = mover.lng
                mover.nameLat = mover.lat
            }
            publish(places)
            named = false
        }
        const lighted = light(time, now)
        const more = moving || lighted || (lagging && now.trails) || (held && owed)
        if (frame === 0 && allowed(now) && more) frame = requestAnimationFrame(tick)
    }

    const tick = () => {
        frame = 0
        step(performance.now(), false)
    }

    const wake = () => {
        named = true
        step(performance.now(), true)
    }

    /**
     * Gives a track that is on the stage the trail its report has. The line the map holds is kept
     * as it is only where the new trail is that same line; where the new trail runs on from the
     * line's end, lost its oldest positions or had one corrected, the line is set again when the
     * trails next are, and the head starts from the line's end meanwhile; a trail that no longer
     * passes the line's end is set at once.
     */
    const retrail = (mover: Mover, track: Track, before: LngLat[], tone: string) => {
        const id = track.id
        const same = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1]
        let end = -1
        if (mover.trailed) {
            const last = mover.line[mover.line.length - 1]
            for (let index = before.length - 1; index >= 0 && end < 0; index -= 1) if (same(before[index], last)) end = index
        }
        mover.before = before
        if (before.length < 2) {
            if (mover.trailed) drop(lines, id)
            mover.trailed = false
            mover.trailEnd = 0
            mover.line = []
            mover.behind = false
        } else if (end < 0) {
            if (mover.trailed) changeOf(lines, id).newGeometry = { type: 'LineString', coordinates: before }
            else lines.add.push(trailFeature(track, before, tone))
            mover.trailed = true
            mover.trailEnd = before.length - 1
            mover.line = before
            mover.behind = false
        } else {
            const kept = mover.line.length === before.length && mover.line.every((position, index) => same(position, before[index]))
            mover.trailEnd = end
            mover.behind = !kept
            lagging ||= mover.behind
        }
        if (before.length > 0 && !mover.headed) heads.add.push(headFeature(track, headOf(mover)))
        else if (before.length === 0 && mover.headed) drop(heads, id)
        mover.headed = before.length > 0
        mover.stale = true
    }

    const report = (tracks: readonly Track[]) => {
        const now = read()
        const time = performance.now()
        const pace = `${String(now.moving)} ${String(now.coast)} ${String(now.blend)} ${String(now.transition)}`
        const repaced = filled && pace !== paced
        paced = pace
        if (!filled) started = time
        const seen = new Set<string>()
        hostile = 0
        trailCount = 0
        for (const track of tracks) {
            if (!finite(track.position) || seen.has(track.id)) continue
            seen.add(track.id)
            if (track.affiliation === 'hostile') hostile += 1
            const known = movers.get(track.id)
            const before = known !== undefined && known.track.trail === track.trail ? known.before : pastOf(track)
            const tone = trailTone(track, now.bands)
            if (before.length > 1) trailCount += 1
            if (known === undefined) {
                const mover: Mover = {
                    track,
                    course: plotCourse(track, null, now),
                    at: time,
                    born: time,
                    before,
                    tone,
                    trailed: before.length > 1,
                    trailEnd: Math.max(0, before.length - 1),
                    line: before.length > 1 ? before : [],
                    behind: false,
                    headed: before.length > 0,
                    stale: false,
                    headPast: false,
                    lng: 0,
                    lat: 0,
                    heading: 0,
                    past: false,
                    resting: false,
                    sentLng: 0,
                    sentLat: 0,
                    sentHeading: 0,
                    nameLng: 0,
                    nameLat: 0,
                    gap: 0,
                    swing: 0,
                }
                follow(mover.course, 0, now.coast, mover)
                mover.sentLng = mover.lng
                mover.sentLat = mover.lat
                mover.sentHeading = mover.heading
                movers.set(track.id, mover)
                named = true
                // The tracks a layer starts with are in its sources already, and appear without a ripple.
                if (!filled) continue
                points.add.push(pointFeature(track, [mover.lng, mover.lat], mover.heading))
                if (mover.trailed) lines.add.push(trailFeature(track, before, tone))
                if (mover.headed) heads.add.push(headFeature(track, headOf(mover)))
                if (now.ripple && allowed(now)) ripples.add(mover)
                continue
            }
            const mover = known
            const was = mover.track
            const moved =
                was.position[0] !== track.position[0] ||
                was.position[1] !== track.position[1] ||
                !Object.is(was.heading, track.heading) ||
                !Object.is(was.speed, track.speed)
            if (moved || repaced) {
                follow(mover.course, time - mover.at, now.coast, mover)
                const headed = was.heading !== undefined && Number.isFinite(was.heading)
                mover.course = plotCourse(
                    track,
                    { lng: mover.lng, lat: mover.lat, heading: headed ? mover.heading : undefined, pace: mover.course.pace },
                    now,
                )
                mover.at = time
                mover.resting = false
                mover.stale = true
            }
            if (was.affiliation !== track.affiliation) {
                put(changeOf(points, track.id), 'affiliation', track.affiliation)
                if (mover.trailed) put(changeOf(lines, track.id), 'affiliation', track.affiliation)
                if (mover.headed) put(changeOf(heads, track.id), 'affiliation', track.affiliation)
            }
            if (was.kind !== track.kind) put(changeOf(points, track.id), 'kind', track.kind)
            if (was.label !== track.label) {
                put(changeOf(points, track.id), 'label', track.label ?? null)
                named = true
            }
            if (was.band !== track.band) {
                put(changeOf(points, track.id), 'band', track.band ?? null)
                if (mover.trailed) put(changeOf(lines, track.id), 'band', track.band ?? null)
                if (mover.headed) put(changeOf(heads, track.id), 'band', track.band ?? null)
            }
            if (tone !== mover.tone && mover.trailed) put(changeOf(lines, track.id), 'tone', tone)
            mover.tone = tone
            mover.track = track
            if (was.trail !== track.trail) retrail(mover, track, before, tone)
        }
        for (const [id, mover] of movers) {
            if (seen.has(id)) continue
            movers.delete(id)
            ripples.delete(mover)
            // Its breath and its ripple go with it, so a track that comes back under its id starts clean.
            if (map.getSource(source) !== undefined) map.removeFeatureState({ source, id })
            drop(points, id)
            if (mover.trailed) drop(lines, id)
            if (mover.headed) drop(heads, id)
            named = true
        }
        filled = true
        step(time, true)
    }

    const observer =
        typeof IntersectionObserver === 'undefined'
            ? undefined
            : new IntersectionObserver((entries) => {
                  onscreen = entries[entries.length - 1]?.isIntersecting ?? true
                  if (onscreen) wake()
              })
    observer?.observe(map.getContainer())
    const shown = () => {
        if (!document.hidden) wake()
    }
    document.addEventListener('visibilitychange', shown)

    return {
        report,
        wake,
        stop: () => {
            cancelAnimationFrame(frame)
            frame = 0
            map.off('render', drawn)
            map.off('idle', calmed)
            rest.resting.delete(self)
            observer?.disconnect()
            document.removeEventListener('visibilitychange', shown)
        },
    }
}

/** A color the map paints at a share of its opacity, keeping its hue, so a fade to nothing never darkens on the way. */
function dim(color: string, share: number): string {
    const read = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(color)
    if (read === null) return share === 0 ? 'transparent' : color
    return `rgba(${read[1]}, ${read[2]}, ${read[3]}, ${String(Number(read[4] ?? 1) * share)})`
}

/** A trail's color along its length: nothing at its oldest end, the color at its newest. */
function fadeAlong(color: string): ExpressionSpecification {
    return [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0,
        dim(color, 0),
        0.4,
        dim(color, 0.16),
        0.75,
        dim(color, 0.5),
        1,
        color,
    ] as ExpressionSpecification
}

/** Every tone a trail can fade in: the affiliations, then a place for each of the first bands. */
const TRAIL_TONES: readonly string[] = [...TRACK_AFFILIATIONS, ...Array.from({ length: BAND_TONES }, (_, index) => bandTone(index))]

export interface TrackLayerProps {
    /** Unique among the map's layers. */
    id: string
    tracks: readonly Track[]
    /** Draws each track's trail. */
    trails?: boolean
    /** Writes each track's label beside it. */
    labels?: boolean
    /** The symbol's size in pixels, at zoom 6 when the symbols scale with the zoom. */
    size?: number
    /** The colors of the affiliations, in place of their tokens. */
    colors?: Partial<Record<TrackAffiliation, string>>
    /**
     * Colors by band, such as altitude bands: a track whose `band` is named here is painted in its
     * color in place of its affiliation's, and one with no band or a band not named here keeps its
     * affiliation's. Any CSS color, a token included. A trail fades in its band's color for the
     * first eight bands.
     */
    bands?: Readonly<Record<string, string>>
    /**
     * Gathers nearby tracks into counted clusters, which zoom in when clicked; a cluster holding a
     * hostile track is ringed in its color. Read once.
     */
    cluster?: boolean | { radius?: number; maxZoom?: number }
    /**
     * Moves each track that has a `speed` and a `heading` on along its heading between reports,
     * frame by frame, for at most `coast` (a minute), and settles it onto each new report over
     * `blend` (a second) without ever moving it back. `false` leaves every track where it was reported.
     */
    motion?: boolean | TrackMotion
    /** How long a track that is not moved on takes to glide from where it was to where it is, in milliseconds; 0 moves it at once. */
    transition?: number
    /** The light around the tracks and their scaling with the zoom: all on, all off, or each by name. */
    effects?: boolean | TrackEffects
    visible?: boolean
    /** Whether tracks answer hover and clicks. */
    interactive?: boolean
}

/**
 * Moving things on the map: each track a symbol for its kind turned to its heading, in its
 * affiliation's color (a token each, `--track-friend` and the rest) ringed in the card color over
 * a soft glow, its label beside it and its trail behind it, fading into the past. A track with a
 * speed and a heading keeps moving between reports, and settles onto each new one; any other glides
 * to where it is over `transition`. The selected track (the map's `selected`, picked by a click) is
 * ringed in the selection color inside a halo that breathes, a new track appears in a ripple and a
 * hostile one pulses. The sources are told only of what moved, in place, so nothing flickers, and
 * with motion reduced nothing moves but to where it was reported. With `cluster`, dense tracks
 * gather into counted clusters.
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
    motion = true,
    transition = 600,
    effects = true,
    visible = true,
    interactive = true,
}: TrackLayerProps) {
    const { map, overlay, selected, dark } = useMapContext()
    const locale = useLocale()
    const reduced = useReducedMotion()
    const bandNames = Object.keys(bands ?? {})
    const bandList = bandNames.join('\n')
    const data = useMemo(() => trackData(tracks, bandList === '' ? [] : bandList.split('\n')), [tracks, bandList])
    const on = effects === true ? EFFECTS : effects === false ? NO_EFFECTS : { ...EFFECTS, ...effects }
    const clusterOptions = cluster === false ? undefined : cluster === true ? {} : cluster
    const clustered = clusterOptions !== undefined
    const palette = { ...TRACK_COLORS, ...colors, ...bandColors(bands) }
    const layerColors = {
        ...palette,
        ring: 'var(--card)',
        selection: SELECTION_COLOR,
        hover: 'color-mix(in oklab, var(--foreground) 55%, var(--card))',
        cluster: 'color-mix(in oklab, var(--foreground) 78%, var(--card))',
    }
    // The light is drawn fainter over a light map, and fainter the more tracks share the canvas.
    const crowd = Math.min(1, Math.max(0.4, Math.sqrt(300 / Math.max(1, tracks.length))))
    const glow = on.glow ? (dark ? 0.42 : 0.24) * crowd : 0
    const trailOpacity = on.fade ? 0.9 : 0.6

    const { source: trailSource } = useGeoJsonLayer({
        id: `${id}-trail`,
        data: data.trails,
        source: { lineMetrics: true },
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
                    'line-opacity': on.fade ? 0 : trailOpacity,
                },
            },
            ...TRAIL_TONES.map((tone, index): LayerSpecification => {
                const tones: Record<string, string | undefined> = resolved
                const band = bandNames[index - TRACK_AFFILIATIONS.length]
                const color = tones[band === undefined ? tone : bandKey(band)]
                return {
                    id: `${source}-fade-${tone}`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'tone'], tone],
                    layout: { 'line-cap': 'butt', 'line-join': 'round' },
                    paint: {
                        'line-gradient': fadeAlong(color ?? resolved.unknown),
                        'line-width': 2,
                        'line-opacity': on.fade ? trailOpacity : 0,
                    },
                }
            }),
        ],
    })

    const { source: headSource } = useGeoJsonLayer({
        id: `${id}-head`,
        data: data.heads,
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
                layout: { 'line-cap': 'butt', 'line-join': 'round' },
                paint: { 'line-color': trackColor(resolved, bandNames), 'line-width': 2, 'line-opacity': trailOpacity },
            },
        ],
    })

    const iconSize = reach(size / (ICON / 2), on.scale)
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
            const single: FilterSpecification = ['!', ['has', 'point_count']]
            const color = trackColor(resolved, bandNames)
            const breath: ExpressionSpecification = ['number', ['feature-state', 'breath'], 0]
            const spread: ExpressionSpecification = ['number', ['feature-state', 'ripple'], 1]
            const layers: LayerSpecification[] = [
                {
                    id: `${source}-pulse`,
                    type: 'circle',
                    source,
                    filter: ['all', single, ['==', ['get', 'affiliation'], 'hostile']],
                    paint: {
                        'circle-color': resolved.hostile,
                        'circle-blur': 0.7,
                        'circle-radius': size * PULSE_REACH[0],
                        'circle-opacity': 0,
                        'circle-radius-transition': AT_ONCE,
                        'circle-opacity-transition': AT_ONCE,
                    },
                },
                {
                    id: `${source}-glow`,
                    type: 'circle',
                    source,
                    filter: single,
                    paint: {
                        'circle-color': color,
                        'circle-blur': 1,
                        'circle-radius': reach(size * 1.1, on.scale),
                        'circle-opacity': glow,
                    },
                },
                {
                    id: `${source}-ripple`,
                    type: 'circle',
                    source,
                    filter: single,
                    paint: {
                        'circle-color': color,
                        'circle-radius': reach(size, on.scale, ['case', ['>=', spread, 1], 0, ['+', 0.45, ['*', 1.9, spread]]]),
                        'circle-opacity': ['*', on.ripple ? 0.18 : 0, ['^', ['-', 1, spread], 2]],
                        'circle-stroke-color': color,
                        'circle-stroke-width': 1.5,
                        'circle-stroke-opacity': ['*', on.ripple ? 0.9 : 0, ['-', 1, spread]],
                    },
                },
                {
                    id: `${source}-halo`,
                    type: 'circle',
                    source,
                    filter: single,
                    paint: {
                        'circle-color': resolved.selection,
                        'circle-blur': 0.65,
                        'circle-radius': reach(size, on.scale, ['case', state('selected'), ['+', 1.05, ['*', 0.75, breath]], 0]),
                        'circle-opacity': on.halo ? ['-', dark ? 0.5 : 0.36, ['*', dark ? 0.3 : 0.22, breath]] : 0,
                    },
                },
                {
                    id: `${source}-ring`,
                    type: 'circle',
                    source,
                    filter: single,
                    paint: {
                        'circle-radius': reach(size * 0.75, on.scale, ['case', ['any', state('selected'), state('hover')], 1, 0]),
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
                    filter: single,
                    layout: {
                        'icon-image': ['concat', 'wui-track-', ['get', 'kind']],
                        'icon-size': iconSize,
                        'icon-rotate': ['to-number', ['get', 'heading'], 0],
                        'icon-rotation-alignment': 'map',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                    },
                    paint: {
                        'icon-color': color,
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

    // The symbols' size is a layout property, which the layer sets itself when it changes.
    const iconKey = JSON.stringify(iconSize)
    useEffect(() => {
        if (map.getLayer(`${source}-symbol`) === undefined) return
        map.setLayoutProperty(`${source}-symbol`, 'icon-size', JSON.parse(iconKey) as number | ExpressionSpecification)
    }, [map, source, iconKey])

    const moving = motion !== false && !reduced
    const pace = motion === true || motion === false ? {} : motion
    const coast = pace.coast ?? COAST
    const blend = reduced ? 0 : (pace.blend ?? BLEND)
    const glide = reduced ? 0 : transition
    const named = labels && visible && !clustered
    const settings: StageSettings = {
        moving,
        coast,
        blend,
        transition: glide,
        still: reduced,
        shown: visible,
        trails,
        names: named,
        bands: bandNames,
        selected,
        halo: on.halo,
        ripple: on.ripple,
        pulse: on.pulse,
        pulseStrength: (dark ? 0.5 : 0.34) * crowd,
        size,
        scale: on.scale,
    }
    const latest = useRef(settings)
    useEffect(() => {
        latest.current = settings
    })

    // The stage moves the tracks and lights them, telling the sources of what moved frame by frame.
    const [places, setPlaces] = useState<PlacedText[]>([])
    const stage = useRef<TrackStage | null>(null)
    useEffect(() => {
        const made = trackStage(map, { points: source, trails: trailSource, heads: headSource }, () => latest.current, setPlaces)
        stage.current = made
        return () => {
            made.stop()
            stage.current = null
        }
    }, [map, source, trailSource, headSource])
    useEffect(() => {
        stage.current?.report(tracks)
    }, [map, source, trailSource, headSource, tracks, bandList, moving, coast, blend, glide])
    useEffect(() => {
        stage.current?.wake()
    }, [map, source, trailSource, headSource, selected, visible, trails, named, reduced, on.halo, on.ripple, on.pulse, on.scale, size])

    const counts = useRenderedPoints(map, `${source}-cluster`, clustered && visible, (properties) => {
        const clusterId: unknown = properties['cluster_id']
        const count: unknown = properties['point_count']
        return typeof clusterId === 'number' && typeof count === 'number'
            ? { key: String(clusterId), text: compact(locale).format(count) }
            : null
    })
    // Gathered tracks are named where the map draws them apart; the rest where the stage draws them.
    const apart = useRenderedPoints(map, `${source}-symbol`, clustered && labels && visible, (properties) => {
        const key: unknown = properties[ID_PROPERTY]
        const label: unknown = properties['label']
        return typeof key === 'string' && typeof label === 'string' && label !== '' ? { key, text: label } : null
    })
    const staged = useProjectedPoints(map, places, named)
    const names = clustered ? apart : staged

    const drawn = size * (on.scale ? trackScale(map.getZoom()) : 1)
    const placed = placeLabels(names, selected, drawn, groundAt(map))
    useLabelBoxes(`wui-${id}`, LABEL_RANK.track, visible ? placed.map((name) => trackLabelBox(name, drawn)) : [])

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
                    style={{ left: name.x + labelOffset(drawn), top: name.y }}
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
