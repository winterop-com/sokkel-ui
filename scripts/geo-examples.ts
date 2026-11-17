/**
 * Write the regions and places the examples and the map stories draw: Liberia's fifteen counties
 * from Natural Earth's 1:10m Admin 1 states and provinces at the pinned version, and some five
 * hundred invented sites placed inside them. Each county keeps its outline, an id made from its
 * name and its name; positions are rounded to three decimals, a hundred meters or so. The sites'
 * names are made up from two word lists and their positions drawn from a seeded generator, so the
 * same version writes the same files every time. The same two files go to examples/shared/geo and
 * src/stories/map/fixtures.
 *
 *   bun scripts/geo-examples.ts                 fetch the pinned file and write the data
 *   bun scripts/geo-examples.ts <file.geojson>  write it from a copy already on disk
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from 'geojson'

const VERSION = 'v5.1.2'
const SOURCE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${VERSION}/geojson/ne_10m_admin_1_states_provinces.geojson`
const COUNTRY = 'LBR'
const ROOT = join(import.meta.dirname, '..')
const OUT = [join(ROOT, 'examples', 'shared', 'geo'), join(ROOT, 'src', 'stories', 'map', 'fixtures')]

/** How many sites to place across the country. */
const SITE_COUNT = 554
/** The fewest sites a county gets, however small it is. */
const SITE_FLOOR = 12

const FIRST = [
    'Alder',
    'Amber',
    'Ash',
    'Birch',
    'Bramble',
    'Cedar',
    'Clover',
    'Copper',
    'Fern',
    'Flint',
    'Hazel',
    'Heron',
    'Kestrel',
    'Maple',
    'Marsh',
    'Moss',
    'Otter',
    'Pebble',
    'Pine',
    'Reed',
    'Rowan',
    'Sorrel',
    'Thistle',
    'Willow',
    'Wren',
]
const SECOND = [
    'Bend',
    'Bridge',
    'Brook',
    'Cove',
    'Creek',
    'Crossing',
    'Falls',
    'Ferry',
    'Field',
    'Ford',
    'Gate',
    'Glen',
    'Grove',
    'Hill',
    'Hollow',
    'Landing',
    'Market',
    'Meadow',
    'Mill',
    'Point',
    'Pond',
    'Ridge',
    'Spring',
    'Well',
    'Wharf',
]

interface RawProperties {
    adm0_a3: string
    name: string
}

type Area = Feature<Polygon | MultiPolygon, { name: string }>

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

const slug = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

/** A ring rounded, with a position the rounding made equal to the one before it left out; null where too little is left to close it. */
function ring(positions: readonly Position[]): Position[] | null {
    const kept: Position[] = []
    for (const [lng, lat] of positions) {
        const next = [round(lng, 3), round(lat, 3)]
        const last = kept.at(-1)
        if (last === undefined || last[0] !== next[0] || last[1] !== next[1]) kept.push(next)
    }
    return kept.length < 4 ? null : kept
}

function polygon(rings: readonly Position[][]): Position[][] | null {
    const kept = rings.map(ring)
    const outer = kept[0]
    if (outer === null || outer === undefined) return null
    return [outer, ...kept.slice(1).filter((one): one is Position[] => one !== null)]
}

function area(raw: Feature<Polygon | MultiPolygon, RawProperties>): Area | null {
    const { name } = raw.properties
    const geometry = raw.geometry
    const properties = { name }
    if (geometry.type === 'Polygon') {
        const coordinates = polygon(geometry.coordinates)
        return coordinates === null ? null : { type: 'Feature', id: slug(name), properties, geometry: { type: 'Polygon', coordinates } }
    }
    const coordinates = geometry.coordinates.map(polygon).filter((one): one is Position[][] => one !== null)
    if (coordinates.length === 0) return null
    return { type: 'Feature', id: slug(name), properties, geometry: { type: 'MultiPolygon', coordinates } }
}

const polygonsOf = (feature: Area) => (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates)

/** A ring's area in square degrees, for sharing the sites out; close enough this near the equator. */
function ringArea(positions: readonly Position[]): number {
    let sum = 0
    for (let index = 0, previous = positions.length - 1; index < positions.length; previous = index, index += 1) {
        sum += (positions[previous][0] - positions[index][0]) * (positions[previous][1] + positions[index][1])
    }
    return Math.abs(sum) / 2
}

