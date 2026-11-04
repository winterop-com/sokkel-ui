import type { SkySpecification } from 'maplibre-gl'

/**
 * The sky the globe wears: transparent space, so the starfield behind the canvas shows, and an
 * atmosphere rim that fades out by the zoom where the globe has flattened.
 */
export function globeSky(horizon: string, fog: string): SkySpecification {
    return {
        'sky-color': 'transparent',
        'horizon-color': horizon,
        'fog-color': fog,
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.6,
        'fog-ground-blend': 0.9,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.45, 4, 0.45, 6, 0],
    }
}

/** The sky of the flat map: none. */
export const FLAT_SKY: SkySpecification = { 'atmosphere-blend': 0 }

/** Deep space, the same in both schemes. */
const SPACE_COLOR = '#05080f'

/** Starlight; each star's brightness is its opacity. */
const STAR_COLOR = '#dbe7ff'

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
function starTile(layer: StarLayer): string {
    const random = seeded(SEED ^ layer.tileSize)
    let circles = ''
    for (let index = 0; index < layer.starCount; index += 1) {
        const skew = random() ** 2
        const x = Math.round(random() * layer.tileSize * 10) / 10
        const y = Math.round(random() * layer.tileSize * 10) / 10
        const radius = Math.round((layer.radius[0] + (layer.radius[1] - layer.radius[0]) * skew) * 100) / 100
        const opacity = Math.round((layer.opacity[0] + (layer.opacity[1] - layer.opacity[0]) * random()) * 100) / 100
        circles += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${STAR_COLOR}" fill-opacity="${opacity}"/>`
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layer.tileSize}" height="${layer.tileSize}">${circles}</svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

let paint: { backgroundColor: string; backgroundImage: string } | null = null

/** The starfield as CSS: deep space with every star layer tiled over it. */
export function starfieldStyle(): { backgroundColor: string; backgroundImage: string } {
    paint ??= { backgroundColor: SPACE_COLOR, backgroundImage: STAR_LAYERS.map(starTile).join(', ') }
    return paint
}
