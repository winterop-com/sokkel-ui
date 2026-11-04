import { existsSync, readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

/**
 * Every story, in dark and in light, at a desktop and a phone width, held to the screenshot it
 * was last approved at. One test per story, read from the built `storybook-static/index.json`,
 * so the stories run across workers and `-g <story id>` retakes one alone.
 */
interface Entry {
    id: string
    type: string
    tags?: string[]
}

const INDEX = 'storybook-static/index.json'

/** Resolves once every graph on the page has been placed by elk and fitted. */
async function graphsSettled(page: Page): Promise<void> {
    await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-graph-view]')].every((graph) => graph.hasAttribute('data-graph-settled')),
    )
}

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const MODES = ['dark', 'light'] as const

const stories: Entry[] = existsSync(INDEX)
    ? Object.values((JSON.parse(readFileSync(INDEX, 'utf8')) as { entries: Record<string, Entry> }).entries).filter(
          (entry) => entry.type === 'story' && !entry.tags?.includes('no-screenshot'),
      )
    : []

test('the stories are built', () => {
    expect(stories.length, `no stories in ${INDEX}: run bun run build-storybook first`).toBeGreaterThan(0)
})

for (const story of stories) {
    test(story.id, async ({ page }, info) => {
        test.setTimeout(3 * 60_000)
        await routeTiles(page, info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed')
        for (const [name, size] of Object.entries(VIEWPORTS)) {
            await page.setViewportSize(size)
            for (const mode of MODES) {
                await test.step(`${name} ${mode}`, async () => {
                    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                    await page.locator('#storybook-root > *').first().waitFor()
                    await mapsSettled(page)
                    await graphsSettled(page)
                    await page.evaluate(() => document.fonts.ready)
                    // Highlighting lands after the first paint; a block marked plain is never highlighted.
                    await page
                        .waitForFunction(
                            () =>
                                [
                                    ...document.querySelectorAll('[data-slot=code-block]:not([data-plain]) [data-slot=code-block-code]'),
                                ].every((code) => code.textContent === '' || code.querySelector('span[style]') !== null),
                            null,
                            { timeout: 5000 },
                        )
                        .catch(() => undefined)
                    await page.waitForTimeout(300)
                    await expect(page).toHaveScreenshot(`${story.id}--${name}-${mode}.png`)
                })
            }
        }
    })
}
