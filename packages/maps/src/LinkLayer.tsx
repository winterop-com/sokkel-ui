'use client'

import type { Feature, LineString } from 'geojson'
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { useLocale, useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { resolveColors } from './color'
import { ID_PROPERTY, useMapContext } from './context'
import {
    idPhase,
    mercator,
    relativeMesh,
    toneIndex,
    toneTriples,
    useEffectFrames,
    useGlEffect,
    type GlMesh,
    type GlProgram,
} from './effects'
import {
    bearing,
    distance,
    formatBearing,
    formatDistance,
    greatCircle,
    rhumbBearing,
    rhumbDistance,
    rhumbMiddle,
    type DistanceUnit,
} from './geodesy'
import type { Bounds, LngLat } from './geometry'
import {
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
import { SELECTION_COLOR } from './scale'
import { MAP_TONE_COLORS, TONE_PROPERTY, toneColor, toneOf, type MapTone } from './tone'

/** How a link runs: straight on the map, or along the great circle, the shortest way over the earth. */
export type LinkPath = 'straight' | 'great-circle'

/** One line between two positions: a track to its objective, a home to a remote host. */
export interface MapLink {
    /** Unique among the layer's links; what the map's selection names. */
    id: string
    /** Where it starts: longitude, latitude. */
    from: LngLat
    /** Where it ends: longitude, latitude. */
    to: LngLat
    /** The color it is drawn in; plain unless given. */
    tone?: MapTone
    /** How it runs, in place of the layer's. */
    path?: LinkPath
    /** Dashed, in place of the layer's. */
    dashed?: boolean
    /** Shows its distance and bearing midway, in place of the layer's. */
    measure?: boolean
    /**
     * How busy it is, from 0 to 1, such as its bytes a second over the busiest link's: with the
     * layer's `flow`, light runs along it faster, more often and brighter the busier it is. Half unless given.
     */
    rate?: number
}

/** The words a link layer says. */
export interface LinkWords {
    /** A link's measure as its chip says it: the distance, then the bearing from where it starts. */
    measured: (distance: string, bearing: string) => string
}

export const LINK_WORDS: LinkWords = {
    measured: (distance, bearing) => `${distance} · ${bearing}`,
}

/** Where a catalog holds a link layer's words, and the arguments its phrases name. */
export const LINK_PART: WordsPart<LinkWords> = { id: 'link', words: LINK_WORDS, args: { measured: 'distance bearing' } }

/** A link layer's phrases as ICU messages in English, for the catalog. */
export const LINK_MESSAGES: WordMessages<LinkWords> = {
    measured: '{distance} · {bearing}',
}

/** A measure chip's box, standing 8 above its link's middle: about seven pixels a letter of the xs text, and its padding. */
export const measureBox = (point: RenderedPoint): PixelBox => {
    const half = (point.text.length * 7 + 12) / 2
    return [point.x - half, point.y - 28, point.x + half, point.y - 8]
}

/** How far apart the positions of a great-circle link are drawn at most, in meters, and the most a link is drawn with. */
const STEP = 50_000
const MOST_STEPS = 64

const readable = (position: readonly number[]) =>
    position.length >= 2 && Number.isFinite(position[0]) && Number.isFinite(position[1]) && Math.abs(position[1]) <= 90

/** What a link measures and where its middle is: along the great circle, or along the straight line on the map. */
export function linkMeasure(
    from: LngLat,
    to: LngLat,
    path: LinkPath = 'great-circle',
): { meters: number; bearing: number; middle: LngLat } {
    if (path === 'straight') return { meters: rhumbDistance(from, to), bearing: rhumbBearing(from, to), middle: rhumbMiddle(from, to) }
    return { meters: distance(from, to), bearing: bearing(from, to), middle: greatCircle(from, to, 2)[1] }
}

/** The positions a link is drawn through: its two ends when straight, or enough of its great circle that it curves smoothly. */
export function linkLine(from: LngLat, to: LngLat, path: LinkPath = 'great-circle'): LngLat[] {
    if (path === 'straight') return [from, to]
    const steps = Math.min(MOST_STEPS, Math.max(1, Math.ceil(distance(from, to) / STEP)))
    return steps === 1 ? [from, to] : greatCircle(from, to, steps)
}

/** How high an arc rises at its middle, as a share of the link's length on the map, when `arc` is true. */
export const ARC_HEIGHT = 0.2

/** The fewest steps an arc is drawn in, so it curves smoothly however short the link. */
export const ARC_STEPS = 32

const radians = (value: number) => (value * Math.PI) / 180
const degrees = (value: number) => (value * 180) / Math.PI
/** How far north a latitude stands on a Mercator map, in degrees of longitude, and back. */
const stretched = (lat: number) => degrees(Math.log(Math.tan(Math.PI / 4 + radians(Math.max(-85, Math.min(85, lat))) / 2)))
const unstretched = (y: number) => Math.max(-85, Math.min(85, degrees(2 * Math.atan(Math.exp(radians(y))) - Math.PI / 2)))

/**
 * A line lifted into an arc: each position moved off the line between its ends, on the map, by
 * `height` of that line's length at the middle and less toward the ends (a half sine), to the
 * north side of it, or to its west where it runs due north or south.
 */
export function arcLine(line: readonly LngLat[], height: number = ARC_HEIGHT): LngLat[] {
    if (line.length < 2 || height === 0) return [...line]
    const points = line.map(([lng, lat]): LngLat => [lng, stretched(lat)])
    const [[x0, y0], [x1, y1]] = [points[0], points[points.length - 1]]
    const chord = Math.hypot(x1 - x0, y1 - y0)
    if (chord === 0) return [...line]
    let [nx, ny] = [-(y1 - y0) / chord, (x1 - x0) / chord]
    if (ny < 0 || (ny === 0 && nx > 0)) [nx, ny] = [-nx, -ny]
    const along = [0]
    for (let index = 1; index < points.length; index += 1) {
        along.push(along[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]))
    }
    const total = along[along.length - 1] || 1
    return points.map(([x, y], index) => {
        const lift = height * chord * Math.sin((Math.PI * along[index]) / total)
        return [x + nx * lift, unstretched(y + ny * lift)]
    })
}

/** The positions an arced link is lifted from: enough of its great circle, or of its straight line on the map. */
function arcBase(from: LngLat, to: LngLat, path: LinkPath): LngLat[] {
    if (path === 'great-circle') return greatCircle(from, to, Math.max(ARC_STEPS, linkLine(from, to).length - 1))
    const [y0, y1] = [stretched(from[1]), stretched(to[1])]
    // The short way round, its longitudes running on past 180 rather than back through 0.
    const across = ((((to[0] - from[0]) % 360) + 540) % 360) - 180
    return Array.from({ length: ARC_STEPS + 1 }, (_, index): LngLat => {
        const f = index / ARC_STEPS
        return [from[0] + across * f, unstretched(y0 + (y1 - y0) * f)]
    })
}

/** Links as the map draws them, and the measures written midway along those that show one. */
export interface LinkData {
    links: PreparedData
    /** Each shown measure at its link's middle, its text the distance and the bearing from where the link starts. */
    measures: PlacedText[]
}

/**
 * Links made ready to draw, as one line each carrying its tone and whether it is dashed; each link's
 * path, dash and measure its own or the layer's, and with `arc` above 0 each line lifted into an arc
 * that high, its measure then written at the arc's middle. A link whose ends cannot be read is left
 * out and counted.
 */
export function linkData(
    links: readonly MapLink[],
    {
        path = 'great-circle',
        dashed = false,
        measure = false,
        unit = 'km',
        locale = 'en-US',
        words = LINK_WORDS,
        arc = 0,
    }: {
        path?: LinkPath
        dashed?: boolean
        measure?: boolean
        unit?: DistanceUnit
        locale?: string
        words?: LinkWords
        arc?: number
    } = {},
): LinkData {
    const features: Feature<LineString>[] = []
    const byId = new Map<string, Feature>()
    const measures: PlacedText[] = []
    let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const link of links) {
        if (!readable(link.from) || !readable(link.to)) continue
        const way = link.path ?? path
        const line = arc > 0 ? arcLine(arcBase(link.from, link.to, way), arc) : linkLine(link.from, link.to, way)
        const feature: Feature<LineString> = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: line },
            properties: { [ID_PROPERTY]: link.id, [TONE_PROPERTY]: toneOf(link.tone), dashed: link.dashed ?? dashed },
        }
        features.push(feature)
        byId.set(link.id, feature)
        for (const [lng, lat] of line) {
            west = Math.min(west, lng)
            east = Math.max(east, lng)
            south = Math.min(south, lat)
            north = Math.max(north, lat)
        }
        if (link.measure ?? measure) {
            const measured = linkMeasure(link.from, link.to, way)
            measures.push({
                key: link.id,
                at: arc > 0 ? line[Math.round((line.length - 1) / 2)] : measured.middle,
                text: words.measured(formatDistance(measured.meters, unit, locale), formatBearing(measured.bearing)),
            })
        }
    }
    const bounds: Bounds | null = features.length === 0 ? null : [west, south, east, north]
    return {
        links: { collection: { type: 'FeatureCollection', features }, byId, bounds, unreadable: links.length - features.length },
        measures,
    }
}

