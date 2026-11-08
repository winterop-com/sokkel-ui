import type { Feature, FeatureCollection, Point } from 'geojson'
import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'

import { labelAnchor } from './basemap'
import { resolveColors } from './color'
import { useMapContext } from './context'
import { anchorOf, areaOf, autoTolerance, simplifyGeometry } from './geometry'
import {
    CLASS_PROPERTY,
    classColor,
    hatchImage,
    prepareData,
    readValue,
    setPaint,
    state,
    useGeoJsonLayer,
    type FeatureAccessor,
} from './layer'
import {
    AREA_COLOR,
    AREA_FILL,
    AREA_LINE,
    HIGHLIGHT_COLOR,
    NO_DATA_COLOR,
    NO_DATA_HATCH,
    SELECTION_COLOR,
    classOf,
    scaleColors,
    type ColorScale,
} from './scale'

export type { FeatureAccessor } from './layer'

export interface BoundaryLayerProps {
    /** Unique among the map's layers. */
    id: string
    /** Polygons and multipolygons. */
    data: FeatureCollection
    /** Colors each area by its value; without one the areas are drawn as plain boundaries. */
    scale?: ColorScale
    /** Where each area's value is read, for the scale. */
    value?: FeatureAccessor
    /** The property a feature's id is read from when it has no `id` of its own. */
    idProperty?: string
    /** The area color without a scale. */
    color?: string
    /** How opaque the whole layer is, from 0 to 1, so tiles under it can show through. */
    opacity?: number
    visible?: boolean
    /** Whether areas answer hover and clicks. */
    interactive?: boolean
    /**
     * The ids of areas drawn at the middle emphasis, between the selected area and the rest: the
     * areas under the selected one in a hierarchy, or any set the selection brings with it.
     */
    highlighted?: readonly string[]
    /**
     * The name drawn inside each area. Names that would collide are left out, the smaller areas'
     * first, and come back as the map zooms in. Drawn over a basemap with fonts (a vector style).
     */
    label?: FeatureAccessor
    /**
     * Simplifies heavy geometry once, as the data arrives: a tolerance in degrees, or `true` to
     * simplify only past a couple of hundred thousand positions, to a five-thousandth of the extent.
     */
    simplify?: boolean | number
}

/** The feature property the label source stores each area's name under. */
const LABEL_PROPERTY = '__label'
/** The feature property the label source stores each area's rank under: larger areas place first. */
const RANK_PROPERTY = '__rank'

/**
 * Areas on the map: a choropleth when given a scale and a value, plain boundaries otherwise. An
 * area without a value is hatched. The area under the cursor is outlined; the selected one is
 * outlined heavier in the selection color over a halo in the card color, and the `highlighted`
 * ones in the highlight color. Plain boundaries also fill the selected area and the highlighted
 * ones in those colors, as `AREA_EMPHASIS` keys them for a legend. A feature whose geometry cannot
 * be read is left out and counted in the map's note.
 *
 * Every area is one feature of a single source, and hover and selection are feature state, so
 * thousands of areas draw and answer the cursor without any work per area in React.
 */
