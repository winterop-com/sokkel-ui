import { expect, test } from '@playwright/test'

/**
 * Every story, in dark and in light, at a desktop and a phone width, held to the screenshot it
 * was last approved at. `bunx playwright test --update-snapshots` takes new ones once a change is
 * meant.
 */
interface Entry {
    id: string
    type: string
}

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const MODES = ['dark', 'light'] as const

test('every story looks the way it was approved', async ({ page, request }) => {
    test.setTimeout(15 * 60_000)
    const index = (await (await request.get('/index.json')).json()) as { entries: Record<string, Entry> }
    const stories = Object.values(index.entries).filter((entry) => entry.type === 'story')
    expect(stories.length).toBeGreaterThan(0)
    for (const story of stories) {
        for (const [name, size] of Object.entries(VIEWPORTS)) {
            await page.setViewportSize(size)
            for (const mode of MODES) {
                await test.step(`${story.id} ${name} ${mode}`, async () => {
                    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                    await page.locator('#storybook-root > *').first().waitFor()
                    await page.evaluate(() => document.fonts.ready)
                    await page.waitForTimeout(300)
                    await expect(page).toHaveScreenshot(`${story.id}--${name}-${mode}.png`)
                })
            }
        }
    }
})
