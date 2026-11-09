import type { Feature } from 'geojson'
import { Expand, Globe, LocateFixed, Map as MapIcon, Minus, Plus, Shrink } from 'lucide-react'
import type { Map as MapLibreMap, MapGeoJSONFeature, PaddingOptions, PointLike, StyleSpecification } from 'maplibre-gl'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Link } from '@winterop-com/sokkel-ui/Link'
import { useLongWait } from '@winterop-com/sokkel-ui/Loaders'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { enterFullscreen, exitFullscreen, fullscreenElement, subscribeFullscreen } from '@winterop-com/sokkel-ui/lib/fullscreen'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import { Spinner } from '@winterop-com/sokkel-ui/primitives/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'
import {
    BASEMAPS,
    BLANK_BASEMAP,
    GRATICULE_LAYER_ID,
    GROUND_LAYER_ID,
    SCHEME_BASEMAPS,
    TILES_LAYER_ID,
    VEIL_LAYER_ID,
    composeStyle,
    graticule as graticuleLines,
    hasTiles,
    labelAnchor,
    loadStyle,
    rasterStyle,
    resolveBasemap,
    type Basemap,
    type SchemeBasemaps,
} from './basemap'
import { BasemapSwitcher } from './BasemapSwitcher'
import { resolveColors } from './color'
import { ID_PROPERTY, MapContext, useMapContext, type MapContextValue, type MapCorner, type MapLayerEntry } from './context'
import { unionBounds, type Bounds, type LngLat } from './geometry'
import { FLAT_SKY, globeSky, starfieldStyle } from './globe'

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
    /** Said while the map engine loads, once the wait is long enough to show. */
    loading: string
    unavailable: string
    /** Said when the map engine could not be fetched. */
    failed: string
    /** The note under the map when its layers left out features whose geometry they could not read. */
    unreadable: (count: number) => string
}

const WORDS: MapWords = {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to the data',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    globe: 'View as a globe',
    flat: 'View as a flat map',
    basemap: 'Basemap',
    loading: 'Loading the map',
    unavailable: 'This browser cannot draw the map, because WebGL is not available.',
    failed: 'The map could not be loaded.',
    unreadable: (count) =>
        count === 1
            ? '1 geometry could not be read and is not drawn.'
            : `${count.toLocaleString('en-US')} geometries could not be read and are not drawn.`,
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
}

const CONTROLS: Required<MapControls> = { zoom: true, fit: true, fullscreen: true, projection: false }

/** A camera position: the center and the zoom. */
export interface MapCamera {
    center: LngLat
    zoom: number
}

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
    /** How opaque the basemap's tiles and place names are, from 0 to 1. */
    basemapOpacity?: number
    /** Whether the basemap's tiles and place names are drawn; the ground always is. */
    basemapVisible?: boolean
    /** The projection, when the caller holds it. */
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
    /** Called with the position of every click on the map. */
    onMapClick?: (at: LngLat) => void
    /** Which of the map's own controls are drawn: zoom, fit and full screen, none, or a choice. */
    controls?: boolean | MapControls
    /** Whether the map pans, zooms and answers clicks. */
    interactive?: boolean
    /** Draws the map in its own bordered, rounded frame; off for a map filling a panel that frames it already. */
    framed?: boolean
    /**
     * Lines under the map, such as how it frames a selection that has no geometry of its own. A
     * line counting the features the layers could not read is added after them.
     */
    notes?: readonly ReactNode[]
    words?: Partial<MapWords>
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

function isDark(): boolean {
    return document.documentElement.classList.contains('dark')
}

