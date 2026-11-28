'use client'

import type { Feature } from 'geojson'
import { Download, Expand, Globe, LocateFixed, Map as MapIcon, Minus, Plus, Shrink } from 'lucide-react'
import type { Map as MapLibreMap, MapGeoJSONFeature, PaddingOptions, PointLike, StyleSpecification } from 'maplibre-gl'
import { Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'

import { Link } from '@winterop-com/sokkel-ui/Link'
import { useLongWait } from '@winterop-com/sokkel-ui/Loaders'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { download } from '@winterop-com/sokkel-ui/lib/download'
import { enterFullscreen, exitFullscreen, fullscreenElement, subscribeFullscreen } from '@winterop-com/sokkel-ui/lib/fullscreen'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import { Spinner } from '@winterop-com/sokkel-ui/primitives/spinner'
import {
    BASEMAPS,
    BLANK_BASEMAP,
    GRATICULE_LAYER_ID,
    GROUND_LAYER_ID,
    SCHEME_BASEMAPS,
    TILES_LAYER_ID,
    basemapKey,
    composeStyle,
    geometryStyle,
    graticule as graticuleLines,
    hasTiles,
    darkGround,
    inksLabels,
    isBasemapLayer,
    labelAnchor,
    loadStyle,
    rasterStyle,
    resolveBasemap,
    type Basemap,
    type Credit,
    type SchemeBasemaps,
} from './basemap'
import { BasemapSwitcher } from './BasemapSwitcher'
import { ControlButton } from './control'
import { resolveColors } from './color'
import { ID_PROPERTY, MapContext, useMapContext, type MapContextValue, type MapCorner, type MapLayerEntry } from './context'
import { anchorOf, unionBounds, type Bounds, type LngLat } from './geometry'
import {
    FLAT_SKY,
    GLOBE_STATE,
    MORPH_PROJECTION,
    SPACE_STYLE,
    WHOLE_GLOBE,
    globeRadius,
    globeShare,
    globeSky,
    globeZoom,
    haloShadow,
    roll,
    starfieldPosition,
    starfieldStyle,
    starlight,
    zoomedByHand,
} from './globe'
import { labelRegistry } from './layer'

export type { MapCorner } from './context'

/** The words the map's own controls and messages say. */
export interface MapWords {
    zoomIn: string
    zoomOut: string
    fit: string
    fullscreen: string
    exitFullscreen: string
    globe: string
    flat: string
    basemap: string
    /** The control that saves the map as a PNG image. */
    export: string
    /** Said while the map engine loads, once the wait is long enough to show. */
    loading: string
    unavailable: string
    /** Said when the map engine could not be fetched. */
    failed: string
    /** The button under `failed` that fetches the engine again. */
    retry: string
    /** The note under the map when its layers left out features whose geometry they could not read. */
    unreadable: (count: number) => string
}

export const MAP_WORDS: MapWords = {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to the data',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    globe: 'View as a globe',
    flat: 'View as a flat map',
    basemap: 'Basemap',
    export: 'Export as PNG',
    loading: 'Loading the map',
    unavailable: 'This browser cannot draw the map, because WebGL is not available.',
    failed: 'The map could not be loaded.',
    retry: 'Try again',
    unreadable: (count) =>
        count === 1
            ? '1 geometry could not be read and is not drawn.'
            : `${count.toLocaleString('en-US')} geometries could not be read and are not drawn.`,
}

/** Where a catalog holds a map's words, and the arguments its phrases name. */
export const MAP_PART: WordsPart<MapWords> = { id: 'map', words: MAP_WORDS, args: { unreadable: 'count' } }

/** A map's phrases as ICU messages in English, for the catalog. */
export const MAP_MESSAGES: WordMessages<MapWords> = {
    unreadable:
        '{count, plural, =1 {1 geometry could not be read and is not drawn.} other {# geometries could not be read and are not drawn.}}',
}

/** How the map is projected: flat, or as a globe. */
export type MapProjection = 'mercator' | 'globe'

/** Which of the map's own controls it draws in its top right corner. */
export interface MapControls {
    /** Zoom in and out. */
    zoom?: boolean
    /** Back to everything the layers draw, or to `bounds`. */
    fit?: boolean
    fullscreen?: boolean
    /** A toggle between the flat map and the globe. */
    projection?: boolean
    /** A button that saves the map as drawn as a PNG image, named by `file`. */
    export?: boolean
}

const CONTROLS: Required<MapControls> = { zoom: true, fit: true, fullscreen: true, projection: false, export: false }

/** What a map offers its app: the map as drawn, as a PNG image. */
export interface MapHandle {
    /** The map as drawn, with the basemap's credits written in its corner, as a PNG `data:` URL. */
    png: () => Promise<string>
}

/** A camera position: the center and the zoom. */
export interface MapCamera {
    center: LngLat
    zoom: number
}

/** Where the map looks: its center and zoom, and the box it shows, west, south, east and north. */
export interface MapViewport extends MapCamera {
    bounds: Bounds
}

/** How the map flies to the selected feature when the selection changes. */
export interface SelectionFlight {
    /**
     * Whether a feature picked on the map itself is flown to as well, which brings it to the middle.
     * Without it only a selection made outside the map flies, such as a row picked in a list beside it.
     */
    picks?: boolean
    /** The zoom a flight ends at when the map is further out; a map already closer in keeps its zoom. */
    zoom?: number
}

/** How the map leans toward the horizon as it is zoomed in. */
export interface ZoomPitch {
    /** The zoom the map starts to lean at; 10 by default. */
    from?: number
    /** The zoom from which it leans all the way; 14 by default. */
    to?: number
    /** How far it leans there, in degrees from straight down; 45 by default. */
    pitch?: number
}

const ZOOM_PITCH: Required<ZoomPitch> = { from: 10, to: 14, pitch: 45 }

/** How far the map leans at a zoom: level up to `from`, by `pitch` from `to` on, and easing in and out between. */
export function pitchAtZoom(zoom: number, { from, to, pitch }: Required<ZoomPitch>): number {
    if (to <= from) return zoom >= to ? pitch : 0
    const share = Math.min(1, Math.max(0, (zoom - from) / (to - from)))
    return pitch * share * share * (3 - 2 * share)
}

/**
 * How the map glides on once a drag lets go of it: it leaves the hand at the speed it was dragged
 * at and slows evenly to a stop, further and for longer than the engine's own glide, which starts
 * at half that speed.
 */
const MOMENTUM = { linearity: 0.5, deceleration: 1600, maxSpeed: 1400, easing: (share: number) => 1 - (1 - share) ** 4 }

/** No glide: the map stops where it is let go. */
const NO_MOMENTUM = { maxSpeed: 0 }

/** Slow at both ends and quick between, for a camera that sets off at once and arrives gently. */
const easeInOut = (share: number) => (share < 0.5 ? 2 * share ** 2 : 1 - (-2 * share + 2) ** 2 / 2)

/** The color the globe's rim glows in: the one its horizon is drawn in. */
const HALO_COLOR = 'var(--chart-2)'

/** How long the map takes to roll up into the globe, or back out of it, in milliseconds. */
const MORPH_MS = 1100

/** Whether the reader asked for less motion, in which case the camera jumps where it would fly. */
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export interface MapViewProps {
    /** What the map is called, for a screen reader. */
    label: string
    /** The basemap drawn, when the caller holds the choice; a light and dark pair follows the scheme. */
    basemap?: Basemap | SchemeBasemaps
    /**
     * The basemap the map opens on, when it holds the choice itself. A light and dark pair follows
     * the document's scheme until someone picks a basemap; the default is the light and dark
     * street maps.
     */
    defaultBasemap?: Basemap | SchemeBasemaps
    /**
     * Basemaps offered in the control stack, every preset by default; with fewer than two there is
     * no switcher. The map draws only a basemap it offers: the default when it is offered, the first
     * one offered otherwise, and with none offered the ground alone, which reaches no network.
     */
    basemaps?: Basemap[]
    onBasemapChange?: (basemap: Basemap) => void
    /**
     * The basemap drawn in place of the chosen one when it cannot be had: its style or every tile
     * of it fails to load, or the browser is offline. `WORLD_BASEMAP` (from `world`) draws the
     * countries from geometry the package carries, with no network; the ground alone by default.
     */
    fallbackBasemap?: Basemap
    /** How opaque the basemap's tiles and place names are, from 0 to 1. */
    basemapOpacity?: number
    /** Whether the basemap's tiles and place names are drawn; the ground always is. */
    basemapVisible?: boolean
    /**
     * The projection, when the caller holds it. A change rolls the flat map up into the globe, or
     * back out of it, over about a second; under `prefers-reduced-motion` it changes at once.
     */
    projection?: MapProjection
    /** The projection the map opens in when it holds it itself; the `projection` control toggles it. */
    defaultProjection?: MapProjection
    onProjectionChange?: (projection: MapProjection) => void
    /** Draws meridians and parallels every 15 degrees over the basemap. */
    graticule?: boolean
    /**
     * What the map frames instead of everything its layers draw, such as the selected feature and
     * what lies under it. A change of bounds is a new subject: the map eases to it even after the
     * reader has moved it.
     */
    bounds?: Bounds
    /** A fixed opening camera, which turns fitting to the data off. */
    camera?: MapCamera
    /** The deepest zoom a fit goes to. */
    maxFitZoom?: number
    /** The id of the selected feature, when the caller holds the selection. */
    selected?: string | null
    defaultSelected?: string | null
    onSelectedChange?: (id: string | null, feature: Feature | null) => void
    /**
     * Flies to the selected feature when the selection changes: a short way is eased and a long way
     * flown, zooming out over the ground between. Only a selection made outside the map flies, such
     * as a row picked in a list beside it, and only when the feature is out of view, behind a corner's
     * overlay or further out than `zoom`; `picks` flies to a feature picked on the map too. The camera
     * is held from then on. Under `prefers-reduced-motion` the map jumps there.
     */
    flyToSelected?: boolean | SelectionFlight
    /**
     * Whether the map glides on after a drag lets go of it, slowing to a stop; without it the map
     * stops where it is let go. Read once, when the map is made.
     */
    momentum?: boolean
    /**
     * Leans the map toward the horizon as it is zoomed in, so the ground close up is seen at an
     * angle: level from afar, and by 45 degrees from zoom 14, or as the option says.
     */
    pitchWithZoom?: boolean | ZoomPitch
    /** Called with the position of every click on the map. */
    onMapClick?: (at: LngLat) => void
    /**
     * Called with where the map looks once it is drawn and each time it comes to rest after a move,
     * a fit or a resize, as an app that fetches what is in view needs.
     */
    onViewChange?: (view: MapViewport) => void
    /** Which of the map's own controls are drawn: zoom, fit and full screen, none, or a choice. */
    controls?: boolean | MapControls
    /** Whether the map pans, zooms and answers clicks. */
    interactive?: boolean
    /**
     * Whether the reader may turn the map from north, by dragging with the right button or with
     * Control, by two fingers or by the keyboard; a `MapCompass` shows the bearing and turns it back.
     * Read once, when the map is made.
     */
    rotate?: boolean
    /** Draws the map in its own bordered, rounded frame; off for a map filling a panel that frames it already. */
    framed?: boolean
    /**
     * Lines under the map, such as how it frames a selection that has no geometry of its own. A
     * line counting the features the layers could not read is added after them.
     */
    notes?: readonly ReactNode[]
    words?: Partial<MapWords>
    /** The exported image's file name, without its extension. */
    file?: string
    /** Filled with the map's export while it is drawn, for an app's own menu. */
    handle?: Ref<MapHandle | null>
    className?: string
    /** Layers and overlays. */
    children?: ReactNode
}

const CORNERS: MapCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

const CORNER_CLASS: Record<MapCorner, string> = {
    'top-left': 'top-3 left-3 items-start',
    'top-right': 'top-3 right-3 items-end',
    'bottom-left': 'bottom-3 left-3 items-start justify-end',
    'bottom-right': 'bottom-3 right-3 items-end justify-end',
}

/** The margin a fit leaves around the data, beyond whatever the overlays in the corners take. */
const FIT_MARGIN = 24

/** Whether the page wears the dark scheme; false on a server, where there is no document. */
function isDark(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

/** The theme the page wears; the base theme on a server, or where the page names none. */
function pageTheme(): string {
    return (typeof document === 'undefined' ? undefined : document.documentElement.dataset.theme) || 'tidevann'
}

let webgl: boolean | undefined

/** Whether the browser draws WebGL2, probed once for every map and its context let go; true on a server, so it renders the map's box. */
function webglAvailable(): boolean {
    if (typeof document === 'undefined') return true
    if (webgl === undefined) {
        try {
            const context = document.createElement('canvas').getContext('webgl2')
            webgl = context !== null
            context?.getExtension('WEBGL_lose_context')?.loseContext()
        } catch {
            webgl = false
        }
    }
    return webgl
}

type Engine = typeof import('./engine')

let engine: Promise<Engine> | undefined
let loaded: Engine | undefined

/** maplibre, fetched once by the first map drawn and shared by the rest. */
function loadEngine(): Promise<Engine> {
    engine ??= import('./engine').then(
        (module) => {
            loaded = module
            return module
        },
        (error: unknown) => {
            engine = undefined
            throw error
        },
    )
    return engine
}

/**
 * Loads the map engine, once, and resolves when it is ready. `MapView` calls it itself the first
 * time a map is drawn; an app that knows a map is coming can call it ahead, so the map draws at once.
 */
export function loadMapEngine(): Promise<void> {
    return loadEngine().then(() => undefined)
}

/** The tokens the map itself paints with: the ground, place names, the globe's horizon, the graticule, a geometry basemap's land and the credits. */
function mapPalette(scope: HTMLElement) {
    return resolveColors(scope, {
        ground: 'var(--card)',
        ink: 'color-mix(in oklab, var(--foreground) 80%, var(--card))',
        horizon: 'var(--chart-2)',
        graticule: 'color-mix(in oklab, var(--foreground) 14%, var(--card))',
        land: 'color-mix(in oklab, var(--foreground) 8%, var(--card))',
        border: 'color-mix(in oklab, var(--foreground) 24%, var(--card))',
        credit: 'var(--muted-foreground)',
    })
}

/**
 * The map's canvas as a PNG `data:` URL, read as the next frame is drawn, before the canvas is
 * cleared, with the credits written in its lower right corner over the ground, as the map shows them.
 */
function exportImage(map: MapLibreMap, scope: HTMLElement, credits: readonly Credit[]): Promise<string> {
    return new Promise((resolve, reject) => {
        map.once('render', () => {
            try {
                const canvas = map.getCanvas()
                const image = document.createElement('canvas')
                image.width = canvas.width
                image.height = canvas.height
                const context = image.getContext('2d')
                if (context === null) throw new Error('No 2D canvas to draw the map image on.')
                const palette = mapPalette(scope)
                context.fillStyle = palette.ground
                context.fillRect(0, 0, image.width, image.height)
                context.drawImage(canvas, 0, 0)
                const text = credits.map((credit) => credit.label).join(' ')
                if (text !== '') {
                    const ratio = canvas.width / Math.max(1, canvas.clientWidth)
                    context.font = `${String(10 * ratio)}px ${getComputedStyle(scope).fontFamily}`
                    const pad = 4 * ratio
                    const width = context.measureText(text).width + pad * 2
                    const height = 16 * ratio
                    context.globalAlpha = 0.85
                    context.fillRect(image.width - width, image.height - height, width, height)
                    context.globalAlpha = 1
                    context.fillStyle = palette.credit
                    context.textBaseline = 'middle'
                    context.fillText(text, image.width - width + pad, image.height - height / 2)
                }
                resolve(image.toDataURL('image/png'))
            } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)))
            }
        })
        map.triggerRepaint()
    })
}

