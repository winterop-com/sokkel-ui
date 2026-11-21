import type { FeatureCollection, LineString } from 'geojson'
import type { LayerSpecification, RasterLayerSpecification, RasterSourceSpecification, StyleSpecification } from 'maplibre-gl'

/** One credit a tile host requires: its words, and the page they link to. */
export interface Credit {
    label: string
    href?: string
}

/**
 * What a map is drawn over. A basemap with neither `style`, `tiles` nor `geometry` is a background
 * in the token colors alone and reaches no network. A vector `style` is drawn under the data with
 * its place names above it; raster `tiles` are drawn under the data; `geometry` is drawn as land
 * with its borders, from outlines already at hand, and reaches no network either. The background
 * keeps showing wherever a tile is missing or fails.
 */
export interface Basemap {
    id: string
    name: string
    /** A MapLibre style document's url. */
    style?: string
    /** Raster tile url templates in `{z}/{x}/{y}` form. */
    tiles?: string[]
    /**
     * Outlines drawn as land in the token colors, with the borders between them, over the ground
     * as sea: such as `loadWorld` from `world`, which `WORLD_BASEMAP` draws. Fetched when the
     * basemap is first drawn.
     */
    geometry?: () => Promise<FeatureCollection>
    /**
     * A small image of the basemap, shown in the switcher: its address, or a function that fetches
     * it, so a page that never opens the switcher fetches no preview.
     */
    preview?: string | (() => Promise<string>)
    /**
     * Whether the basemap is light or dark. Light raster tiles are dimmed in the dark scheme, and a
     * style's place names keep the style's own colors in the scheme it does not match.
     */
    tone?: 'light' | 'dark'
    /** The credits the hosts require, shown in the map's corner while the basemap is drawn. */
    attribution?: Credit[]
    tileSize?: number
    maxZoom?: number
}

/** Two basemaps the map chooses between by the document's scheme, until someone picks one. */
export interface SchemeBasemaps {
    light: Basemap
    dark: Basemap
}

/** The background alone, in the token colors, with no tiles and no network. */
export const BLANK_BASEMAP: Basemap = { id: 'blank', name: 'Blank' }

