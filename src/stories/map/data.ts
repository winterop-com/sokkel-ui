import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'

import type { Bounds } from '@winterop-com/sokkel-ui-maps/geometry'
import type { Grid } from '@winterop-com/sokkel-ui-maps/GridLayer'
import placeFixture from './fixtures/sierra-leone-places.json'
import regionFixture from './fixtures/sierra-leone-regions.json'

/** Thirteen regions of Sierra Leone, simplified to about a hundred meters. */
export const regions = regionFixture as unknown as FeatureCollection<Polygon | MultiPolygon, { name: string }>

/** Some five hundred places, each in a region. */
export const places = placeFixture as unknown as FeatureCollection<Point, { name: string; region: string }>

export const NUMBER = new Intl.NumberFormat('en-US')

/** One region's figures. */
export interface RegionFigures {
    population: number
    /** Square kilometers. */
    area: number
    /** People per square kilometer. */
    density: number
    /** The change in population since 2015, in percent; null where 2015 had no count. */
    change: number | null
}

const BY_NAME: Record<string, Omit<RegionFigures, 'density'>> = {
    Bo: { population: 575_478, area: 5_473, change: 18.4 },
    Bombali: { population: 606_544, area: 7_985, change: 9.1 },
    Bonthe: { population: 200_781, area: 3_468, change: null },
    Kailahun: { population: 526_379, area: 3_859, change: -3.2 },
    Kambia: { population: 345_474, area: 3_108, change: 6.5 },
    Kenema: { population: 609_891, area: 6_053, change: 12.0 },
    Koinadugu: { population: 409_372, area: 12_121, change: -8.7 },
    Kono: { population: 506_100, area: 5_641, change: -1.4 },
    Moyamba: { population: 318_588, area: 6_902, change: 4.0 },
    'Port Loko': { population: 615_376, area: 5_719, change: 14.2 },
    Pujehun: { population: 346_461, area: 4_105, change: 0.8 },
    Tonkolili: { population: 531_435, area: 7_003, change: 2.6 },
    'Western Area': { population: 1_500_234, area: 557, change: 24.5 },
}

/** Each region's figures, by its id. */
export const figures: Record<string, RegionFigures> = Object.fromEntries(
    regions.features.map((feature) => {
        const known = BY_NAME[feature.properties.name]
        return [String(feature.id), { ...known, density: Math.round(known.population / known.area) }]
    }),
)

/** A region's name, by its id. */
export const regionName: Record<string, string> = Object.fromEntries(
    regions.features.map((feature) => [String(feature.id), feature.properties.name]),
)

/** A number from 0 to 1 that is always the same for the same text. */
function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return hash / 0xffffffff
}

export type SiteStatus = 'open' | 'closed' | 'planned'

/** Each place's status and its capacity in people; a planned site has no capacity yet. */
export const sites: Record<string, { status: SiteStatus; capacity: number | null }> = Object.fromEntries(
    places.features.map((feature: Feature<Point>) => {
        const id = String(feature.id)
        const draw = hashed(id)
        const status: SiteStatus = draw < 0.7 ? 'open' : draw < 0.85 ? 'closed' : 'planned'
        const capacity = status === 'planned' ? null : Math.round(20 + 780 * hashed(`${id}:capacity`) ** 2)
        return [id, { status, capacity }]
    }),
)

/** The months a rainfall grid covers. */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, index) => ({
    id: `2025-${String(index + 1).padStart(2, '0')}`,
    label: `${label} 2025`,
}))

/** How wet each month is across the country, as a share of the wettest. */
const SEASON = [0.01, 0.02, 0.06, 0.14, 0.32, 0.6, 0.92, 1, 0.78, 0.46, 0.18, 0.04]

const GRID_BOUNDS: Bounds = [-13.4, 6.85, -10.2, 10.05]
const CELL = 0.05

function insideRing(lng: number, lat: number, ring: number[][]): boolean {
    let within = false
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
        const [xi, yi] = ring[index]
        const [xj, yj] = ring[previous]
        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) within = !within
    }
    return within
}

function onLand(lng: number, lat: number): boolean {
    return regions.features.some((feature) => {
        const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
        return polygons.some((polygon) => insideRing(lng, lat, polygon[0]) && !polygon.slice(1).some((hole) => insideRing(lng, lat, hole)))
    })
}

/** Smooth value noise from 0 to 1, the same for the same position. */
function noise(x: number, y: number): number {
    const corner = (cx: number, cy: number) => hashed(`${cx},${cy}`)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = corner(x0, y0) * (1 - sx) + corner(x0 + 1, y0) * sx
    const bottom = corner(x0, y0 + 1) * (1 - sx) + corner(x0 + 1, y0 + 1) * sx
    return top * (1 - sy) + bottom * sy
}