/** The space each occupied corner takes, measured from the edges of the map. */
function cornerBoxes(stage: HTMLElement, corners: Record<MapCorner, HTMLElement> | null) {
    if (corners === null) return []
    const frame = stage.getBoundingClientRect()
    return CORNERS.flatMap((corner) => {
        const element = corners[corner]
        if (element.childElementCount === 0) return []
        const box = element.getBoundingClientRect()
        const width = corner.endsWith('left') ? box.right - frame.left : frame.right - box.left
        const height = corner.startsWith('top') ? box.bottom - frame.top : frame.bottom - box.top
        return [{ corner, width, height }]
    })
}

/**
 * The camera that frames the bounds largest while keeping clear of every occupied corner. Each
 * corner is cleared either sideways or vertically, whichever leaves the data bigger.
 */
function fitCamera(map: MapLibreMap, bounds: Bounds, boxes: ReturnType<typeof cornerBoxes>, maxZoom: number) {
    const width = map.getContainer().clientWidth
    const height = map.getContainer().clientHeight
    let best: { center: LngLat; zoom: number } | null = null
    for (let mask = 0; mask < 1 << boxes.length; mask += 1) {
        const padding: Required<PaddingOptions> = { top: FIT_MARGIN, bottom: FIT_MARGIN, left: FIT_MARGIN, right: FIT_MARGIN }
        boxes.forEach((box, index) => {
            if ((mask >> index) & 1) {
                const side = box.corner.endsWith('left') ? 'left' : 'right'
                padding[side] = Math.max(padding[side], box.width + 8)
            } else {
                const side = box.corner.startsWith('top') ? 'top' : 'bottom'
                padding[side] = Math.max(padding[side], box.height + 8)
            }
        })
        if (padding.left + padding.right >= width - 16 || padding.top + padding.bottom >= height - 16) continue
        const camera = map.cameraForBounds(
            [
                [bounds[0], bounds[1]],
                [bounds[2], bounds[3]],
            ],
            { padding, maxZoom },
        )
        if (camera?.center === undefined || camera.zoom === undefined) continue
        if (best === null || camera.zoom > best.zoom) {
            const center = camera.center as { lng: number; lat: number }
            best = { center: [center.lng, center.lat], zoom: camera.zoom }
        }
    }
    return best
}

