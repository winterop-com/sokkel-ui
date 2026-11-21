import type { Feature, FeatureCollection } from 'geojson'
import type {
    ExpressionSpecification,
    GeoJSONSource,
    GeoJSONSourceSpecification,
    LayerSpecification,
    Map as MapLibreMap,
    MapGeoJSONFeature,
} from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

/**
 * The value as it was last given while what it holds is the same, so what a layer derives from it
 * (geometry, and the data the map is told of) is derived again only when it changed: an app may
 * build its zones, cones or links afresh on every render. It compares the value as JSON.
 */
export function useSameContent<T>(value: T): T {
    const key = JSON.stringify(value)
    const [kept, setKept] = useState({ value, key })
    if (kept.key === key) return kept.value
    setKept({ value, key })
    return value
}

import { labelAnchor } from './basemap'
import { resolveColors } from './color'
import { ID_PROPERTY, useMapContext } from './context'
import { boundsOf, isReadable, type Bounds, type LngLat } from './geometry'

/** Where a value is read from a feature: a property's name, or a function of the feature. */
export type FeatureAccessor = string | ((feature: Feature) => unknown)

/** The feature property a layer stores each feature's class under; -1 is no data. */
export const CLASS_PROPERTY = '__class'

export function readValue(feature: Feature, accessor: FeatureAccessor): unknown {
    return typeof accessor === 'function' ? accessor(feature) : feature.properties?.[accessor]
}

/** A feature's id: its own `id`, else the named property. */
function featureId(feature: Feature, idProperty: string | undefined): string | null {
    const id = feature.id ?? (idProperty === undefined ? undefined : feature.properties?.[idProperty])
    return id === undefined || id === null ? null : String(id)
}

/** A layer's data as the map draws it: each feature carries its id and whatever else is derived. */
export interface PreparedData {
    collection: FeatureCollection
    byId: ReadonlyMap<string, Feature>
    bounds: Bounds | null
    /** How many features were left out because their geometry could not be read. */
    unreadable: number
}

/**
 * A layer's data made ready to draw: each readable feature carries its id and what `derive` gives
 * it, and `parts`, when given, draws a feature as several, such as one per kind of geometry, each
 * keeping the feature's id so hover and selection reach them all.
 */
export function prepareData(
    data: FeatureCollection,
    idProperty: string | undefined,
    derive: (feature: Feature) => Record<string, unknown>,
    parts?: (feature: Feature) => Feature[],
): PreparedData {
    const byId = new Map<string, Feature>()
    const readable = data.features.filter((feature) => isReadable(feature.geometry))
    const features = readable.flatMap((feature, index) => {
        const id = featureId(feature, idProperty) ?? `#${index}`
        byId.set(id, feature)
        const drawn: Feature = {
            ...feature,
            id: undefined,
            properties: {
                ...feature.properties,
                ...derive(feature),
                [ID_PROPERTY]: id,
            },
        }
        return parts === undefined ? [drawn] : parts(drawn)
    })
    return {
        collection: { type: 'FeatureCollection', features },
        byId,
        bounds: boundsOf([{ type: 'FeatureCollection', features: readable }]),
        unreadable: data.features.length - readable.length,
    }
}

/** A `match` on the class property: each class's color, and `fallback` for no data. */
export function classColor(colors: string[], fallback: string): ExpressionSpecification | string {
    if (colors.length === 0) return fallback
    return [
        'match',
        ['get', CLASS_PROPERTY],
        ...colors.flatMap((color, index) => [index, color]),
        fallback,
    ] as unknown as ExpressionSpecification
}

/** Set every paint property of a style layer. */
export function setPaint(map: MapLibreMap, layer: string, paint: object): void {
    for (const [property, value] of Object.entries(paint)) {
        map.setPaintProperty(layer, property as Parameters<MapLibreMap['setPaintProperty']>[1], value)
    }
}

/** True while a feature has the named feature state. */
export function state(name: 'hover' | 'selected' | 'highlighted'): ExpressionSpecification {
    return ['boolean', ['feature-state', name], false]
}

