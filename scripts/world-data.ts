/**
 * Write the world's countries the maps package loads, packages/maps/src/data/countries-110m.json,
 * from Natural Earth's 1:110m Admin 0 countries at the pinned version, keeping only what a map
 * draws: each country's outline, its ISO 3166-1 alpha-3 code as the feature's id (Natural Earth's
 * own code where a country has none) and its name. Positions are rounded to two decimals, a
 * kilometer or so, finer than the scale draws. Antarctica is left out.
 *
 *   bun scripts/world-data.ts                 fetch the pinned file and write the data
 *   bun scripts/world-data.ts <file.geojson>  write it from a copy already on disk
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'

const VERSION = 'v5.1.2'
const SOURCE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${VERSION}/geojson/ne_110m_admin_0_countries.geojson`
const OUT = join(import.meta.dirname, '..', 'packages', 'maps', 'src', 'data', 'countries-110m.json')

interface RawProperties {
    NAME: string
    ISO_A3_EH: string
    ADM0_A3: string
}

const round = (value: number) => Math.round(value * 100) / 100

/** A ring rounded, with a position the rounding made equal to the one before it left out; null where too little is left to close it. */
function ring(positions: readonly Position[]): Position[] | null {
    const kept: Position[] = []
    for (const [lng, lat] of positions) {
        const next = [round(lng), round(lat)]
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

function country(raw: Feature<Polygon | MultiPolygon, RawProperties>): Feature<Polygon | MultiPolygon, { name: string }> | null {
    const { NAME, ISO_A3_EH, ADM0_A3 } = raw.properties
    const id = ISO_A3_EH === '-99' ? ADM0_A3 : ISO_A3_EH
    const geometry = raw.geometry
    if (geometry.type === 'Polygon') {
        const coordinates = polygon(geometry.coordinates)
        return coordinates === null ? null : { type: 'Feature', id, properties: { name: NAME }, geometry: { type: 'Polygon', coordinates } }
    }
    const coordinates = geometry.coordinates.map(polygon).filter((one): one is Position[][] => one !== null)
    if (coordinates.length === 0) return null
    return { type: 'Feature', id, properties: { name: NAME }, geometry: { type: 'MultiPolygon', coordinates } }
}

const given = process.argv[2]
const text = given === undefined ? await (await fetch(SOURCE)).text() : readFileSync(given, 'utf8')
const raw = JSON.parse(text) as FeatureCollection<Polygon | MultiPolygon, RawProperties>
const countries = raw.features
    .map(country)
    // Antarctica is left out: no country figures sit on it, and the Mercator map stretches it across its whole width.
    .filter((one): one is NonNullable<typeof one> => one !== null && one.id !== 'ATA')
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))

// One country a line, so a new version shows as a diff of the countries it changes.
const out = `{"type":"FeatureCollection","features":[\n${countries.map((one) => JSON.stringify(one)).join(',\n')}\n]}\n`
writeFileSync(OUT, out)
console.log(
    `wrote packages/maps/src/data/countries-110m.json from Natural Earth ${VERSION}: ${String(countries.length)} countries, ${String(Buffer.byteLength(out))} bytes`,
)
