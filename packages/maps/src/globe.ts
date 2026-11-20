import type { ProjectionSpecification, SkySpecification } from 'maplibre-gl'

import type { LngLat } from './geometry'

/** The style's global state that says how far the map is a globe: 0 flat, 1 the globe, and between while one becomes the other. */
export const GLOBE_STATE = 'wui-globe'

/**
 * A projection drawn by the globe state: the flat map at 0, the globe at 1, and bent part of the
 * way between, so the map rolls up into the globe and back out of it.
 */
export const MORPH_PROJECTION: ProjectionSpecification = {
    type: ['interpolate', ['linear'], ['global-state', GLOBE_STATE], 0, 'mercator', 1, 'vertical-perspective'],
}

/** How much of the globe is left at a zoom: all of it up to 11 and none from 12, where the ground is flat to the eye and is drawn flat. */
export const globeShare = (zoom: number): number => Math.min(1, Math.max(0, 12 - zoom))

/**
 * The sky the globe wears: transparent space, so the starfield behind the canvas shows, and an
 * atmosphere that catches the engine's sun along one side of the rim, thinning as the globe grows
 * and gone by the zoom where it fills the view.
 */
export function globeSky(horizon: string, fog: string): SkySpecification {
    return {
        'sky-color': 'transparent',
        'horizon-color': horizon,
        'fog-color': fog,
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.6,
        'fog-ground-blend': 0.9,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 3, 0.75, 5, 0.35, 7, 0],
    }
}

/** The sky of the flat map: none. */
export const FLAT_SKY: SkySpecification = { 'atmosphere-blend': 0 }

/** How bright the stars are at a zoom: full from afar, fading as the globe grows, and gone once it fills the view. */
export const starlight = (zoom: number): number => Math.min(1, Math.max(0, (4.5 - zoom) / 2.5))

/** The engine's field of view, top to bottom, in radians. */
const FIELD_OF_VIEW = 0.6435011087932844

/**
 * The radius the globe is drawn at on the screen, in pixels, for a camera looking straight down on
 * a `latitude` at a `zoom`, over a canvas `height` pixels tall. The engine sizes the sphere so the
 * ground at the center is as large as on the flat map, and looks at it from where the flat map's
 * camera stands, so the rim it shows is the sphere's outline from there.
 */
export function globeRadius(zoom: number, latitude: number, height: number): number {
    const sphere = (512 * 2 ** zoom) / (2 * Math.PI) / Math.cos((latitude * Math.PI) / 180)
    const away = height / 2 / Math.tan(FIELD_OF_VIEW / 2)
    return (away * sphere) / Math.sqrt((away + sphere) ** 2 - sphere ** 2)
}

/** The zoom at which the globe is drawn at a `radius` on the screen: what `globeRadius` gives, read the other way. */
export function globeZoom(radius: number, latitude: number, height: number): number {
    const away = height / 2 / Math.tan(FIELD_OF_VIEW / 2)
    const sphere = (radius ** 2 + radius * Math.hypot(radius, away)) / away
    return Math.log2((sphere * 2 * Math.PI * Math.cos((latitude * Math.PI) / 180)) / 512)
}

/** How much of a canvas's shorter side the globe's radius takes when the globe is shown whole. */
export const WHOLE_GLOBE = 0.36

/**
 * The glow round a globe of a radius, as a CSS `box-shadow` for a disc of the globe's size laid
 * behind the canvas: a bright band hugging the rim and a wide faint one beyond it, in `color`.
 */
export function haloShadow(radius: number, color: string): string {
    const band = (blur: number, spread: number, share: number) =>
        `0 0 ${(radius * blur).toFixed(1)}px ${(radius * spread).toFixed(1)}px color-mix(in oklab, ${color} ${String(share)}%, transparent)`
    return `${band(0.11, 0.012, 62)}, ${band(0.5, 0.05, 16)}`
}

/** Deep space, the same in both schemes. */
const SPACE_COLOR = 'var(--globe-space)'

/** Starlight, read from its token because a star tile is an image that cannot see the page's variables; each star's brightness is its opacity. */
function starColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--globe-star').trim() || 'white'
}

/** The seed every star is placed from, so every mount draws the same sky. */
const SEED = 0x5eed5

interface StarLayer {
    tileSize: number
    starCount: number
    radius: [number, number]
    opacity: [number, number]
}

/** A sparse layer of brighter stars over a dense layer of faint ones, tiled at different sizes. */
const STAR_LAYERS: StarLayer[] = [
    { tileSize: 1024, starCount: 60, radius: [0.7, 1.6], opacity: [0.5, 0.95] },
    { tileSize: 512, starCount: 130, radius: [0.4, 1.0], opacity: [0.15, 0.55] },
]

/** mulberry32: a small deterministic PRNG. */
function seeded(seed: number): () => number {
    let state = seed
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

/** One layer's tile as an SVG data url; most stars are specks and a few are bright. */
function starTile(layer: StarLayer, color: string): string {
    const random = seeded(SEED ^ layer.tileSize)
    let circles = ''
    for (let index = 0; index < layer.starCount; index += 1) {
        const skew = random() ** 2
        const x = Math.round(random() * layer.tileSize * 10) / 10
        const y = Math.round(random() * layer.tileSize * 10) / 10
        const radius = Math.round((layer.radius[0] + (layer.radius[1] - layer.radius[0]) * skew) * 100) / 100
        const opacity = Math.round((layer.opacity[0] + (layer.opacity[1] - layer.opacity[0]) * random()) * 100) / 100
        circles += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity="${opacity}"/>`
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layer.tileSize}" height="${layer.tileSize}">${circles}</svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Deep space as CSS: the ground the stars stand on, which shows wherever the globe does not reach. */
export const SPACE_STYLE = { backgroundColor: SPACE_COLOR }

let paint: { backgroundImage: string } | null = null

/** The stars as CSS: every star layer tiled over a clear ground, for a box laid over deep space. */
export function starfieldStyle(): { backgroundImage: string } {
    paint ??= { backgroundImage: STAR_LAYERS.map((layer) => starTile(layer, starColor())).join(', ') }
    return paint
}

/**
 * Where each star layer's tiles start for a camera's center, as a CSS `background-position`: the sky
 * drifts as the globe is turned, the sparse bright layer further than the dense faint one, and a
 * whole turn brings each layer back to where it began.
 */
export function starfieldPosition([lng, lat]: LngLat): string {
    const shift = (degrees: number, layer: StarLayer) => `${((degrees * layer.tileSize) / 360).toFixed(1)}px`
    return STAR_LAYERS.map((layer) => `${shift(-lng, layer)} ${shift(lat, layer)}`).join(', ')
}