interface LayerOptions<C extends string> {
    /** The layer's id, which its source and style layers are named after. */
    id: string
    data: PreparedData
    source?: Omit<GeoJSONSourceSpecification, 'type' | 'data'>
    /** The CSS colors the style layers paint with, resolved again whenever the theme changes. */
    colors: Record<C, string>
    /** The style layers, bottom first, painted with the resolved colors. */
    layers: (source: string, colors: Record<C, string>) => LayerSpecification[]
    /** Images the style layers use, drawn with the resolved colors. */
    images?: (colors: Record<C, string>) => Record<string, ImageData>
    /** Whether the images are signed distance fields, which a layer colors with `icon-color`. */
    sdf?: boolean
    /**
     * Whether the layer sets new data on its source itself, such as while it eases features from
     * where they were to where they are; the source is filled from `data` only when it is added.
     */
    holdData?: boolean
    interactive: boolean
    visible: boolean
    /** The ids drawn at the middle emphasis, such as the features under the selected one. */
    highlighted?: readonly string[]
    hitLayers: (source: string) => string[]
    tolerance: number
    click?: (feature: MapGeoJSONFeature, source: string) => boolean
}

/**
 * Keeps a GeoJSON source and its style layers on the map for as long as the component is mounted:
 * new data is set in place, a theme change repaints in place, the layer registers for hits and
 * fitting, the selected feature carries the `selected` feature state and the highlighted ones the
 * `highlighted` state.
 */
export function useGeoJsonLayer<C extends string>(options: LayerOptions<C>): { source: string } {
    const { map, scope, reading, selected, register } = useMapContext()
    const source = `wui-${options.id}`
    const colorKey = JSON.stringify(options.colors)
    const resolved = useMemo(
        () => resolveColors(scope, options.colors),
        // `reading` advances when the theme changes, which is when the same CSS colors resolve anew.
        [scope, colorKey, reading],
    )
    const latest = useRef(options)
    const latestColors = useRef(resolved)
    const added = useRef<FeatureCollection | null>(null)
    useEffect(() => {
        latest.current = options
        latestColors.current = resolved
    })
    // Drawing an image reads a canvas back, which is slow, and the style changes many times a second
    // while anything on the map moves: each set of colors is drawn once.
    const drawnImages = useRef<{
        colors: Record<C, string>
        images: Record<string, ImageData>
    } | null>(null)
    const imagesFor = (colors: Record<C, string>): Record<string, ImageData> => {
        if (drawnImages.current?.colors !== colors)
            drawnImages.current = {
                colors,
                images: latest.current.images?.(colors) ?? {},
            }
        return drawnImages.current.images
    }

    useEffect(() => {
        const { data, layers } = latest.current
        for (const [name, image] of Object.entries(imagesFor(latestColors.current))) {
            if (map.hasImage(name)) map.updateImage(name, image)
            else
                map.addImage(name, image, {
                    pixelRatio: 2,
                    sdf: latest.current.sdf === true,
                })
        }
        map.addSource(source, {
            type: 'geojson',
            data: data.collection,
            promoteId: ID_PROPERTY,
            ...latest.current.source,
        })
        added.current = data.collection
        const specs = layers(source, latestColors.current)
        const below = labelAnchor(map)
        const restore = () => {
            for (const [name, image] of Object.entries(imagesFor(latestColors.current))) {
                if (!map.hasImage(name))
                    map.addImage(name, image, {
                        pixelRatio: 2,
                        sdf: latest.current.sdf === true,
                    })
            }
        }
        map.on('styledata', restore)
        const visibility = latest.current.visible ? 'visible' : 'none'
        for (const spec of specs)
            map.addLayer(
                {
                    ...spec,
                    layout: { ...spec.layout, visibility },
                } as LayerSpecification,
                below,
            )
        return () => {
            map.off('styledata', restore)
            for (const spec of [...specs].reverse()) if (map.getLayer(spec.id) !== undefined) map.removeLayer(spec.id)
            if (map.getSource(source) !== undefined) map.removeSource(source)
            added.current = null
        }
    }, [map, source])

    const { holdData } = options
    useEffect(() => {
        if (holdData === true || added.current === options.data.collection) return
        ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(options.data.collection)
        added.current = options.data.collection
    }, [map, source, options.data.collection, holdData])

    const paintKey = JSON.stringify(options.layers(source, resolved).map((spec) => ('paint' in spec ? spec.paint : null)))
    useEffect(() => {
        for (const [name, image] of Object.entries(imagesFor(resolved))) {
            if (map.hasImage(name)) map.updateImage(name, image)
        }
        for (const spec of latest.current.layers(source, resolved)) {
            if (map.getLayer(spec.id) === undefined || !('paint' in spec) || spec.paint === undefined) continue
            setPaint(map, spec.id, spec.paint)
        }
    }, [map, source, resolved, paintKey])

    const { visible } = options
    useEffect(() => {
        for (const spec of latest.current.layers(source, latestColors.current)) {
            if (map.getLayer(spec.id) !== undefined) map.setLayoutProperty(spec.id, 'visibility', visible ? 'visible' : 'none')
        }
    }, [map, source, visible])

    const { interactive, tolerance } = options
    const { byId, bounds, unreadable } = options.data
    useEffect(() => {
        const { hitLayers, click } = latest.current
        return register(source, {
            source,
            hitLayers: interactive ? hitLayers(source) : [],
            tolerance,
            features: byId,
            bounds,
            unreadable,
            click: click === undefined ? undefined : (feature) => click(feature, source),
        })
    }, [register, source, interactive, tolerance, byId, bounds, unreadable])

    useEffect(() => {
        if (selected === null || !byId.has(selected)) return
        map.setFeatureState({ source, id: selected }, { selected: true })
        return () => {
            if (map.getSource(source) !== undefined) map.setFeatureState({ source, id: selected }, { selected: false })
        }
    }, [map, source, selected, byId])

    const highlightKey = (options.highlighted ?? []).join('\n')
    useEffect(() => {
        const ids = highlightKey === '' ? [] : highlightKey.split('\n').filter((id) => byId.has(id))
        for (const id of ids) map.setFeatureState({ source, id }, { highlighted: true })
        return () => {
            if (map.getSource(source) === undefined) return
            for (const id of ids) map.setFeatureState({ source, id }, { highlighted: false })
        }
    }, [map, source, highlightKey, byId])

    return { source }
}

