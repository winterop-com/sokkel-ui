import { existsSync, readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

/**
 * Every story at the narrow widths the library supports: a foldable folded and unfolded, the
 * narrowest and widest phones, and tablets upright and on their side. A story passes when it renders
 * without throwing (no uncaught error, no Storybook error screen) and its page never scrolls
 * sideways, so nothing runs past the edge of the screen.
 */
interface Entry {
    id: string
    type: string
    tags?: string[]
}

const INDEX = 'storybook-static/index.json'

const WIDTHS = { 'foldable folded': 344, 'phone narrow': 360, 'phone wide': 430, 'foldable open': 690, tablet: 768, 'tablet wide': 1024 }

const stories: Entry[] = existsSync(INDEX)
    ? Object.values((JSON.parse(readFileSync(INDEX, 'utf8')) as { entries: Record<string, Entry> }).entries).filter(
          (entry) => entry.type === 'story' && !entry.tags?.includes('no-screenshot'),
      )
    : []

for (const story of stories) {
    test(`layout ${story.id}`, async ({ page }) => {
        test.setTimeout(2 * 60_000)
        await routeTiles(page, false)
        const thrown: string[] = []
        page.on('pageerror', (error) => thrown.push(error.message))
        const over: string[] = []
        for (const [name, width] of Object.entries(WIDTHS)) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:dark`)
            await page.locator('#storybook-root > *').first().waitFor()
            await mapsSettled(page)
            await page.evaluate(() => document.fonts.ready)
            await page.waitForTimeout(150)
            const wide = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
            if (wide > width + 1) over.push(`${name} (${String(width)}px): the page is ${String(wide)}px wide`)
            const failed = await page.evaluate(() => document.body.classList.contains('sb-show-errordisplay'))
            if (failed) thrown.push(`${name}: Storybook shows its error screen`)
        }
        expect(thrown, thrown.join('\n')).toEqual([])
        expect(over, over.join('\n')).toEqual([])
    })
}