/** How busy a link is unless it says. */
const DEFAULT_RATE = 0.5

/**
 * Each link as a strip of quads for the flow, one for each step of its line, every vertex carrying
 * the step's two ends on the Mercator square, which end and side of the strip it is, how far along
 * the link it stands (0 at `from`, 1 at `to`), the link's rate, its tone and its own start; positions
 * are offsets from the mesh's origin.
 */
export function flowMesh(lines: readonly Feature<LineString>[], rates: ReadonlyMap<string, number>): GlMesh {
    const vertices: number[] = []
    const indices: number[] = []
    for (const feature of lines) {
        const id = String(feature.properties?.[ID_PROPERTY] ?? '')
        const points = (feature.geometry.coordinates as LngLat[]).map(mercator)
        const along = [0]
        for (let index = 1; index < points.length; index += 1) {
            along.push(along[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]))
        }
        const total = along[along.length - 1]
        if (points.length < 2 || !(total > 0)) continue
        const rate = Math.min(1, Math.max(0, rates.get(id) ?? DEFAULT_RATE))
        const tone = toneIndex(toneOf(feature.properties?.[TONE_PROPERTY] as string | undefined))
        const start = idPhase(id)
        for (let index = 0; index + 1 < points.length; index += 1) {
            const [a, b] = [points[index], points[index + 1]]
            const first = vertices.length / 10
            for (const end of [0, 1]) {
                for (const side of [-1, 1]) vertices.push(a[0], a[1], b[0], b[1], end, side, along[index + end] / total, rate, tone, start)
            }
            indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
        }
    }
    return relativeMesh(vertices, 10, [0, 2], indices)
}