/** A diagonal hatch tile, drawn at twice the CSS pixel size, over a ground color. */
export function hatchImage(ground: string, line: string): ImageData {
    const size = 12
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (context === null) return new ImageData(size, size)
    context.fillStyle = ground
    context.fillRect(0, 0, size, size)
    context.strokeStyle = line
    context.lineWidth = 2
    context.beginPath()
    for (const offset of [-size, 0, size]) {
        context.moveTo(offset, size)
        context.lineTo(offset + size, 0)
    }
    context.stroke()
    return context.getImageData(0, 0, size, size)
}

/** A point a layer draws, where it stands on the map's canvas, with what is written beside it. */
export interface RenderedPoint {
    key: string
    x: number
    y: number
    text: string
}

/** Whether the position read back from where a place is drawn is that place: on a globe, one on the far side reads back as the ground in front of it. */
const facing = (back: { lng: number; lat: number }, lng: number, lat: number): boolean =>
    Math.abs(back.lat - lat) < 1 && Math.abs(((((back.lng - lng) % 360) + 540) % 360) - 180) < 1

/**
 * Keeps what an overlay writes measured against the map, and gives back what stops it. Each frame
 * the map draws is measured as it is drawn and written out at once, before the frame is shown, so
 * what is written stays on its place through a flight or a glide: a measure put off to the next
 * frame runs after the map has drawn that one too, and lands every other frame. The first measure,
 * and one a `later` event asks for outside a frame, runs on the next frame.
 */
function watchMap(
    map: MapLibreMap,
    later: readonly ('move' | 'resize')[],
    measure: () => RenderedPoint[] | null,
    write: (update: (previous: RenderedPoint[]) => RenderedPoint[]) => void,
): () => void {
    let frame = 0
    const keep = (next: RenderedPoint[]) => (previous: RenderedPoint[]) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next
    const drawn = () => {
        cancelAnimationFrame(frame)
        frame = 0
        const next = measure()
        if (next !== null) flushSync(() => write(keep(next)))
    }
    const soon = () => {
        if (frame !== 0) return
        frame = requestAnimationFrame(() => {
            frame = 0
            const next = measure()
            if (next !== null) write(keep(next))
        })
    }
    soon()
    map.on('render', drawn)
    for (const event of later) map.on(event, soon)
    return () => {
        cancelAnimationFrame(frame)
        map.off('render', drawn)
        for (const event of later) map.off(event, soon)
    }
}