const columns = Math.round((GRID_BOUNDS[2] - GRID_BOUNDS[0]) / CELL)
const rows = Math.round((GRID_BOUNDS[3] - GRID_BOUNDS[1]) / CELL)
const land: boolean[] = []
const wetness: number[] = []
for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
        const lng = GRID_BOUNDS[0] + (column + 0.5) * CELL
        const lat = GRID_BOUNDS[3] - (row + 0.5) * CELL
        land.push(onLand(lng, lat))
        // Wettest on the southwest coast, drier toward the northeast, with local variation.
        const coast = Math.min(1, Math.max(0, ((-10.2 - lng) / 3.2) * 0.55 + ((10.05 - lat) / 3.2) * 0.45))
        wetness.push(0.45 + 0.4 * coast + 0.25 * (noise(lng * 2.2, lat * 2.2) - 0.5) + 0.1 * (noise(lng * 7, lat * 7) - 0.5))
    }
}

/** Monthly rainfall on a five-kilometer grid, in millimeters, for each month of 2025. */
export const rainfall: Record<string, Grid> = Object.fromEntries(
    MONTHS.map((month, index) => [
        month.id,
        {
            bounds: GRID_BOUNDS,
            columns,
            rows,
            values: wetness.map((wet, cell) => (land[cell] ? Math.round(820 * SEASON[index] * wet) : null)),
        },
    ]),
)

/** How far apart neighboring hexagons' centers lie across, in degrees. */
const HEX = 0.034

let hexagonCells: FeatureCollection<Polygon, { name: string; reached: number }> | null = null

/**
 * Some six thousand hexagonal cells covering the country's land, each with a name and a share of
 * households reached, in percent, that varies smoothly across the land. Built the same every time.
 */
export function hexagons(): FeatureCollection<Polygon, { name: string; reached: number }> {
    hexagonCells ??= buildHexagons()
    return hexagonCells
}

function buildHexagons(): FeatureCollection<Polygon, { name: string; reached: number }> {
    const radius = HEX / Math.sqrt(3)
    const step = radius * 1.5
    const features: Feature<Polygon, { name: string; reached: number }>[] = []
    for (let row = 0; GRID_BOUNDS[1] + row * step <= GRID_BOUNDS[3]; row += 1) {
        const lat = GRID_BOUNDS[1] + row * step
        for (let column = 0; GRID_BOUNDS[0] + column * HEX <= GRID_BOUNDS[2]; column += 1) {
            const lng = GRID_BOUNDS[0] + column * HEX + (row % 2 === 1 ? HEX / 2 : 0)
            if (!onLand(lng, lat)) continue
            const ring = Array.from({ length: 7 }, (_, corner) => {
                const angle = (Math.PI / 3) * (corner % 6) + Math.PI / 6
                return [lng + radius * Math.cos(angle), lat + radius * Math.sin(angle)]
            })
            const id = `${String(row).padStart(3, '0')}-${String(column).padStart(3, '0')}`
            const wave = 0.5 + 0.22 * Math.sin(lng * 2.3 + lat * 1.7) + 0.18 * Math.cos(lat * 3.1 - lng * 0.9)
            const reached = Math.round(100 * Math.min(1, Math.max(0, wave + 0.12 * (hashed(id) - 0.5))))
            features.push({
                type: 'Feature',
                id,
                properties: { name: `Cell ${id}`, reached },
                geometry: { type: 'Polygon', coordinates: [ring] },
            })
        }
    }
    return { type: 'FeatureCollection', features }
}

let scattered: FeatureCollection<Point, { name: string }> | null = null

/**
 * Twenty thousand sites scattered over the land, thicker around a few towns, each placed by a hash
 * of its number so the scatter is the same every time.
 */
export function manySites(): FeatureCollection<Point, { name: string }> {
    scattered ??= buildSites()
    return scattered
}

function buildSites(): FeatureCollection<Point, { name: string }> {
    const towns = places.features.filter((_, index) => index % 25 === 0).map((place) => place.geometry.coordinates)
    const features: Feature<Point, { name: string }>[] = []
    for (let index = 0; features.length < 20_000; index += 1) {
        const town = towns[Math.floor(hashed(`town:${String(index)}`) * towns.length) % towns.length]
        const spread = 0.04 + 0.5 * hashed(`spread:${String(index)}`) ** 3
        const angle = 2 * Math.PI * hashed(`angle:${String(index)}`)
        const lng = town[0] + spread * Math.cos(angle)
        const lat = town[1] + spread * Math.sin(angle)
        if (!onLand(lng, lat)) continue
        const id = `site-${String(features.length + 1)}`
        features.push({
            type: 'Feature',
            id,
            properties: { name: `Site ${String(features.length + 1)}` },
            geometry: { type: 'Point', coordinates: [lng, lat] },
        })
    }
    return { type: 'FeatureCollection', features }
}