export function BoundaryLayer({
    id,
    data,
    scale,
    value,
    idProperty,
    color = AREA_COLOR,
    opacity = 1,
    visible = true,
    interactive = true,
    highlighted,
    label,
    simplify = false,
}: BoundaryLayerProps) {
    const simplified = useMemo(() => {
        const tolerance = simplify === false ? 0 : simplify === true ? autoTolerance(data) : simplify
        if (tolerance <= 0) return data
        const features = data.features.map((feature) => ({ ...feature, geometry: simplifyGeometry(feature.geometry, tolerance) }))
        return { ...data, features } as FeatureCollection
    }, [data, simplify])
    const prepared = useMemo(
        () =>
            prepareData(simplified, idProperty, (feature) => {
                if (scale === undefined) return { [CLASS_PROPERTY]: 0 }
                return { [CLASS_PROPERTY]: classOf(scale, value === undefined ? undefined : readValue(feature, value)) ?? -1 }
            }),
        [simplified, idProperty, scale, value],
    )
    const labels = useMemo((): FeatureCollection<Point> | null => {
        if (label === undefined) return null
        const features = simplified.features.flatMap((feature): Feature<Point>[] => {
            const text = readValue(feature, label)
            const at = anchorOf(feature)
            if (text === undefined || text === null || text === '' || at === null) return []
            return [
                {
                    type: 'Feature',
                    properties: { [LABEL_PROPERTY]: String(text), [RANK_PROPERTY]: -areaOf(feature) },
                    geometry: { type: 'Point', coordinates: at },
                },
            ]
        })
        return { type: 'FeatureCollection', features }
    }, [simplified, label])
    useBoundaryLabels(id, labels, visible, opacity)

    const classes = scale === undefined ? [color] : scaleColors(scale)
    const colors = {
        ...Object.fromEntries(classes.map((css, index) => [`class${index}`, css])),
        line: scale === undefined ? AREA_LINE : 'color-mix(in oklab, var(--foreground) 22%, var(--card))',
        ink: 'var(--foreground)',
        selection: SELECTION_COLOR,
        highlight: HIGHLIGHT_COLOR,
        halo: 'var(--card)',
        noData: NO_DATA_COLOR,
        hatch: NO_DATA_HATCH,
    }
    const plain = scale === undefined

    useGeoJsonLayer({
        id,
        data: prepared,
        colors,
        images: (resolved) => ({ 'wui-no-data': hatchImage(resolved.noData, resolved.hatch) }),
        interactive,
        visible,
        highlighted,
        tolerance: 0,
        hitLayers: (source) => [`${source}-fill`, `${source}-no-data`],
        layers: (source, resolved): LayerSpecification[] => {
            const fills = classes.map((_, index) => resolved[`class${index}` as keyof typeof resolved])
            return [
                {
                    id: `${source}-fill`,
                    type: 'fill',
                    source,
                    filter: ['>=', ['get', CLASS_PROPERTY], 0],
                    paint: {
                        'fill-color': plain
                            ? ['case', state('selected'), resolved.selection, state('highlighted'), resolved.highlight, fills[0]]
                            : classColor(fills, resolved.noData),
                        'fill-opacity': plain
                            ? [
                                  '*',
                                  [
                                      'case',
                                      state('selected'),
                                      AREA_FILL.selected,
                                      state('highlighted'),
                                      ['case', state('hover'), AREA_FILL.highlighted + 0.08, AREA_FILL.highlighted],
                                      state('hover'),
                                      AREA_FILL.plain + 0.09,
                                      AREA_FILL.plain,
                                  ],
                                  opacity,
                              ]
                            : 0.88 * opacity,
                    },
                },
                {
                    id: `${source}-no-data`,
                    type: 'fill',
                    source,
                    filter: ['<', ['get', CLASS_PROPERTY], 0],
                    paint: { 'fill-pattern': 'wui-no-data', 'fill-opacity': 0.88 * opacity },
                },
                {
                    id: `${source}-line`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.line, 'line-width': plain ? 1 : 0.8, 'line-opacity': opacity },
                },
                {
                    id: `${source}-outline`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: {
                        'line-color': ['case', state('hover'), resolved.ink, resolved.highlight],
                        'line-width': ['case', state('selected'), 0, state('hover'), 1.25, state('highlighted'), 1.25, 0],
                        'line-opacity': ['*', ['case', state('hover'), 0.75, 0.9], opacity],
                    },
                },
                {
                    id: `${source}-halo`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.halo, 'line-width': ['case', state('selected'), 5, 0], 'line-opacity': opacity },
                },
                {
                    id: `${source}-selected`,
                    type: 'line',
                    source,
                    layout: { 'line-join': 'round' },
                    paint: { 'line-color': resolved.selection, 'line-width': ['case', state('selected'), 2.5, 0], 'line-opacity': opacity },
                },
            ]
        },
    })
    return null
}