/**
 * The points a style layer draws as the map now shows them, each read into a key and its text (or
 * left out by `read` giving null), measured again after every frame the map draws and sorted by
 * key, so a layer can write beside its points in the overlay: a cluster's count, a track's name.
 * Each frame is measured as the map draws it, so what the overlay writes stays on its points while
 * the map flies or glides. A point on the far side of a globe is left out.
 */
export function useRenderedPoints(
    map: MapLibreMap,
    layer: string,
    enabled: boolean,
    read: (properties: Record<string, unknown>) => { key: string; text: string } | null,
): RenderedPoint[] {
    const [points, setPoints] = useState<RenderedPoint[]>([])
    const readNow = useRef(read)
    useEffect(() => {
        readNow.current = read
    })
    useEffect(() => {
        if (!enabled) {
            setPoints((previous) => (previous.length === 0 ? previous : []))
            return
        }
        const measure = () => {
            if (map.getLayer(layer) === undefined) return null
            const seen = new Map<string, RenderedPoint>()
            for (const feature of map.queryRenderedFeatures({ layers: [layer] })) {
                if (feature.geometry.type !== 'Point') continue
                const found = readNow.current(feature.properties)
                if (found === null || seen.has(found.key)) continue
                const [lng, lat] = feature.geometry.coordinates
                const point = map.project([lng, lat])
                // On a globe a point on the far side is found too, and lands on the near side's ground.
                if (!facing(map.unproject([point.x, point.y]), lng, lat)) continue
                seen.set(found.key, {
                    ...found,
                    x: Math.round(point.x),
                    y: Math.round(point.y),
                })
            }
            return [...seen.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
        }
        return watchMap(map, [], measure, setPoints)
    }, [map, layer, enabled])
    return points
}

/**
 * Whether a place on the canvas lies over the ground: the position read there is drawn back at it.
 * Past the rim of a globe it is not, so a name whose box ends there would hang over space.
 */
export const groundAt =
    (map: MapLibreMap) =>
    (x: number, y: number): boolean => {
        const there = map.unproject([x, y])
        const back = map.project([there.lng, there.lat])
        return Math.abs(back.x - x) < 2 && Math.abs(back.y - y) < 2
    }

/** A box on the map's canvas: left, top, right and bottom, in pixels. */
export type PixelBox = [number, number, number, number]

/** Whether two boxes on the canvas cover one another. */
export const overlaps = (a: PixelBox, b: PixelBox): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

/**
 * The points whose boxes cover none placed before them, nor any box already `taken`, the `first`
 * key's placed first and always, then in the order given, so labels written in an overlay never
 * sit on one another, or on what another layer wrote first.
 */
export function placeClear(
    points: readonly RenderedPoint[],
    box: (point: RenderedPoint) => PixelBox,
    first: string | null = null,
    taken: readonly PixelBox[] = [],
): RenderedPoint[] {
    const ordered = [...points].sort((a, b) => Number(b.key === first) - Number(a.key === first))
    const held: PixelBox[] = [...taken]
    const placed: RenderedPoint[] = []
    for (const point of ordered) {
        const own = box(point)
        if (point.key !== first && held.some((other) => overlaps(own, other))) continue
        held.push(own)
        placed.push(point)
    }
    return placed
}

/**
 * Which overlay labels yield to which: a layer's labels keep clear of those of every layer of a lower
 * rank, so a zone's name gives way to a track's, a link's measure to both and a point's name to all three.
 */
export const LABEL_RANK = { track: 0, zone: 1, link: 2, point: 3 } as const

/**
 * The boxes a map's layers have written their labels in, by layer and rank, so a layer of a later
 * rank places its own labels clear of them without knowing which layers wrote them.
 */
export interface LabelRegistry {
    /** Sets the boxes a layer's labels take now; an empty list takes them down. */
    set: (key: string, rank: number, boxes: readonly PixelBox[]) => void
    /** The boxes the labels of every layer of a lower rank take: the same list until one of them changes. */
    before: (rank: number) => readonly PixelBox[]
    subscribe: (listener: () => void) => () => void
}

const NO_BOXES: readonly PixelBox[] = []

export function labelRegistry(): LabelRegistry {
    const entries = new Map<string, { rank: number; boxes: readonly PixelBox[]; text: string }>()
    const listeners = new Set<() => void>()
    const cache = new Map<number, readonly PixelBox[]>()
    return {
        set: (key, rank, boxes) => {
            const held = entries.get(key)
            const text = JSON.stringify(boxes)
            if (boxes.length === 0 ? held === undefined : held?.rank === rank && held.text === text) return
            if (boxes.length === 0) entries.delete(key)
            else entries.set(key, { rank, boxes, text })
            cache.clear()
            for (const listener of listeners) listener()
        },
        before: (rank) => {
            let found = cache.get(rank)
            if (found === undefined) {
                const boxes = [...entries.values()].filter((entry) => entry.rank < rank).flatMap((entry) => entry.boxes)
                found = boxes.length === 0 ? NO_BOXES : boxes
                cache.set(rank, found)
            }
            return found
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
    }
}

/**
 * Overlay labels that keep clear of other layers': the boxes the labels of the map's layers of a
 * lower rank take, followed as they change, and `useLabelBoxes` to write back the boxes this
 * layer's own labels take, for the layers of a higher rank.
 */
export function useTakenLabels(rank: number): readonly PixelBox[] {
    const { labels } = useMapContext()
    const read = () => labels.before(rank)
    return useSyncExternalStore(labels.subscribe, read, read)
}

/** Writes the boxes a layer's labels take to the map's registry, and takes them down when the layer goes. */
export function useLabelBoxes(key: string, rank: number, boxes: readonly PixelBox[]): void {
    const { labels } = useMapContext()
    const text = JSON.stringify(boxes)
    useEffect(() => {
        labels.set(key, rank, JSON.parse(text) as PixelBox[])
    }, [labels, key, rank, text])
    useEffect(() => () => labels.set(key, rank, []), [labels, key, rank])
}

/**
 * A longitude as the copy of it nearest another, which may lie past 180: what keeps a line whole
 * across the antimeridian, and a place in the copy of the world a camera looks at.
 */
export function nearLongitude(lng: number, to: number): number {
    const apart = lng - to
    return apart >= -180 && apart <= 180 ? lng : to + ((((apart + 180) % 360) + 360) % 360) - 180
}

/** A place an overlay writes beside, by its position on the map. */
export interface PlacedText {
    key: string
    at: LngLat
    text: string
}

/**
 * Places on the map where the canvas now shows them, measured again as the map draws each frame
 * and after every move, for an overlay to write at: a zone's name at its middle, a ring's distance, a
 * link's measure. A place off the canvas, by more than `margin` pixels, is left out, so hundreds of
 * places cost only the ones in view, and so is a place on the far side of a globe.
 */
export function useProjectedPoints(map: MapLibreMap, places: readonly PlacedText[], enabled: boolean, margin = 48): RenderedPoint[] {
    const [points, setPoints] = useState<RenderedPoint[]>([])
    const latest = useRef(places)
    useEffect(() => {
        latest.current = places
    })
    const key = places.map((place) => `${place.key}:${String(place.at[0])},${String(place.at[1])}:${place.text}`).join('\n')
    useEffect(() => {
        if (!enabled) {
            setPoints((previous) => (previous.length === 0 ? previous : []))
            return
        }
        const measure = () => {
            const canvas = map.getContainer()
            const [width, height] = [canvas.clientWidth, canvas.clientHeight]
            const next: RenderedPoint[] = []
            // Each place is written in the copy of the world the camera looks at.
            const middle = map.getCenter().lng
            for (const place of latest.current) {
                const lng = nearLongitude(place.at[0], middle)
                const point = map.project([lng, place.at[1]])
                const [x, y] = [Math.round(point.x), Math.round(point.y)]
                const inView = width === 0 || (x >= -margin && y >= -margin && x <= width + margin && y <= height + margin)
                if (inView && facing(map.unproject([point.x, point.y]), lng, place.at[1]))
                    next.push({ key: place.key, x, y, text: place.text })
            }
            return next
        }
        return watchMap(map, ['move', 'resize'], measure, setPoints)
    }, [map, enabled, key])
    return points
}