function webglAvailable(): boolean {
    try {
        return document.createElement('canvas').getContext('webgl2') !== null
    } catch {
        return false
    }
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

/** The tokens the map itself paints with: the ground, place names, the globe's horizon and the graticule. */
function mapPalette(scope: HTMLElement) {
    return resolveColors(scope, {
        ground: 'var(--card)',
        ink: 'color-mix(in oklab, var(--foreground) 80%, var(--card))',
        horizon: 'var(--chart-2)',
        graticule: 'color-mix(in oklab, var(--foreground) 14%, var(--card))',
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

/** One of the map's own buttons, in the library's look, with its name as a tooltip. */
function ControlButton({
    label,
    container,
    onClick,
    children,
}: {
    label: string
    container: HTMLElement | null
    onClick: () => void
    children: ReactNode
}) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        className="bg-card text-foreground shadow-xs hover:bg-hover dark:bg-card"
                        onClick={onClick}
                    />
                }
            >
                {children}
            </TooltipTrigger>
            <TooltipContent side="left" container={container}>
                {label}
            </TooltipContent>
        </Tooltip>
    )
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
 */
export function MapView({
    label,
    basemap,
    defaultBasemap = SCHEME_BASEMAPS,
    basemaps = BASEMAPS,
    onBasemapChange,
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
    onMapClick,
    controls = true,
    interactive = true,
    framed = true,
    notes = [],
    words,
    className,
    children,
}: MapViewProps) {
    const said = { ...WORDS, ...words }
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
    const [reading, setReading] = useState(0)
    const [fullscreen, setFullscreen] = useState(false)
    const [picked, setPicked] = useState<Basemap | null>(null)
    const wanted = resolveBasemap(basemap ?? picked ?? defaultBasemap, dark)
    const shownBasemap =
        basemap !== undefined || basemaps.some((option) => option.id === wanted.id) ? wanted : (basemaps[0] ?? BLANK_BASEMAP)
    const [heldProjection, setHeldProjection] = useState<MapProjection>(defaultProjection)
    const shownProjection = projection ?? heldProjection
    const [unreadable, setUnreadable] = useState(0)
    const [heldSelection, setHeldSelection] = useState<string | null>(defaultSelected)
    const current = selected !== undefined ? selected : heldSelection

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
    useEffect(() => {
        selectNow.current = select
        clickNow.current = onMapClick
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

    const fitTarget = useCallback((): Bounds | null => {
        if (bounds !== undefined) return bounds
        return unionBounds([...entries.current.values()].map((entry) => entry.bounds))
    }, [bounds])

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
    useEffect(() => {
        fitNow.current = fit
        shownBasemapRef.current = shownBasemap
    })

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
            () => {
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
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            interactive,
            fadeDuration: 0,
        })
        instance.touchZoomRotate.disableRotation()
        instance.keyboard.disableRotation()
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
            if (typeof id === 'string') selectNow.current(id)
        })
        instance.on('mousemove', (event) => {
            const hit = hitAt(event.point)
            const id: unknown = hit?.feature.properties[ID_PROPERTY]
            hover(hit !== null && typeof id === 'string' ? { source: hit.entry.source, id } : null)
            instance.getCanvas().style.cursor = hit === null ? '' : 'pointer'
        })
        instance.on('mouseout', () => {
            hover(null)
            instance.getCanvas().style.cursor = ''
        })
        instance.on('movestart', (event) => {
            if ('originalEvent' in event && event.originalEvent !== undefined) moved.current = true
            setIdle(false)
        })
        instance.on('dataloading', () => setIdle(false))
        instance.on('idle', () => {
            if (armed.current && !pendingStyle.current) setIdle(true)
        })
        instance.on('load', () => setReady(true))

        const resize = new ResizeObserver(() => {
            instance.resize()
            if (!moved.current) fitNow.current(false)
        })
        resize.observe(stage)
        setMap(instance)
        return () => {
            resize.disconnect()
            armed.current = false
            pendingStyle.current = true
            lastFit.current = ''
            framedOn.current = null
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
        const observer = new MutationObserver(() => {
            setDark(isDark())
            setReading((value) => value + 1)
            setIdle(false)
        })
        observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
        return () => observer.disconnect()
    }, [])

    // The basemap's style, composed with the map's own layers; a change of basemap, scheme or
    // opacity is a diff of the style, so the data layers and their feature state stay.
    const styleKey = shownBasemap.style ?? (shownBasemap.tiles ?? []).join(' ')
    useEffect(() => {
        if (map === null || scope === null || !ready) return
        let cancelled = false
        pendingStyle.current = true
        setIdle(false)
        const basemap = shownBasemapRef.current
        const palette = mapPalette(scope)
        const options = { ground: palette.ground, ink: palette.ink, opacity: basemapOpacity, visible: basemapVisible }
        const apply = (style: StyleSpecification) => {
            if (cancelled) return
            map.setStyle(style, { diff: true, transformStyle: (previous, next) => composeStyle(next, previous, options) })
            pendingStyle.current = false
            map.triggerRepaint()
        }
        if (basemap.style === undefined) apply(rasterStyle(basemap, dark))
        else
            loadStyle(basemap.style).then(apply, () => {
                if (!cancelled) apply(rasterStyle(BLANK_BASEMAP, dark))
            })
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
            const above =
                map
                    .getLayersOrder()
                    .find((id) => id.startsWith('wui-') && id !== GROUND_LAYER_ID && id !== TILES_LAYER_ID && id !== VEIL_LAYER_ID) ??
                labelAnchor(map)
            map.addLayer(
                { id: GRATICULE_LAYER_ID, type: 'line', source: GRATICULE_LAYER_ID, paint: { 'line-color': color, 'line-width': 0.75 } },
                above,
            )
        } else {
            map.setPaintProperty(GRATICULE_LAYER_ID, 'line-color', color)
        }
    }, [map, scope, ready, graticule, reading])

    useEffect(() => {
        if (map === null || scope === null || !ready) return
        map.setProjection({ type: shownProjection })
        const palette = mapPalette(scope)
        map.setSky(shownProjection === 'globe' ? globeSky(palette.horizon, palette.ground) : FLAT_SKY)
    }, [map, scope, ready, shownProjection, reading])

    // Runs after every layer's own effects, so the fit sees what they registered. New bounds are a
    // new subject, eased to whether or not the reader has moved the map since the last.
    const boundsKey = bounds === undefined ? '' : bounds.join(' ')
    useEffect(() => {
        if (map === null || !ready) return
        if (camera === undefined) {
            if (framedOn.current !== null && framedOn.current !== boundsKey) {
                moved.current = false
                fit(true)
            } else if (!moved.current) fit(false)
            framedOn.current = boundsKey
        }
        armed.current = true
        map.triggerRepaint()
    }, [map, ready, layerVersion, camera, fit, boundsKey])

    useEffect(() => {
        if (corners === null) return
        const observer = new ResizeObserver(() => {
            if (!moved.current && camera === undefined) fitNow.current(false)
        })
        for (const corner of CORNERS) observer.observe(corners[corner])
        return () => observer.disconnect()
    }, [corners, camera])

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
                : { map, scope, overlay, corners, dark, reading, selected: current, select, register },
        [map, scope, overlay, corners, dark, reading, current, select, register],
    )

    const offered = basemaps.length > 1
    const chooseBasemap = (id: string) => {
        const next = basemaps.find((option) => option.id === id)
        if (next === undefined) return
        if (basemap === undefined) setPicked(next)
        onBasemapChange?.(next)
    }
    const credits = hasTiles(shownBasemap) && basemapVisible ? (shownBasemap.attribution ?? []) : []

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
            className={cn(
                'relative isolate flex min-h-64 flex-col overflow-hidden bg-card',
                framed && 'rounded-surface border border-border',
                className,
            )}
        >
            <div ref={setStage} className="relative min-h-0 flex-1">
                {shownProjection === 'globe' && (
                    <div aria-hidden className="pointer-events-none absolute inset-0" style={starfieldStyle()} />
                )}
                {/* Positioned inline: maplibre's own stylesheet sets the element relative, outside any layer. */}
                <div ref={setCanvasHost} style={{ position: 'absolute', inset: 0 }} />
                <div ref={setOverlay} className="pointer-events-none absolute inset-0 overflow-hidden" />
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
                                    <ButtonGroup orientation="vertical" className="rounded-control shadow-xs">
                                        {shown.zoom && (
                                            <>
                                                <ControlButton
                                                    label={said.zoomIn}
                                                    container={scope}
                                                    onClick={() => {
                                                        moved.current = true
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
                    <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                        {supported ? said.failed : said.unavailable}
                    </p>
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