/** A size token in pixels, read in the map's scope. */
function tokenPixels(scope: HTMLElement, name: string, fallback: number): number {
    const value = getComputedStyle(scope).getPropertyValue(name).trim()
    const amount = Number.parseFloat(value)
    if (Number.isNaN(amount)) return fallback
    if (value.endsWith('rem')) return amount * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    return amount
}

/** The font the basemap writes its own names in, which its glyph server is sure to carry. */
function basemapFont(map: MapLibreMap): string[] {
    const fonts = (map.getStyle()?.layers ?? []).flatMap((layer) => {
        if (layer.type !== 'symbol' || layer.id.startsWith('wui-')) return []
        const font: unknown = layer.layout?.['text-font']
        if (!Array.isArray(font) || font.length === 0 || !font.every((each) => typeof each === 'string')) return []
        return [{ place: layer.id.startsWith('place'), font: font as string[] }]
    })
    const upright = (font: string[]) => !font.some((name) => /italic|bold/i.test(name))
    const pick = fonts.find((each) => each.place && upright(each.font)) ?? fonts.find((each) => upright(each.font)) ?? fonts[0]
    return pick?.font ?? ['Noto Sans Regular']
}

/**
 * Keeps an area layer's names on the map as a symbol layer over a point source of its own, so
 * maplibre places them and leaves out the ones that collide. The layer is drawn only while the
 * style has a glyph server, and comes back when a basemap brings one.
 */
function useBoundaryLabels(id: string, labels: FeatureCollection<Point> | null, visible: boolean, opacity: number) {
    const { map, scope, reading } = useMapContext()
    const source = `wui-${id}-labels`
    const paint = useMemo(() => {
        const colors = resolveColors(scope, {
            ink: 'color-mix(in oklab, var(--foreground) 88%, var(--card))',
            halo: 'var(--card)',
        })
        return {
            'text-color': colors.ink,
            'text-halo-color': colors.halo,
            'text-halo-width': 1.4,
            'text-halo-blur': 0.4,
            'text-opacity': opacity,
        }
        // `reading` advances when the theme changes, which is when the same CSS colors resolve anew.
    }, [scope, reading, opacity])
    const latest = useRef({ labels, visible, paint })
    useEffect(() => {
        latest.current = { labels, visible, paint }
    })
    const labelled = labels !== null

    useEffect(() => {
        if (!labelled) return
        const sync = () => {
            const current = latest.current
            if (current.labels === null) return
            const drawn = map.getLayer(source) !== undefined
            if (!map.getGlyphs()) {
                if (drawn) map.removeLayer(source)
                return
            }
            if (map.getSource(source) === undefined) map.addSource(source, { type: 'geojson', data: current.labels })
            if (drawn) return
            const spec: SymbolLayerSpecification = {
                id: source,
                type: 'symbol',
                source,
                layout: {
                    'text-field': ['get', LABEL_PROPERTY],
                    'text-font': basemapFont(map),
                    'text-size': tokenPixels(scope, '--chart-text-size', 11),
                    'text-max-width': 8,
                    'text-padding': 3,
                    'symbol-sort-key': ['get', RANK_PROPERTY],
                    visibility: current.visible ? 'visible' : 'none',
                },
                paint: current.paint,
            }
            map.addLayer(spec, labelAnchor(map))
        }
        sync()
        map.on('styledata', sync)
        return () => {
            map.off('styledata', sync)
            if (map.getLayer(source) !== undefined) map.removeLayer(source)
            if (map.getSource(source) !== undefined) map.removeSource(source)
        }
    }, [map, scope, source, labelled])

    useEffect(() => {
        if (labels !== null) (map.getSource(source) as GeoJSONSource | undefined)?.setData(labels)
    }, [map, source, labels])

    useEffect(() => {
        if (map.getLayer(source) === undefined) return
        setPaint(map, source, paint)
        map.setLayoutProperty(source, 'visibility', visible ? 'visible' : 'none')
    }, [map, source, paint, visible])
}