const areaOf = (feature: Area) =>
    polygonsOf(feature).reduce(
        (sum, rings) => sum + ringArea(rings[0]) - rings.slice(1).reduce((holes, hole) => holes + ringArea(hole), 0),
        0,
    )

function insideRing(lng: number, lat: number, positions: readonly Position[]): boolean {
    let within = false
    for (let index = 0, previous = positions.length - 1; index < positions.length; previous = index, index += 1) {
        const [xi, yi] = positions[index]
        const [xj, yj] = positions[previous]
        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) within = !within
    }
    return within
}

const inside = (feature: Area, lng: number, lat: number) =>
    polygonsOf(feature).some((rings) => insideRing(lng, lat, rings[0]) && !rings.slice(1).some((hole) => insideRing(lng, lat, hole)))

/** A generator of numbers from 0 to 1 that gives the same run for the same seed (mulberry32). */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let next = Math.imul(state ^ (state >>> 15), state | 1)
        next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
        return ((next ^ (next >>> 14)) >>> 0) / 4294967296
    }
}

/** How many sites each county gets: a floor each, the rest shared by area, largest remainder first. */
function shares(areas: readonly Area[]): number[] {
    const sizes = areas.map(areaOf)
    const total = sizes.reduce((sum, size) => sum + size, 0)
    const spare = SITE_COUNT - SITE_FLOOR * areas.length
    const exact = sizes.map((size) => (spare * size) / total)
    const counts = exact.map((value) => SITE_FLOOR + Math.floor(value))
    const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
    for (let left = SITE_COUNT - counts.reduce((sum, count) => sum + count, 0), at = 0; left > 0; left -= 1, at += 1) {
        counts[order[at].index] += 1
    }
    return counts
}

function sites(areas: readonly Area[]): Feature<Point, { name: string; region: string }>[] {
    const random = seeded(20261117)
    const names = FIRST.flatMap((first) => SECOND.map((second) => `${first} ${second}`))
    for (let index = names.length - 1; index > 0; index -= 1) {
        const other = Math.floor(random() * (index + 1))
        ;[names[index], names[other]] = [names[other], names[index]]
    }
    const counts = shares(areas)
    const features: Feature<Point, { name: string; region: string }>[] = []
    areas.forEach((region, at) => {
        const positions = polygonsOf(region).flatMap((rings) => rings[0])
        const west = Math.min(...positions.map((one) => one[0]))
        const east = Math.max(...positions.map((one) => one[0]))
        const south = Math.min(...positions.map((one) => one[1]))
        const north = Math.max(...positions.map((one) => one[1]))
        for (let placed = 0; placed < counts[at];) {
            const lng = round(west + (east - west) * random(), 4)
            const lat = round(south + (north - south) * random(), 4)
            if (!inside(region, lng, lat)) continue
            const name = names[features.length]
            const id = String(region.id)
            features.push({
                type: 'Feature',
                id: `${id}/${slug(name)}`,
                properties: { name, region: id },
                geometry: { type: 'Point', coordinates: [lng, lat] },
            })
            placed += 1
        }
    })
    return features.sort((a, b) => a.properties.name.localeCompare(b.properties.name))
}

if (SITE_COUNT > FIRST.length * SECOND.length) throw new Error('fewer names than sites')

const given = process.argv[2]
const text = given === undefined ? await (await fetch(SOURCE)).text() : readFileSync(given, 'utf8')
const raw = JSON.parse(text) as FeatureCollection<Polygon | MultiPolygon, RawProperties>
const areas = raw.features
    .filter((one) => one.properties.adm0_a3 === COUNTRY)
    .map(area)
    .filter((one): one is Area => one !== null)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
const places = sites(areas)

// One feature a line, so a new version shows as a diff of the features it changes.
const collection = (features: readonly Feature[]) =>
    `{"type":"FeatureCollection","features":[\n${features.map((one) => JSON.stringify(one)).join(',\n')}\n]}\n`
const files = { 'regions.json': collection(areas), 'places.json': collection(places) }
for (const folder of OUT) {
    mkdirSync(folder, { recursive: true })
    for (const [name, body] of Object.entries(files)) writeFileSync(join(folder, name), body)
}
console.log(
    `wrote regions.json (${String(areas.length)} counties, ${String(Buffer.byteLength(files['regions.json']))} bytes) and places.json (${String(places.length)} sites, ${String(Buffer.byteLength(files['places.json']))} bytes) from Natural Earth ${VERSION} to examples/shared/geo and src/stories/map/fixtures`,
)
