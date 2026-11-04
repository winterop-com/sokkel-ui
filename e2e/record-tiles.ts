/**
 * Records the basemap tiles every screenshot story loads into `e2e/tiles`, by opening each story
 * the way `stories.spec.ts` does with recording on. Needs Storybook running; `STORYBOOK_URL` says
 * where, `bun run storybook` by default, and `STORIES` limits it to ids starting with that prefix.
 * Run with `bun run test:visual:tiles`.
 */
import { chromium } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

const BASE = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6106'
const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
]
const MODES = ['dark', 'light']

interface Entry {
    id: string
    type: string
    tags?: string[]
}

const index = (await (await fetch(`${BASE}/index.json`)).json()) as { entries: Record<string, Entry> }
const prefix = process.env.STORIES ?? ''
const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && entry.id.startsWith(prefix) && !entry.tags?.includes('no-screenshot'),
)
const failed: string[] = []
const browser = await chromium.launch()
for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport })
    await routeTiles(page, true)
    for (const story of stories) {
        for (const mode of MODES) {
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
if (failed.length > 0) {
    console.error(`Not recorded, run again:\n${failed.join('\n')}`)
    process.exit(1)
}
