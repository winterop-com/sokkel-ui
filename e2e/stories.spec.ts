import { expect, test } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

/**
 * Every story, in dark and in light, at a desktop and a phone width, held to the screenshot it
 * was last approved at. `bunx playwright test --update-snapshots` takes new ones once a change is
 * meant.
 */
interface Entry {
    id: string
    type: string
    tags?: string[]
}

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const MODES = ['dark', 'light'] as const

test('every story looks the way it was approved', async ({ page, request }, info) => {
    test.setTimeout(15 * 60_000)
    await routeTiles(page, info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed')
    const index = (await (await request.get('/index.json')).json()) as { entries: Record<string, Entry> }
    const stories = Object.values(index.entries).filter((entry) => entry.type === 'story' && !entry.tags?.includes('no-screenshot'))
    expect(stories.length).toBeGreaterThan(0)
    for (const story of stories) {
        for (const [name, size] of Object.entries(VIEWPORTS)) {
            await page.setViewportSize(size)
            for (const mode of MODES) {
                await test.step(`${story.id} ${name} ${mode}`, async () => {
                    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                    await page.locator('#storybook-root > *').first().waitFor()
                    await mapsSettled(page)
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
    }
})