/**
 * Whether a place is where the reader sees it: inside the map by a margin, on the near side of a
 * globe, and under no corner's overlay.
 */
function inView(map: MapLibreMap, stage: HTMLElement, corners: Record<MapCorner, HTMLElement> | null, at: LngLat): boolean {
    const point = map.project(at)
    const width = stage.clientWidth
    const height = stage.clientHeight
    const margin = Math.min(width, height) * 0.1
    if (point.x < margin || point.y < margin || point.x > width - margin || point.y > height - margin) return false
    // A place on the far side of a globe lands on a point that reads back as another place.
    const back = map.unproject(point)
    if (Math.abs(back.lat - at[1]) > 0.5 || Math.abs(((((back.lng - at[0]) % 360) + 540) % 360) - 180) > 0.5) return false
    return !cornerBoxes(stage, corners).some((box) => {
        const across = box.corner.endsWith('left') ? point.x : width - point.x
        const down = box.corner.startsWith('top') ? point.y : height - point.y
        return across < box.width && down < box.height
    })
}

/**
 * A maplibre map over a basemap, with its layers and overlays as children.
 *
 * It opens on the light or dark street map by the document's scheme, with the basemap's place
 * names drawn above the data, and offers every preset basemap in its control stack. It fits
 * everything its layers draw (or `bounds`), clear of the overlays in its corners, until someone
 * moves it, and eases to new `bounds` when they change; follows the document's `.dark` class and
 * `data-theme`, redrawing in the new tokens; and holds the selected feature itself or takes it
 * from `selected`. Notes run under the map, with a count of the features its layers could not
 * read. Once the map has drawn everything it was given and nothing is moving or loading, the
 * frame carries `data-map-idle`. maplibre loads the first time a map comes near the screen, so a
 * map below the fold costs nothing until it is scrolled to (`loadMapEngine` fetches it ahead);
 * until it arrives the frame shows its ground, with a spinner once the wait is long.
 * Its full screen control goes through `lib/fullscreen`: the browser's full screen, or in a desktop
 * shell the window's own once the app hands it over, keeping the same canvas and camera.
 * `fallbackBasemap` is drawn while the chosen basemap cannot be had: offline, or when its style or
 * all of its tiles fail. The `export` control, or `handle` for an app's own menu, saves the map as
 * drawn as a PNG, with the basemap's credits in its corner.
 * Its camera glides on after a drag is let go of (`momentum`), flies to a feature selected outside
 * it (`flyToSelected`) and leans toward the horizon close in (`pitchWithZoom`). A change of
 * `projection` rolls the flat map up into the globe, or back out of it, bringing the camera to
 * where the globe is seen whole and back to the zoom it had; the globe glows round its rim before
 * stars that drift as it turns and fade as it grows. Under `prefers-reduced-motion` every one of
 * these is a jump.
 */