/**
 * The flow's shaders: each step of a link is a quad widened across the screen to `u_width`; along it
 * comets run from `from` to `to`, one to three by the link's rate and faster the busier it is, each a
 * bright head (white-hot in the dark scheme) with a tail fading behind it, soft across the strip.
 * Colors are premultiplied, as maplibre blends.
 */
const FLOW_PROGRAM: GlProgram = {
    attributes: [
        ['a_ends', 4],
        ['a_corner', 4],
        ['a_look', 2],
    ],
    vertex: `
in vec4 a_ends;
in vec4 a_corner;
in vec2 a_look;
uniform vec3 u_colors[6];
uniform vec2 u_viewport;
uniform float u_width;
out float v_along;
out float v_side;
out float v_rate;
out float v_start;
out vec3 v_color;
void main() {
    vec4 a = projectTile(a_ends.xy);
    vec4 b = projectTile(a_ends.zw);
    vec2 step = (b.xy / b.w - a.xy / a.w) * u_viewport;
    float size = length(step);
    vec2 direction = size > 0.0 ? step / size : vec2(1.0, 0.0);
    vec4 here = a_corner.x < 0.5 ? a : b;
    here.xy += vec2(-direction.y, direction.x) * a_corner.y * u_width / u_viewport * here.w;
    gl_Position = here;
    v_along = a_corner.z;
    v_side = a_corner.y;
    v_rate = a_corner.w;
    v_start = a_look.y;
    v_color = u_colors[int(a_look.x + 0.5)];
}`,
    fragment: `
in float v_along;
in float v_side;
in float v_rate;
in float v_start;
in vec3 v_color;
uniform float u_time;
uniform float u_opacity;
uniform float u_dark;
void main() {
    float comets = 1.0 + floor(v_rate * 2.999);
    float head = u_time * (0.06 + 0.3 * v_rate) * comets + v_start;
    float behind = fract(head - v_along * comets);
    float tail = clamp(1.0 - behind / 0.5, 0.0, 1.0);
    float glow = tail * tail;
    float across = 1.0 - smoothstep(0.2, 1.0, abs(v_side));
    float alpha = min(1.0, glow * across * (0.45 + 0.55 * v_rate) * u_opacity);
    vec3 color = mix(v_color, vec3(1.0), u_dark * 0.7 * glow * glow * glow);
    fragColor = vec4(color * alpha, alpha);
}`,
}

