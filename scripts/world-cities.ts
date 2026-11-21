/**
 * Write the world's cities the globe story draws, src/stories/map/fixtures/cities.json, from
 * Natural Earth's 1:50m populated places at the pinned version: the places it ranks for a map of
 * the whole world (`scalerank` up to 3), some five hundred, spread over every continent. Each keeps
 * its name, its country and the people living there, with an id made from its name and its
 * country's code; positions are rounded to two decimals, a kilometer or so.
 *
 *   bun scripts/world-cities.ts                 fetch the pinned file and write the data
 *   bun scripts/world-cities.ts <file.geojson>  write it from a copy already on disk
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Feature, FeatureCollection, Point } from 'geojson'

const VERSION = 'v5.1.2'
const SOURCE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${VERSION}/geojson/ne_50m_populated_places_simple.geojson`
const OUT = join(import.meta.dirname, '..', 'src', 'stories', 'map', 'fixtures', 'cities.json')

/** The coarsest rank kept: Natural Earth's own choice of places for a map of the world. */
const RANK = 3

interface RawProperties {
    name: string
    nameascii: string | null
    adm0name: string
    adm0_a3: string
    scalerank: number
    pop_max: number
}

const round = (value: number) => Math.round(value * 100) / 100

const slug = (text: string) =>
    text
        .normalize('NFKD')
        .replace(/[^\x20-\x7e]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

function city(raw: Feature<Point, RawProperties>): Feature<Point, { name: string; country: string; population: number }> {
    const { name, nameascii, adm0name, adm0_a3, pop_max } = raw.properties
    const [lng, lat] = raw.geometry.coordinates
    return {
        type: 'Feature',
        id: `${slug(nameascii ?? name)}-${adm0_a3.toLowerCase()}`,
        properties: { name, country: adm0name, population: pop_max },
        geometry: { type: 'Point', coordinates: [round(lng), round(lat)] },
    }
}

const given = process.argv[2]
const text = given === undefined ? await (await fetch(SOURCE)).text() : readFileSync(given, 'utf8')
const raw = JSON.parse(text) as FeatureCollection<Point, RawProperties>
const cities = raw.features
    .filter((one) => one.properties.scalerank <= RANK)
    .map(city)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
const ids = new Set(cities.map((one) => one.id))
if (ids.size !== cities.length) throw new Error('Two cities share an id.')

// One city a line, so a new version shows as a diff of the cities it changes.
const out = `{"type":"FeatureCollection","features":[\n${cities.map((one) => JSON.stringify(one)).join(',\n')}\n]}\n`
writeFileSync(OUT, out)
console.log(
    `wrote src/stories/map/fixtures/cities.json from Natural Earth ${VERSION}: ${String(cities.length)} cities, ${String(Buffer.byteLength(out))} bytes`,
)
