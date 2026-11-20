/**
 * Records the basemap tiles every screenshot story loads into `e2e/tiles`, by opening each story
 * the way `stories.spec.ts` and `layout.spec.ts` do, with recording on, and then the tiles of the
 * `AREAS`, a step closer in than the stories of that ground open on. Needs Storybook running;
 * `STORYBOOK_URL` says where, `bun run storybook` by default, and `STORIES` limits it to ids
 * starting with that prefix. Run with `bun run test:visual:tiles`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { chromium } from '@playwright/test'

import { mapsSettled, routeTiles, tileFile } from './tiles.ts'

const BASE = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6106'

/**
 * The sizes a story is drawn at, each with the schemes it is drawn in there: the screenshots'
 * desktop and phone, and the widths the layout check measures, which a map lays out differently at
 * and so covers other tiles.
 */
const VIEWS = [
    { width: 1440, height: 900, modes: ['dark', 'light'] },
    { width: 390, height: 844, modes: ['dark', 'light'] },
    ...[344, 360, 390, 430, 690, 768, 1024].map((width) => ({ width, height: 900, modes: ['dark'] })),
]

/** The tile set the street maps draw from, whose recorded document names the address of its tiles. */
const PLANET = 'https://tiles.openfreemap.org/planet'

/**
 * Ground recorded beyond what a story opens on, so a story zoomed in a step still finds it: each a
 * box of west, south, east and north with the zooms its tiles are kept at.
 */
const AREAS: { name: string; bounds: [number, number, number, number]; zooms: number[] }[] = [
    { name: 'the coast round Bergen', bounds: [4.75, 60.22, 5.55, 60.62], zooms: [9] },
]

interface Entry {
    id: string
    type: string
    tags?: string[]
}

/** The column and row of the tile a position lies in at a zoom. */
function tileAt(lng: number, lat: number, zoom: number): [number, number] {
    const across = 2 ** zoom
    const latitude = (lat * Math.PI) / 180
    const x = Math.floor(((lng + 180) / 360) * across)
    const y = Math.floor(((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * across)
    return [x, y]
}

/** Fetches the tiles of every area that are not on disk yet; the names of those that could not be had. */
async function recordAreas(): Promise<string[]> {
    const document = tileFile(PLANET)
    if (!existsSync(document)) return [`${PLANET}: record a story over a street map first, which keeps this document`]
    const template = (JSON.parse(readFileSync(document, 'utf8')) as { tiles: string[] }).tiles[0]
    const missed: string[] = []
    for (const { bounds, zooms } of AREAS) {
        for (const zoom of zooms) {
            const [west, north] = tileAt(bounds[0], bounds[3], zoom)
            const [east, south] = tileAt(bounds[2], bounds[1], zoom)
            for (let x = west; x <= east; x += 1) {
                for (let y = north; y <= south; y += 1) {
                    const address = template.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y))
                    const file = tileFile(address)
                    if (existsSync(file)) continue
                    const response = await fetch(address).catch(() => null)
                    if (response === null || !response.ok) {
                        missed.push(address)
                        continue
                    }
                    mkdirSync(dirname(file), { recursive: true })
                    writeFileSync(file, Buffer.from(await response.arrayBuffer()))
                }
            }
        }
    }
    return missed
}

const index = (await (await fetch(`${BASE}/index.json`)).json()) as { entries: Record<string, Entry> }
const prefix = process.env.STORIES ?? ''
const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && entry.id.startsWith(prefix) && !entry.tags?.includes('no-screenshot'),
)
const failed: string[] = []
const browser = await chromium.launch()
for (const { modes, ...viewport } of VIEWS) {
    const page = await browser.newPage({ viewport })
    await routeTiles(page, true)
    for (const story of stories) {
        for (const mode of modes) {
            try {
                await page.goto(`${BASE}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                await page.locator('#storybook-root > *').first().waitFor()
                await mapsSettled(page)
                await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))))
            } catch (error) {
                failed.push(
                    `${story.id} ${viewport.width} ${mode}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
                )
            }
        }
    }
    await page.close()
}
await browser.close()
failed.push(...(await recordAreas()))
if (failed.length > 0) {
    console.error(`Not recorded, run again:\n${failed.join('\n')}`)
    process.exit(1)
}