/** How much of the layer's opacity a line keeps under a flow, unless it is under the pointer or selected. */
/** How much wider than its line a link's flow strip is, in pixels. */
export const FLOW_WIDTH = 3

export const FLOW_LINE = 0.3

/** The moment the flow holds at where motion is reduced, in seconds. */
const STILL_TIME = 1.2

export interface LinkLayerProps {
    /** Unique among the map's layers. */
    id: string
    links: readonly MapLink[]
    /** How each link runs unless the link says. */
    path?: LinkPath
    /** Dashes each link unless the link says. */
    dashed?: boolean
    /** Shows each link's distance and bearing midway unless the link says. */
    measure?: boolean
    /** The unit a measure's distance is written in; whole meters under a kilometer. */
    unit?: DistanceUnit
    /** The width of a link, in pixels. */
    width?: number
    /** The colors of the tones, in place of their tokens. */
    colors?: Partial<Record<MapTone, string>>
    /** How opaque the whole layer is, from 0 to 1. */
    opacity?: number
    visible?: boolean
    /** Whether links answer hover and clicks; a click selects one as the map's selection. */
    interactive?: boolean
    words?: Partial<LinkWords>
    /** Lifts each link into an arc to the north side of it: `true` rises `ARC_HEIGHT` of its length at the middle, a number that share. */
    arc?: boolean | number
    /**
     * Light running along each link from `from` to `to`: comets with fading tails, more, faster and
     * brighter the higher the link's `rate`. It holds still where motion is reduced, and stops while
     * the map is out of sight.
     */
    flow?: boolean
}

/**
 * Lines between two positions, each in its tone over a casing in the card color: straight on the
 * map, or along the great circle, solid or dashed, and with `measure` a chip midway saying the
 * distance and the bearing from where it starts, as the ruler's does, unless it would cover another
 * link's chip, a track's label or a zone's label (the selected link's is placed first, and always).
 * All the links are one source and three style layers however many there are, and a chip is written
 * only while its middle is in view, so hundreds of links stay cheap. The link under the pointer thickens; the selected one is
 * drawn in the selection color. With `arc` the links curve, and with `flow` light runs along them,
 * drawn by a small shader over one mesh of every link, so a frame sets only the time.
 */
