import type { Feature, LineString } from 'geojson'
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'

import { useLocale, useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { ID_PROPERTY, useMapContext } from './context'
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

/** Links as the map draws them, and the measures written midway along those that show one. */
export interface LinkData {
    links: PreparedData
    /** Each shown measure at its link's middle, its text the distance and the bearing from where the link starts. */
    measures: PlacedText[]
}

/**
 * Links made ready to draw, as one line each carrying its tone and whether it is dashed; each link's
 * path, dash and measure its own or the layer's. A link whose ends cannot be read is left out and counted.
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
    }: { path?: LinkPath; dashed?: boolean; measure?: boolean; unit?: DistanceUnit; locale?: string; words?: LinkWords } = {},
): LinkData {
    const features: Feature<LineString>[] = []
    const byId = new Map<string, Feature>()
    const measures: PlacedText[] = []
    let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const link of links) {
        if (!readable(link.from) || !readable(link.to)) continue
        const way = link.path ?? path
        const line = linkLine(link.from, link.to, way)
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
                at: measured.middle,
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
}

/**
 * Lines between two positions, each in its tone over a casing in the card color: straight on the
 * map, or along the great circle, solid or dashed, and with `measure` a chip midway saying the
 * distance and the bearing from where it starts, as the ruler's does, unless it would cover another
 * link's chip, a track's label or a zone's label (the selected link's is placed first, and always).
 * All the links are one source and three style layers however many there are, and a chip is written
 * only while its middle is in view, so hundreds of links stay cheap. The link under the pointer thickens; the selected one is
 * drawn in the selection color.
 */
export function LinkLayer({
    id,
    links,
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
}: LinkLayerProps) {
    const { map, overlay, selected } = useMapContext()
    const { measured } = useWords(LINK_PART, words)
    const locale = useLocale()
    const data = useMemo(
        () => linkData(links, { path, dashed, measure, unit, locale, words: { measured } }),
        [links, path, dashed, measure, unit, locale, measured],
    )
    const palette = { ...MAP_TONE_COLORS, ...colors, card: 'var(--card)', selection: SELECTION_COLOR }

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
            return [
                {
                    id: `${source}-casing`,
                    type: 'line',
                    source,
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: { 'line-color': resolved.card, 'line-width': ['+', thick, 2.5], 'line-opacity': 0.8 * opacity },
                },
                {
                    id: `${source}-line`,
                    type: 'line',
                    source,
                    filter: ['!=', ['get', 'dashed'], true],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: { 'line-color': ink, 'line-width': thick, 'line-opacity': opacity },
                },
                {
                    id: `${source}-dashed`,
                    type: 'line',
                    source,
                    filter: ['==', ['get', 'dashed'], true],
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': ink, 'line-width': thick, 'line-opacity': opacity, 'line-dasharray': [3, 2] },
                },
            ]
        },
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