export function MapView({
    label,
    basemap,
    defaultBasemap = SCHEME_BASEMAPS,
    basemaps = BASEMAPS,
    onBasemapChange,
    fallbackBasemap,
    basemapOpacity = 1,
    basemapVisible = true,
    projection,
    defaultProjection = 'mercator',
    onProjectionChange,
    graticule = false,
    bounds,
    camera,
    maxFitZoom = 12,
    selected,
    defaultSelected = null,
    onSelectedChange,
    flyToSelected = false,
    momentum = true,
    pitchWithZoom = false,
    onMapClick,
    onViewChange,
    controls = true,
    interactive = true,
    rotate = false,
    framed = true,
    notes = [],
    words,
    file = 'map',
    handle,
    className,
    children,
}: MapViewProps) {
    const said = useWords(MAP_PART, words)
    const shown = controls === false ? null : controls === true ? CONTROLS : { ...CONTROLS, ...controls }
    const [supported] = useState(webglAvailable)
    const [maplibre, setMaplibre] = useState<Engine | 'failed' | undefined>(loaded)
    const [scope, setScope] = useState<HTMLDivElement | null>(null)
    const [stage, setStage] = useState<HTMLDivElement | null>(null)
    const [canvasHost, setCanvasHost] = useState<HTMLDivElement | null>(null)
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
    const cornerElements = useRef<Partial<Record<MapCorner, HTMLElement>>>({})
    const [corners, setCorners] = useState<Record<MapCorner, HTMLElement> | null>(null)
    const [map, setMap] = useState<MapLibreMap | null>(null)
    const [ready, setReady] = useState(false)
    const [idle, setIdle] = useState(false)
    const [dark, setDark] = useState(isDark)
    const [theme, setTheme] = useState(pageTheme)
    const [reading, setReading] = useState(0)
    const [fullscreen, setFullscreen] = useState(false)
    const [picked, setPicked] = useState<Basemap | null>(null)
    const wanted = resolveBasemap(basemap ?? picked ?? defaultBasemap, dark)
    const chosenBasemap =
        basemap !== undefined || basemaps.some((option) => option.id === wanted.id) ? wanted : (basemaps[0] ?? BLANK_BASEMAP)
    // The key of the chosen basemap once it failed to load, or `*` while the browser is offline.
    const [failed, setFailed] = useState<string | null>(() => (typeof navigator !== 'undefined' && !navigator.onLine ? '*' : null))
    const chosenKey = basemapKey(chosenBasemap)
    const shownBasemap =
        fallbackBasemap !== undefined && hasTiles(chosenBasemap) && (failed === '*' || failed === chosenKey)
            ? fallbackBasemap
            : chosenBasemap
    // Over a dark basemap in the light scheme the map wears the dark scheme, in the page's theme, so
    // its layers, labels, chips and controls are drawn for the ground they sit on.
    const ground = darkGround(shownBasemap, dark)
    const [heldProjection, setHeldProjection] = useState<MapProjection>(defaultProjection)
    const shownProjection = projection ?? heldProjection
    const [unreadable, setUnreadable] = useState(0)
    const [heldSelection, setHeldSelection] = useState<string | null>(defaultSelected)
    const current = selected !== undefined ? selected : heldSelection
    const flight: SelectionFlight | null = flyToSelected === false ? null : flyToSelected === true ? {} : flyToSelected
    const lean = pitchWithZoom === false ? null : { ...ZOOM_PITCH, ...(pitchWithZoom === true ? {} : pitchWithZoom) }
    const leanKey = lean === null ? '' : `${String(lean.from)} ${String(lean.to)} ${String(lean.pitch)}`
    // Whether deep space lies behind the canvas: on the globe, and while the map rolls into or out of it.
    const [space, setSpace] = useState(shownProjection === 'globe')
    const [stars, setStars] = useState<HTMLDivElement | null>(null)
    const [halo, setHalo] = useState<HTMLDivElement | null>(null)
    // How far the map is a globe: 0 flat, 1 the globe, and between while one becomes the other.
    const shape = useRef(0)
    // Whether the style wears the projection that bends, and whether the map has taken its first shape, which it takes at once.
    const morphed = useRef(false)
    const shaped = useRef(false)
    // The zoom the map had before it was brought to where the globe is seen whole; null when it was not brought there, or the reader has zoomed since.
    const whole = useRef<number | null>(null)
    // Calls off the roll under way, if any.
    const cancelRoll = useRef<() => void>(() => undefined)
    // What the selection was when the camera last looked at it, and the feature a click on the map last picked, with when.
    const flownTo = useRef<string | null | undefined>(undefined)
    const pickedOnMap = useRef<{ id: string; at: number } | null>(null)

    const entries = useRef(new Map<string, MapLayerEntry>())
    const [layerVersion, setLayerVersion] = useState(0)
    const armed = useRef(false)
    const pendingStyle = useRef(true)
    const moved = useRef(false)
    const lastFit = useRef('')
    /** The bounds the map last framed, so new ones can be told from the same ones again. */
    const framedOn = useRef<string | null>(null)

    const select = useCallback(
        (id: string | null) => {
            let feature: Feature | null = null
            if (id !== null) {
                for (const entry of entries.current.values()) feature ??= entry.features.get(id) ?? null
            }
            if (selected === undefined) setHeldSelection(id)
            onSelectedChange?.(id, feature)
        },
        [selected, onSelectedChange],
    )
    const selectNow = useRef(select)
    const clickNow = useRef(onMapClick)
    const viewNow = useRef(onViewChange)
    // A tool's handler that takes every click in place of the selection, such as a ruler's.
    const clickTaker = useRef<((at: LngLat) => void) | null>(null)
    const takeClicks = useCallback((handler: ((at: LngLat) => void) | null) => {
        clickTaker.current = handler
    }, [])
    const [labels] = useState(labelRegistry)
    const holdCamera = useCallback(() => {
        moved.current = true
    }, [])
    const leanNow = useRef(lean)
    const flightNow = useRef(flight)
    useEffect(() => {
        selectNow.current = select
        clickNow.current = onMapClick
        viewNow.current = onViewChange
        leanNow.current = lean
        flightNow.current = flight
    })

    const register = useCallback((key: string, entry: MapLayerEntry) => {
        const count = () => [...entries.current.values()].reduce((sum, each) => sum + each.unreadable, 0)
        entries.current.set(key, entry)
        setLayerVersion((version) => version + 1)
        setUnreadable(count())
        return () => {
            if (entries.current.get(key) === entry) entries.current.delete(key)
            setLayerVersion((version) => version + 1)
            setUnreadable(count())
        }
    }, [])

    const cornerRef = useCallback(
        (corner: MapCorner) => (element: HTMLDivElement | null) => {
            if (element === null) {
                delete cornerElements.current[corner]
                return
            }
            cornerElements.current[corner] = element
            const all = cornerElements.current
            if (CORNERS.every((name) => all[name] !== undefined)) setCorners({ ...(all as Record<MapCorner, HTMLElement>) })
        },
        [],
    )
    const cornerRefs = useMemo(
        () =>
            Object.fromEntries(CORNERS.map((corner) => [corner, cornerRef(corner)])) as Record<
                MapCorner,
                (element: HTMLDivElement | null) => void
            >,
        [cornerRef],
    )

    // Bounds and a camera written inline are new objects each render; the fit follows what they hold.
    const boundsKey = bounds === undefined ? '' : bounds.join(' ')
    const [heldBounds, setHeldBounds] = useState({ key: boundsKey, bounds })
    if (heldBounds.key !== boundsKey) setHeldBounds({ key: boundsKey, bounds })
    const shownBounds = heldBounds.key === boundsKey ? heldBounds.bounds : bounds
    const fixed = camera !== undefined
    const fitTarget = useCallback((): Bounds | null => {
        if (shownBounds !== undefined) return shownBounds
        return unionBounds([...entries.current.values()].map((entry) => entry.bounds))
    }, [shownBounds])

    const fit = useCallback(
        (animate: boolean) => {
            if (map === null || stage === null) return
            const target = fitTarget()
            if (target === null) return
            const next = fitCamera(map, target, cornerBoxes(stage, corners), maxFitZoom)
            if (next === null) return
            const key = JSON.stringify([next.center.map((value) => value.toFixed(6)), next.zoom.toFixed(4)])
            if (!animate && key === lastFit.current) return
            lastFit.current = key
            if (animate) map.easeTo({ ...next, duration: 400 })
            else map.jumpTo(next)
        },
        [map, stage, corners, fitTarget, maxFitZoom],
    )
    const fitNow = useRef(fit)
    const shownBasemapRef = useRef(shownBasemap)
    const fallbackRef = useRef(fallbackBasemap)
    // Whether a tile of the basemap drawn has loaded, so a later failure is one tile's, not the basemap's.
    const tileLoaded = useRef(false)
    useEffect(() => {
        fitNow.current = fit
        shownBasemapRef.current = shownBasemap
        fallbackRef.current = fallbackBasemap
    })
    useEffect(() => {
        const offline = () => setFailed('*')
        const online = () => setFailed((was) => (was === '*' ? null : was))
        window.addEventListener('offline', offline)
        window.addEventListener('online', online)
        return () => {
            window.removeEventListener('offline', offline)
            window.removeEventListener('online', online)
        }
    }, [])

    // Whether the map is on the screen or within a scroll of it: the engine loads only then.
    const [near, setNear] = useState(false)
    useEffect(() => {
        if (near || scope === null) return
        if (typeof IntersectionObserver === 'undefined') {
            setNear(true)
            return
        }
        const observer = new IntersectionObserver(
            (seen) => {
                if (seen.some((entry) => entry.isIntersecting)) setNear(true)
            },
            { rootMargin: '400px' },
        )
        observer.observe(scope)
        return () => observer.disconnect()
    }, [near, scope])

    useEffect(() => {
        if (!supported || maplibre !== undefined || !near) return
        let live = true
        loadEngine().then(
            (module) => {
                if (live) setMaplibre(module)
            },
            (reason: unknown) => {
                console.error('The map engine could not be loaded.', reason)
                if (live) setMaplibre('failed')
            },
        )
        return () => {
            live = false
        }
    }, [supported, maplibre, near])
    const waited = useLongWait(supported && near && maplibre === undefined, 200)

    // Built once per frame element, reading the camera and interactivity then; the basemap and the
    // theme change in place.
    useEffect(() => {
        if (!supported || maplibre === undefined || maplibre === 'failed' || scope === null || stage === null || canvasHost === null) return
        maplibre.ensureWorker()
        const instance = new maplibre.Map({
            container: canvasHost,
            style: {
                version: 8,
                sources: {},
                layers: [{ id: GROUND_LAYER_ID, type: 'background', paint: { 'background-color': mapPalette(scope).ground } }],
            },
            center: camera?.center ?? [0, 0],
            zoom: camera?.zoom ?? 1,
            pitch: leanNow.current === null ? 0 : pitchAtZoom(camera?.zoom ?? 1, leanNow.current),
            attributionControl: false,
            dragPan: momentum ? MOMENTUM : NO_MOMENTUM,
            dragRotate: rotate,
            pitchWithRotate: false,
            touchPitch: false,
            interactive,
            fadeDuration: 0,
        })
        if (!rotate) {
            instance.touchZoomRotate.disableRotation()
            instance.keyboard.disableRotation()
        }
        // An icon a basemap style names but its sprite lacks is drawn as nothing.
        instance.setMissingStyleImageResolver((id) => {
            if (!instance.hasImage(id)) instance.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) })
        })

        const hitAt = (point: { x: number; y: number }) => {
            const ordered = [...entries.current.values()].sort((a, b) => b.tolerance - a.tolerance)
            for (const entry of ordered) {
                const layers = entry.hitLayers.filter((layer) => instance.getLayer(layer) !== undefined)
                if (layers.length === 0) continue
                const t = entry.tolerance
                const area: PointLike | [PointLike, PointLike] =
                    t > 0
                        ? [
                              [point.x - t, point.y - t],
                              [point.x + t, point.y + t],
                          ]
                        : [point.x, point.y]
                const feature: MapGeoJSONFeature | undefined = instance.queryRenderedFeatures(area, { layers })[0]
                if (feature !== undefined) return { entry, feature }
            }
            return null
        }
        let hovered: { source: string; id: string } | null = null
        const hover = (next: { source: string; id: string } | null) => {
            if (hovered?.source === next?.source && hovered?.id === next?.id) return
            if (hovered !== null && instance.getSource(hovered.source) !== undefined) {
                instance.setFeatureState({ source: hovered.source, id: hovered.id }, { hover: false })
            }
            if (next !== null) instance.setFeatureState({ source: next.source, id: next.id }, { hover: true })
            hovered = next
        }
        instance.on('click', (event) => {
            clickNow.current?.([event.lngLat.lng, event.lngLat.lat])
            if (clickTaker.current !== null) {
                clickTaker.current([event.lngLat.lng, event.lngLat.lat])
                return
            }
            const hit = hitAt(event.point)
            if (hit === null) {
                selectNow.current(null)
                return
            }
            if (hit.entry.click?.(hit.feature) === true) {
                moved.current = true
                return
            }
            const id: unknown = hit.feature.properties[ID_PROPERTY]
            if (typeof id !== 'string') return
            pickedOnMap.current = { id, at: performance.now() }
            selectNow.current(id)
        })
        instance.on('mousemove', (event) => {
            if (clickTaker.current !== null) {
                hover(null)
                instance.getCanvas().style.cursor = 'crosshair'
                return
            }
            const hit = hitAt(event.point)
            const id: unknown = hit?.feature.properties[ID_PROPERTY]
            hover(hit !== null && typeof id === 'string' ? { source: hit.entry.source, id } : null)
            instance.getCanvas().style.cursor = hit === null ? '' : 'pointer'
        })
        instance.on('mouseout', () => {
            hover(null)
            instance.getCanvas().style.cursor = ''
        })
        instance.on('zoomstart', (event) => {
            if ('originalEvent' in event && zoomedByHand(event.originalEvent as Event | undefined)) whole.current = null
        })
        instance.on('movestart', (event) => {
            if ('originalEvent' in event && event.originalEvent !== undefined) moved.current = true
            setIdle(false)
        })
        instance.on('dataloading', () => setIdle(false))
        instance.on('idle', () => {
            if (armed.current && !pendingStyle.current) setIdle(true)
        })
        const tellView = () => {
            if (viewNow.current === undefined) return
            const center = instance.getCenter()
            const box = instance.getBounds()
            viewNow.current({
                center: [center.lng, center.lat],
                zoom: instance.getZoom(),
                bounds: [box.getWest(), box.getSouth(), box.getEast(), box.getNorth()],
            })
        }
        instance.on('load', () => {
            setReady(true)
            tellView()
        })
        instance.on('moveend', tellView)
        // A basemap none of whose tiles load, as when its host cannot be reached, gives way to the fallback.
        const fromBasemap = (source: unknown) =>
            typeof source === 'string' &&
            (source === TILES_LAYER_ID || !source.startsWith('wui-')) &&
            fallbackRef.current !== undefined &&
            shownBasemapRef.current !== fallbackRef.current
        instance.on('data', (event) => {
            if (event.dataType === 'source' && 'tile' in event && event.tile !== undefined && fromBasemap(event.sourceId))
                tileLoaded.current = true
        })
        instance.on('error', (event) => {
            if (tileLoaded.current || !fromBasemap((event as { sourceId?: unknown }).sourceId)) return
            const key = basemapKey(shownBasemapRef.current)
            setFailed((was) => (was === '*' ? was : key))
        })

        const resize = new ResizeObserver(() => {
            instance.resize()
            if (!moved.current) fitNow.current(false)
        })
        resize.observe(stage)
        setMap(instance)
        return () => {
            cancelRoll.current()
            resize.disconnect()
            armed.current = false
            pendingStyle.current = true
            lastFit.current = ''
            framedOn.current = null
            shape.current = 0
            morphed.current = false
            shaped.current = false
            whole.current = null
            flownTo.current = undefined
            setReady(false)
            setIdle(false)
            setMap(null)
            instance.remove()
        }
    }, [supported, maplibre, scope, stage, canvasHost])

    useEffect(() => {
        const root = document.documentElement
        // An app wears its kept scheme before paint, after this map first read it, so it reads it again here.
        setDark(isDark())
        setTheme(pageTheme())
        const observer = new MutationObserver(() => {
            setDark(isDark())
            setTheme(pageTheme())
            setReading((value) => value + 1)
            setIdle(false)
        })
        observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
        return () => observer.disconnect()
    }, [])

    // The layers read their colors again when the map takes up or puts down the dark scheme over its ground.
    const groundRead = useRef(ground)
    useEffect(() => {
        if (groundRead.current === ground) return
        groundRead.current = ground
        setReading((value) => value + 1)
    }, [ground])

    // The basemap's style, composed with the map's own layers; a change of basemap, scheme or
    // opacity is a diff of the style, so the data layers and their feature state stay.
    const styleKey = basemapKey(shownBasemap)
    useEffect(() => {
        if (map === null || scope === null || !ready) return
        let cancelled = false
        pendingStyle.current = true
        tileLoaded.current = false
        setIdle(false)
        const basemap = shownBasemapRef.current
        const palette = mapPalette(scope)
        const options = {
            ground: palette.ground,
            ink: palette.ink,
            opacity: basemapOpacity,
            visible: basemapVisible,
            inked: inksLabels(basemap, dark),
        }
        const apply = (style: StyleSpecification) => {
            if (cancelled) return
            map.setStyle(style, { diff: true, transformStyle: (previous, next) => composeStyle(next, previous, options) })
            pendingStyle.current = false
            map.triggerRepaint()
        }
        // A basemap that cannot be had gives way to the fallback; a fallback that cannot, to the ground alone.
        const fail = () => {
            if (cancelled) return
            if (fallbackRef.current === undefined || basemap === fallbackRef.current || !hasTiles(basemap))
                apply(rasterStyle(BLANK_BASEMAP, dark))
            else setFailed((was) => (was === '*' ? was : basemapKey(basemap)))
        }
        if (basemap.style !== undefined) loadStyle(basemap.style).then(apply, fail)
        else if (basemap.geometry !== undefined && !hasTiles(basemap))
            basemap.geometry().then((data) => apply(geometryStyle(data, { land: palette.land, border: palette.border })), fail)
        else apply(rasterStyle(basemap, dark))
        return () => {
            cancelled = true
        }
    }, [map, scope, ready, styleKey, dark, reading, basemapOpacity, basemapVisible])

    useEffect(() => {
        if (map === null || scope === null || !ready) return
        if (!graticule) {
            if (map.getLayer(GRATICULE_LAYER_ID) !== undefined) map.removeLayer(GRATICULE_LAYER_ID)
            if (map.getSource(GRATICULE_LAYER_ID) !== undefined) map.removeSource(GRATICULE_LAYER_ID)
            return
        }
        const color = mapPalette(scope).graticule
        if (map.getSource(GRATICULE_LAYER_ID) === undefined) {
            map.addSource(GRATICULE_LAYER_ID, { type: 'geojson', data: graticuleLines() })
            const above = map.getLayersOrder().find((id) => id.startsWith('wui-') && !isBasemapLayer(id)) ?? labelAnchor(map)
            map.addLayer(
                { id: GRATICULE_LAYER_ID, type: 'line', source: GRATICULE_LAYER_ID, paint: { 'line-color': color, 'line-width': 0.75 } },
                above,
            )
        } else {
            map.setPaintProperty(GRATICULE_LAYER_ID, 'line-color', color)
        }
    }, [map, scope, ready, graticule, reading])

    // Writes how far the map is a globe to the style, where the projection reads it; lights the
    // stars by it and by the zoom, drifting them with the center; and sizes the glow to the globe's rim.
    const paintGlobe = useCallback(() => {
        if (map === null) return
        const zoom = map.getZoom()
        const center = map.getCenter()
        if (morphed.current) {
            const share = shape.current * globeShare(zoom)
            if (map.getGlobalState()[GLOBE_STATE] !== share) map.setGlobalStateProperty(GLOBE_STATE, share)
        }
        if (stars !== null) {
            stars.style.opacity = String(shape.current * starlight(zoom))
            stars.style.backgroundPosition = starfieldPosition([center.lng, center.lat])
        }
        if (halo !== null) {
            const canvas = map.getContainer()
            const radius = globeRadius(zoom, center.lat, canvas.clientHeight)
            // A globe larger than the map has no rim in view, and a leaning one's rim is no circle.
            const seen = radius < Math.hypot(canvas.clientWidth, canvas.clientHeight) / 2 && map.getPitch() < 1
            halo.style.display = seen ? '' : 'none'
            halo.style.width = halo.style.height = `${(radius * 2).toFixed(1)}px`
            halo.style.boxShadow = haloShadow(radius, HALO_COLOR)
            halo.style.opacity = String(shape.current ** 4)
        }
    }, [map, stars, halo])
    const paintGlobeNow = useRef(paintGlobe)
    useEffect(() => {
        paintGlobeNow.current = paintGlobe
    })
    // The stars are drawn from a token, which only a document can read, so they are lit once their box is in one.
    useEffect(() => {
        if (stars !== null) stars.style.backgroundImage = starfieldStyle().backgroundImage
    }, [stars])
    useEffect(() => {
        if (map === null) return
        paintGlobe()
        map.on('move', paintGlobe)
        // A style built afresh has lost the state the projection reads.
        map.on('styledata', paintGlobe)
        return () => {
            map.off('move', paintGlobe)
            map.off('styledata', paintGlobe)
        }
    }, [map, paintGlobe])

    // The projection: the flat map, or the globe with its sky. A change rolls one into the other,
    // from wherever the last change had got to.
    useEffect(() => {
        if (map === null || scope === null || !ready) return
        const target = shownProjection === 'globe' ? 1 : 0
        const bend = (share: number) => {
            shape.current = share
            paintGlobeNow.current()
        }
        // The atmosphere belongs to the whole globe: it comes once the map has rolled up, and goes
        // before it rolls out.
        const settle = () => {
            bend(target)
            if (target === 0) {
                if (morphed.current) map.setProjection({ type: 'mercator' })
                morphed.current = false
                whole.current = null
                setSpace(false)
            } else {
                const palette = mapPalette(scope)
                map.setSky(globeSky(palette.horizon, palette.ground))
            }
            map.triggerRepaint()
        }
        if (target === 0) map.setSky(FLAT_SKY)
        if (target === 1 || shape.current > 0) {
            if (!morphed.current) {
                map.setGlobalStateProperty(GLOBE_STATE, shape.current * globeShare(map.getZoom()))
                map.setProjection(MORPH_PROJECTION)
                morphed.current = true
            }
            setSpace(true)
        }
        const from = shape.current
        if (!shaped.current || from === target) {
            shaped.current = true
            settle()
            return
        }
        // Rolled up, the camera goes to where the globe is seen whole, and the zoom it left is kept;
        // rolled out again, it goes back to that zoom, also when the roll is turned round half
        // way. The kept zoom is let go of only when the reader zooms, or the map lies flat again.
        const canvas = map.getContainer()
        const latitude = map.getCenter().lat
        let zoom: number | null = null
        if (target === 1) {
            const wanted = WHOLE_GLOBE * Math.min(canvas.clientWidth, canvas.clientHeight)
            const off = Math.abs(Math.log2(globeRadius(map.getZoom(), latitude, canvas.clientHeight) / wanted)) > 0.4
            if (whole.current === null && off) whole.current = map.getZoom()
            if (whole.current !== null) zoom = globeZoom(wanted, latitude, canvas.clientHeight)
        } else {
            zoom = whole.current
        }
        // A long way out or in takes longer, so the ground is not rushed past.
        const far = zoom === null ? 1 : Math.min(2.5, Math.max(1, Math.abs(zoom - map.getZoom()) / 3))
        const length = calm() ? 0 : MORPH_MS * Math.abs(target - from) * far
        if (zoom !== null) moved.current = true
        setIdle(false)
        const cancel = roll(map, {
            from,
            to: target,
            length,
            zoom,
            easing: easeInOut,
            bend,
            settle,
            veil: (hidden) => {
                if (overlay !== null) overlay.style.opacity = hidden ? '0' : ''
            },
        })
        cancelRoll.current = cancel
        return cancel
    }, [map, scope, overlay, ready, shownProjection, reading])

    // The lean: every move of the camera takes the pitch its zoom has, and a change of the option eases to it.
    useEffect(() => {
        if (map === null) return
        const options = leanNow.current
        map.setTransformCameraUpdate(options === null ? null : (next) => ({ pitch: pitchAtZoom(next.zoom, options) }))
        const pitch = options === null ? 0 : pitchAtZoom(map.getZoom(), options)
        if (Math.abs(map.getPitch() - pitch) > 0.01) map.easeTo({ pitch, duration: 300 })
    }, [map, leanKey])

    // Flies to the feature a new selection names: one made outside the map, when the feature is not
    // in view already, and one picked on the map when the option says so.
    useEffect(() => {
        if (map === null || stage === null || !ready) return
        const before = flownTo.current
        flownTo.current = current
        const options = flightNow.current
        if (before === undefined || before === current || current === null || options === null) return
        const pick = pickedOnMap.current
        pickedOnMap.current = null
        const here = pick !== null && pick.id === current && performance.now() - pick.at < 1000
        if (here && options.picks !== true) return
        let feature: Feature | null = null
        for (const entry of entries.current.values()) feature ??= entry.features.get(current) ?? null
        const at = feature === null ? null : anchorOf(feature)
        if (at === null) return
        const zoom = Math.max(map.getZoom(), options.zoom ?? 0)
        if (!here && zoom === map.getZoom() && inView(map, stage, corners, at)) return
        moved.current = true
        map.flyTo({ center: at, zoom, speed: 0.9, curve: 1.42, easing: easeInOut })
    }, [map, stage, corners, ready, current])

    // Runs after every layer's own effects, so the fit sees what they registered. New bounds are a
    // new subject, eased to whether or not the reader has moved the map since the last.
    useEffect(() => {
        if (map === null || !ready) return
        if (!fixed) {
            if (framedOn.current !== null && framedOn.current !== boundsKey) {
                moved.current = false
                fit(true)
            } else if (!moved.current) fit(false)
            framedOn.current = boundsKey
        }
        armed.current = true
        map.triggerRepaint()
    }, [map, ready, layerVersion, fixed, fit, boundsKey])

    useEffect(() => {
        if (corners === null) return
        const observer = new ResizeObserver(() => {
            if (!moved.current && !fixed) fitNow.current(false)
        })
        for (const corner of CORNERS) observer.observe(corners[corner])
        return () => observer.disconnect()
    }, [corners, fixed])

    useEffect(() => {
        const update = () => setFullscreen(scope !== null && fullscreenElement() === scope)
        const stop = subscribeFullscreen(update)
        return () => {
            stop()
            if (scope !== null) exitFullscreen(scope)
        }
    }, [scope])

    const context = useMemo<MapContextValue | null>(
        () =>
            map === null || scope === null || overlay === null || corners === null
                ? null
                : {
                      map,
                      scope,
                      overlay,
                      corners,
                      dark: dark || ground,
                      reading,
                      selected: current,
                      select,
                      register,
                      holdCamera,
                      takeClicks,
                      labels,
                  },
        [map, scope, overlay, corners, dark, ground, reading, current, select, register, holdCamera, takeClicks, labels],
    )

    const offered = basemaps.length > 1
    const chooseBasemap = (id: string) => {
        const next = basemaps.find((option) => option.id === id)
        if (next === undefined) return
        if (basemap === undefined) setPicked(next)
        onBasemapChange?.(next)
    }
    const credits =
        (hasTiles(shownBasemap) || shownBasemap.geometry !== undefined) && basemapVisible ? (shownBasemap.attribution ?? []) : []
    const creditsNow = useRef(credits)
    useEffect(() => {
        creditsNow.current = credits
    })
    const exportPng = useCallback(
        () =>
            map === null || scope === null
                ? Promise.reject(new Error('The map has not drawn yet.'))
                : exportImage(map, scope, creditsNow.current),
        [map, scope],
    )
    useImperativeHandle<MapHandle | null, MapHandle | null>(handle, () => (map === null ? null : { png: exportPng }), [map, exportPng])

    const toggleProjection = () => {
        const next: MapProjection = shownProjection === 'globe' ? 'mercator' : 'globe'
        if (projection === undefined) setHeldProjection(next)
        onProjectionChange?.(next)
    }
    const lines = unreadable > 0 ? [...notes, said.unreadable(unreadable)] : notes

    return (
        <div
            ref={setScope}
            role="region"
            aria-label={label}
            data-map-view=""
            data-map-idle={idle ? '' : undefined}
            data-theme-scope={ground ? theme : undefined}
            className={cn(
                'relative isolate flex min-h-64 flex-col overflow-hidden bg-card',
                ground && 'dark text-foreground',
                framed && 'rounded-surface border border-border',
                className,
            )}
        >
            <div ref={setStage} className="relative min-h-0 flex-1">
                {space && (
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={SPACE_STYLE}>
                        <div ref={setStars} className="absolute inset-0" />
                        <div ref={setHalo} className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full" />
                    </div>
                )}
                {/* Positioned inline: maplibre's own stylesheet sets the element relative, outside any layer. */}
                <div ref={setCanvasHost} style={{ position: 'absolute', inset: 0 }} />
                <div ref={setOverlay} className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity" />
                {CORNERS.map((corner) => (
                    <div
                        key={corner}
                        ref={cornerRefs[corner]}
                        className={cn(
                            'pointer-events-none absolute flex max-w-[calc(100%-1.5rem)] flex-col gap-2 *:pointer-events-auto',
                            CORNER_CLASS[corner],
                            credits.length > 0 && corner.startsWith('bottom') && 'bottom-7',
                        )}
                    >
                        {corner === 'top-right' && supported && shown !== null && (
                            <>
                                {(shown.zoom || shown.fit) && (
                                    <ButtonGroup orientation="vertical" className="rounded-control shadow-surface">
                                        {shown.zoom && (
                                            <>
                                                <ControlButton
                                                    label={said.zoomIn}
                                                    container={scope}
                                                    onClick={() => {
                                                        moved.current = true
                                                        whole.current = null
                                                        map?.zoomIn()
                                                    }}
                                                >
                                                    <Plus />
                                                </ControlButton>
                                                <ControlButton
                                                    label={said.zoomOut}
                                                    container={scope}
                                                    onClick={() => {
                                                        moved.current = true
                                                        whole.current = null
                                                        map?.zoomOut()
                                                    }}
                                                >
                                                    <Minus />
                                                </ControlButton>
                                            </>
                                        )}
                                        {shown.fit && (
                                            <ControlButton
                                                label={said.fit}
                                                container={scope}
                                                onClick={() => {
                                                    moved.current = false
                                                    fit(true)
                                                }}
                                            >
                                                <LocateFixed />
                                            </ControlButton>
                                        )}
                                    </ButtonGroup>
                                )}
                                {shown.fullscreen && (
                                    <ControlButton
                                        label={fullscreen ? said.exitFullscreen : said.fullscreen}
                                        container={scope}
                                        onClick={() => {
                                            if (scope === null) return
                                            if (fullscreenElement() === scope) exitFullscreen(scope)
                                            else enterFullscreen(scope)
                                        }}
                                    >
                                        {fullscreen ? <Shrink /> : <Expand />}
                                    </ControlButton>
                                )}
                                {shown.export && (
                                    <ControlButton
                                        label={said.export}
                                        container={scope}
                                        onClick={() => {
                                            exportPng().then(
                                                (href) => download(`${file}.png`, { href }),
                                                (reason: unknown) => console.error('The map could not be exported.', reason),
                                            )
                                        }}
                                    >
                                        <Download />
                                    </ControlButton>
                                )}
                                {shown.projection && (
                                    <ControlButton
                                        label={shownProjection === 'globe' ? said.flat : said.globe}
                                        container={scope}
                                        onClick={toggleProjection}
                                    >
                                        {shownProjection === 'globe' ? <MapIcon /> : <Globe />}
                                    </ControlButton>
                                )}
                            </>
                        )}
                        {corner === 'top-right' && supported && offered && (
                            <BasemapSwitcher
                                basemaps={basemaps}
                                value={shownBasemap.id}
                                onValueChange={chooseBasemap}
                                words={{ label: said.basemap }}
                            />
                        )}
                    </div>
                ))}
                {credits.length > 0 && (
                    <p className="absolute right-0 bottom-0 max-w-full truncate rounded-tl-sm bg-card/85 px-1.5 py-0.5 text-2xs leading-snug text-muted-foreground">
                        {credits.map((credit, index) => (
                            <Fragment key={credit.label}>
                                {index > 0 && ' '}
                                {credit.href === undefined ? (
                                    credit.label
                                ) : (
                                    <Link
                                        href={credit.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="hover:text-foreground hover:underline"
                                    >
                                        {credit.label}
                                    </Link>
                                )}
                            </Fragment>
                        ))}
                    </p>
                )}
                {waited && <Spinner aria-label={said.loading} className="absolute inset-0 m-auto text-muted-foreground" />}
                {(!supported || maplibre === 'failed') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                        <p>{supported ? said.failed : said.unavailable}</p>
                        {supported && (
                            <Button variant="outline" size="sm" onClick={() => setMaplibre(undefined)}>
                                {said.retry}
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {lines.length > 0 && (
                <ul className="shrink-0 space-y-0.5 border-t border-border px-3 py-1.5 text-help text-muted-foreground">
                    {lines.map((line, index) => (
                        <li key={index}>{line}</li>
                    ))}
                </ul>
            )}
            {context !== null && ready && <MapContext.Provider value={context}>{children}</MapContext.Provider>}
        </div>
    )
}

export interface MapOverlayProps {
    corner: MapCorner
    children: ReactNode
}

/** Puts its children in a corner of the map, stacked under whatever is there already. */
export function MapOverlay({ corner, children }: MapOverlayProps) {
    const { corners } = useMapContext()
    return createPortal(children, corners[corner])
}