export function LinkLayer({
    id,
    links: given,
    path = 'great-circle',
    dashed = false,
    measure = false,
    unit = 'km',
    width = 1.5,
    colors,
    opacity = 1,
    visible = true,
    interactive = true,
    words,
    arc = false,
    flow = false,
}: LinkLayerProps) {
    const { map, overlay, selected, scope, reading, dark } = useMapContext()
    const { measured } = useWords(LINK_PART, words)
    const locale = useLocale()
    const links = useSameContent(given)
    const height = arc === true ? ARC_HEIGHT : arc === false ? 0 : Math.max(0, arc)
    const data = useMemo(
        () => linkData(links, { path, dashed, measure, unit, locale, words: { measured }, arc: height }),
        [links, path, dashed, measure, unit, locale, measured, height],
    )
    const palette = { ...MAP_TONE_COLORS, ...colors, card: 'var(--card)', selection: SELECTION_COLOR }

    const flowing = flow && visible
    const { still } = useEffectFrames(map, flowing)
    const lines = data.links.collection.features as Feature<LineString>[]
    const mesh = useMemo(
        () => (flowing ? flowMesh(lines, new Map(links.map((link) => [link.id, link.rate ?? DEFAULT_RATE]))) : null),
        [flowing, links, lines],
    )
    const tones = { ...MAP_TONE_COLORS, ...colors }
    const tonesKey = JSON.stringify(tones)
    const triples = useMemo(
        () => (flowing ? toneTriples(resolveColors(scope, tones)) : null),
        // `reading` advances when the theme changes, which is when the same CSS colors resolve anew.
        [flowing, scope, tonesKey, reading],
    )

    useGeoJsonLayer({
        id,
        data: data.links,
        colors: palette,
        interactive,
        visible,
        tolerance: 4,
        hitLayers: (source) => [`${source}-line`, `${source}-dashed`],
        layers: (source, resolved): LayerSpecification[] => {
            const ink: ExpressionSpecification = ['case', state('selected'), resolved.selection, toneColor(resolved)]
            const thick: ExpressionSpecification = ['+', width, ['case', state('selected'), 1, state('hover'), 0.75, 0]]
            // Under a flow the lines step back, so the light running along them reads; the link under the pointer or selected does not.
            const shown: ExpressionSpecification | number = flow
                ? ['case', ['any', state('selected'), state('hover')], opacity, FLOW_LINE * opacity]
                : opacity
            return [
                {
                    id: `${source}-casing`,
                    type: 'line',
                    source,
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: {
                        'line-color': resolved.card,
                        'line-width': ['+', thick, 2.5],
                        'line-opacity': 0.8 * (flow ? FLOW_LINE : 1) * opacity,
                    },
                },
                {
                    id: `${source}-line`,
                    type: 'line',
                    source,
                    filter: ['!=', ['get', 'dashed'], true],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: { 'line-color': ink, 'line-width': thick, 'line-opacity': shown },
                },
                {
                    id: `${source}-dashed`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'dashed'], true],
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': ink, 'line-width': thick, 'line-opacity': shown, 'line-dasharray': [3, 2] },
                },
            ]
        },
    })

    const started = useRef<number | null>(null)
    useGlEffect(map, flowing ? `wui-${id}-flow` : null, FLOW_PROGRAM, mesh, (gl, at) => {
        const now = performance.now()
        started.current ??= now
        gl.uniform1f(at('u_time'), still ? STILL_TIME : (now - started.current) / 1000)
        gl.uniform1f(at('u_width'), (width + FLOW_WIDTH) * map.getPixelRatio())
        gl.uniform1f(at('u_opacity'), opacity)
        gl.uniform1f(at('u_dark'), dark ? 1 : 0)
        if (triples !== null) gl.uniform3fv(at('u_colors'), triples)
    })

    const chips = useProjectedPoints(map, data.measures, visible)
    const placed = placeClear(chips, measureBox, selected, useTakenLabels(LABEL_RANK.link))
    useLabelBoxes(`wui-${id}`, LABEL_RANK.link, visible ? placed.map(measureBox) : [])
    if (!visible || placed.length === 0) return null
    return createPortal(
        placed.map((chip) => (
            <span
                key={`link-${chip.key}`}
                className="absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-control bg-card px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground tabular-nums shadow-surface ring-1 ring-foreground/10"
                style={{ left: chip.x, top: chip.y }}
            >
                {chip.text}
            </span>
        )),
        overlay,
    )
}