const OPENFREEMAP_CREDITS: Credit[] = [
    { label: 'OpenFreeMap', href: 'https://openfreemap.org' },
    { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
    { label: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
]

/** A pale street map from OpenStreetMap data, with its place names drawn above the data. */
export const LIGHT_BASEMAP: Basemap = {
    id: 'light',
    name: 'Light',
    style: 'https://tiles.openfreemap.org/styles/positron',
    tone: 'light',
    preview: () => import('./previews/light.jpg').then((image) => image.default),
    attribution: OPENFREEMAP_CREDITS,
}

/** A dark street map for the dark scheme, with its place names drawn above the data. */
export const DARK_BASEMAP: Basemap = {
    id: 'dark',
    name: 'Dark',
    style: 'https://tiles.openfreemap.org/styles/dark',
    tone: 'dark',
    preview: () => import('./previews/dark.jpg').then((image) => image.default),
    attribution: OPENFREEMAP_CREDITS,
}

/** A street map in color, with roads, water, parks and buildings. */
export const STREETS_BASEMAP: Basemap = {
    id: 'streets',
    name: 'Streets',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    tone: 'light',
    preview: () => import('./previews/streets.jpg').then((image) => image.default),
    attribution: OPENFREEMAP_CREDITS,
}

/** NASA's cloud-free Blue Marble mosaic: public domain imagery, sharp to about a region's scale. */
export const SATELLITE_BASEMAP: Basemap = {
    id: 'satellite',
    name: 'Satellite',
    tiles: [
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
    ],
    preview: () => import('./previews/satellite.jpg').then((image) => image.default),
    attribution: [
        { label: 'NASA Blue Marble', href: 'https://earthobservatory.nasa.gov/features/BlueMarble' },
        {
            label: 'NASA GIBS',
            href: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',
        },
    ],
    tone: 'dark',
    maxZoom: 8,
}

/** Whether a basemap choice is a light and dark pair. */
export function isSchemeBasemaps(choice: Basemap | SchemeBasemaps): choice is SchemeBasemaps {
    return 'light' in choice && 'dark' in choice
}

/** The basemap a choice draws in a scheme. */
export function resolveBasemap(choice: Basemap | SchemeBasemaps, dark: boolean): Basemap {
    if (!isSchemeBasemaps(choice)) return choice
    return dark ? choice.dark : choice.light
}

/** The street map in the document's scheme: light or dark. */
export const SCHEME_BASEMAPS: SchemeBasemaps = { light: LIGHT_BASEMAP, dark: DARK_BASEMAP }

/** Every basemap the library offers, in the order a switcher lists them. */
export const BASEMAPS: Basemap[] = [LIGHT_BASEMAP, DARK_BASEMAP, STREETS_BASEMAP, SATELLITE_BASEMAP, BLANK_BASEMAP]

/** The id of the painted background under everything. */
export const GROUND_LAYER_ID = 'wui-ground'

/** The id raster tiles are drawn under, as a source and as a layer. */
export const TILES_LAYER_ID = 'wui-tiles'

/** The id of the veil in the ground color that fades the basemap toward the ground. */
export const VEIL_LAYER_ID = 'wui-veil'

/** The id the graticule is drawn under, as a source and as a layer. */
export const GRATICULE_LAYER_ID = 'wui-graticule'

/** The id a geometry basemap's land is drawn under, as a source and as a layer. */
export const LAND_LAYER_ID = 'wui-land'

/** The id of the borders between a geometry basemap's land. */
export const BORDER_LAYER_ID = 'wui-land-border'

/** The layers a basemap brings, which a basemap change replaces; every other `wui-` layer is the map's own. */
const BASEMAP_IDS = new Set([GROUND_LAYER_ID, TILES_LAYER_ID, VEIL_LAYER_ID, LAND_LAYER_ID, BORDER_LAYER_ID])

/** Whether a layer or source is one a basemap brings, rather than one of the map's own. */
export const isBasemapLayer = (id: string): boolean => BASEMAP_IDS.has(id)

type RasterPaint = NonNullable<RasterLayerSpecification['paint']>

/** Whether a basemap draws anything over the ground. */
export function hasTiles(basemap: Basemap): boolean {
    return basemap.style !== undefined || (basemap.tiles !== undefined && basemap.tiles.length > 0)
}

/**
 * Whether a basemap's place names are inked in the scheme's tokens: when the basemap is as dark as
 * the scheme, or says nothing of its tone. A dark basemap in the light scheme keeps its own names,
 * light over a dark halo, as the style drew them for its ground; a light one in the dark scheme too.
 */
export function inksLabels(basemap: Basemap, dark: boolean): boolean {
    return basemap.tone === undefined || (basemap.tone === 'dark') === dark
}

/** A raster source for tile urls. */
export function rasterSource(basemap: Basemap, tiles: string[]): RasterSourceSpecification {
    return { type: 'raster', tiles, tileSize: basemap.tileSize ?? 256, maxzoom: basemap.maxZoom ?? 19 }
}

/** The paint of raster tiles: light tiles in the dark scheme are dimmed to a ground. */
export function rasterPaint(basemap: Basemap, dark: boolean): RasterPaint {
    const dimmed = dark && basemap.tone === 'light'
    return {
        'raster-saturation': dimmed ? -0.55 : 0,
        'raster-contrast': dimmed ? -0.25 : 0,
        'raster-brightness-min': 0,
        'raster-brightness-max': dimmed ? 0.38 : 1,
        'raster-opacity': dimmed ? 0.8 : 1,
        'raster-fade-duration': 0,
    }
}

/** The style of a basemap without a style document: its raster tiles, or nothing over the ground. */
export function rasterStyle(basemap: Basemap, dark: boolean): StyleSpecification {
    if (basemap.tiles === undefined || basemap.tiles.length === 0) return { version: 8, sources: {}, layers: [] }
    return {
        version: 8,
        sources: { [TILES_LAYER_ID]: rasterSource(basemap, basemap.tiles) },
        layers: [{ id: TILES_LAYER_ID, type: 'raster', source: TILES_LAYER_ID, paint: rasterPaint(basemap, dark) }],
    }
}

/** The style of a geometry basemap: its outlines as land in `land`, with borders in `border`, over the ground. */
export function geometryStyle(data: FeatureCollection, { land, border }: { land: string; border: string }): StyleSpecification {
    return {
        version: 8,
        sources: { [LAND_LAYER_ID]: { type: 'geojson', data } },
        layers: [
            { id: LAND_LAYER_ID, type: 'fill', source: LAND_LAYER_ID, paint: { 'fill-color': land } },
            {
                id: BORDER_LAYER_ID,
                type: 'line',
                source: LAND_LAYER_ID,
                layout: { 'line-join': 'round' },
                paint: { 'line-color': border, 'line-width': 0.6 },
            },
        ],
    }
}

/** What a basemap's style is drawn from, so a change of it is told from a redraw of the same. */
export function basemapKey(basemap: Basemap): string {
    if (basemap.style !== undefined) return basemap.style
    if (basemap.tiles !== undefined && basemap.tiles.length > 0) return basemap.tiles.join(' ')
    return basemap.geometry === undefined ? '' : `geometry:${basemap.id}`
}

const styles = new Map<string, Promise<StyleSpecification>>()

/** A style document, fetched once per url. */
export function loadStyle(url: string): Promise<StyleSpecification> {
    let pending = styles.get(url)
    if (pending === undefined) {
        pending = fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The basemap style at ${url} answered ${response.status}.`)
            return response.json() as Promise<StyleSpecification>
        })
        pending.catch(() => styles.delete(url))
        styles.set(url, pending)
    }
    return pending
}

/**
 * A basemap's style with the map's own layers carried over from the style before it: the ground,
 * the basemap's own layers, a veil that fades them, the map's layers, and the basemap's labels on
 * top. Place names are inked in the foreground over a halo in the ground color, so they read over
 * any data color, unless `inked` is false: then they keep the basemap's own colors. The projection and the sky the map set on the style before are kept, so a globe
 * stays a globe over a new basemap.
 */
export function composeStyle(
    basemap: StyleSpecification,
    previous: StyleSpecification | undefined,
    { ground, ink, opacity, visible, inked = true }: { ground: string; ink: string; opacity: number; visible: boolean; inked?: boolean },
): StyleSpecification {
    const own = (id: string) => id.startsWith('wui-') && !BASEMAP_IDS.has(id)
    // Text needs the basemap's glyph server; a layer of names waits for a basemap that has one.
    const writes = (layer: LayerSpecification) => layer.type === 'symbol' && layer.layout?.['text-field'] !== undefined
    const carried = previous?.layers.filter((layer) => own(layer.id) && (basemap.glyphs !== undefined || !writes(layer))) ?? []
    const carriedSources = Object.fromEntries(Object.entries(previous?.sources ?? {}).filter(([id]) => own(id)))
    const visibility = visible ? 'visible' : 'none'
    const hide = (layer: LayerSpecification) => ({ ...layer, layout: { ...layer.layout, visibility } }) as LayerSpecification
    const under = basemap.layers
        .filter((layer) => layer.type !== 'symbol')
        .map((layer) => (layer.type === 'background' ? layer : hide(layer)))
    const labels = basemap.layers
        .filter((layer) => layer.type === 'symbol')
        .map(hide)
        .map((layer) =>
            inked && layer.type === 'symbol' && layer.id.startsWith('place')
                ? {
                      ...layer,
                      paint: {
                          ...layer.paint,
                          'text-color': ink,
                          'text-halo-color': ground,
                          'text-halo-width': 1.4,
                          'text-halo-blur': 0.4,
                      },
                  }
                : layer,
        )
    return {
        ...basemap,
        projection: previous?.projection ?? basemap.projection,
        sky: previous?.sky ?? basemap.sky,
        sources: { ...basemap.sources, ...carriedSources },
        layers: [
            { id: GROUND_LAYER_ID, type: 'background', paint: { 'background-color': ground } },
            ...under,
            {
                id: VEIL_LAYER_ID,
                type: 'background',
                paint: { 'background-color': ground, 'background-opacity': visible ? 1 - opacity : 1 },
            },
            ...carried,
            ...labels,
        ],
    }
}

/** The basemap layer the map's own layers go under: its first place name layer, if it has one. */
export function labelAnchor(map: { getLayersOrder(): string[]; getLayer(id: string): { type: string } | undefined }): string | undefined {
    return map.getLayersOrder().find((id) => !id.startsWith('wui-') && map.getLayer(id)?.type === 'symbol')
}

/** Meridians and parallels every `step` degrees, sampled finely enough to curve on a globe. */
export function graticule(step = 15): FeatureCollection<LineString> {
    const range = (from: number, to: number, by: number) =>
        Array.from({ length: Math.floor((to - from) / by) + 1 }, (_, index) => from + index * by)
    const meridians = range(-180, 180 - step, step).map((lng) => range(-80, 80, 5).map((lat) => [lng, lat]))
    const parallels = range(-75, 75, step).map((lat) => range(-180, 180, 5).map((lng) => [lng, lat]))
    return {
        type: 'FeatureCollection',
        features: [...meridians, ...parallels].map((coordinates) => ({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
        })),
    }
}
