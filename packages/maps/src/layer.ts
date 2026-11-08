import type { Feature, FeatureCollection } from 'geojson'
import type {
    ExpressionSpecification,
    GeoJSONSource,
    GeoJSONSourceSpecification,
    LayerSpecification,
    Map as MapLibreMap,
    MapGeoJSONFeature,
} from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'

import { labelAnchor } from './basemap'
import { resolveColors } from './color'
import { ID_PROPERTY, useMapContext } from './context'
import { boundsOf, isReadable, type Bounds } from './geometry'

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

export function prepareData(
    data: FeatureCollection,
    idProperty: string | undefined,
    derive: (feature: Feature) => Record<string, unknown>,
): PreparedData {
    const byId = new Map<string, Feature>()
    const readable = data.features.filter((feature) => isReadable(feature.geometry))
    const features = readable.map((feature, index) => {
        const id = featureId(feature, idProperty) ?? `#${index}`
        byId.set(id, feature)
        return { ...feature, id: undefined, properties: { ...feature.properties, ...derive(feature), [ID_PROPERTY]: id } }
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

    useEffect(() => {
        const { data, layers, images } = latest.current
        for (const [name, image] of Object.entries(images?.(latestColors.current) ?? {})) {
            if (map.hasImage(name)) map.updateImage(name, image)
            else map.addImage(name, image, { pixelRatio: 2 })
        }
        map.addSource(source, { type: 'geojson', data: data.collection, promoteId: ID_PROPERTY, ...latest.current.source })
        added.current = data.collection
        const specs = layers(source, latestColors.current)
        const below = labelAnchor(map)
        const restore = () => {
            for (const [name, image] of Object.entries(latest.current.images?.(latestColors.current) ?? {})) {
                if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: 2 })
            }
        }
        map.on('styledata', restore)
        const visibility = latest.current.visible ? 'visible' : 'none'
        for (const spec of specs) map.addLayer({ ...spec, layout: { ...spec.layout, visibility } } as LayerSpecification, below)
        return () => {
            map.off('styledata', restore)
            for (const spec of [...specs].reverse()) if (map.getLayer(spec.id) !== undefined) map.removeLayer(spec.id)
            if (map.getSource(source) !== undefined) map.removeSource(source)
            added.current = null
        }
    }, [map, source])

    useEffect(() => {
        if (added.current === options.data.collection) return
        ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(options.data.collection)
        added.current = options.data.collection
    }, [map, source, options.data.collection])

    const paintKey = JSON.stringify(options.layers(source, resolved).map((spec) => ('paint' in spec ? spec.paint : null)))
    useEffect(() => {
        for (const [name, image] of Object.entries(latest.current.images?.(resolved) ?? {})) {
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
