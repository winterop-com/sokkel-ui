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

/** Resolves once every video has seeked to the time its `#t=` asks for, then covers its picture. */
async function videosSettled(page: Page): Promise<void> {
    await page.waitForFunction(
        () =>
            [...document.querySelectorAll('video')].every((video) => {
                const at = /#t=([\d.]+)/.exec(video.currentSrc || video.src)
                const target = at === null ? 0 : Number(at[1])
                return video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime - target) < 0.5
            }),
        null,
        { timeout: 20_000 },
    )
    // A decoded frame differs between runs, so each picture is covered by a plain panel that sits
    // under the player's controls; the player around it is what the screenshot holds.
    await page.evaluate(() => {
        for (const video of document.querySelectorAll('video')) {
            if (video.nextElementSibling?.hasAttribute('data-screenshot-cover')) continue
            const cover = document.createElement('div')
            cover.setAttribute('data-screenshot-cover', '')
            cover.style.cssText = 'position:absolute;inset:0;background:#0b0f17;pointer-events:none'
            video.after(cover)
        }
    })
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
        // Dialogs and popups open at once: a popup placed while its dialog was still zooming in sits a fraction of a
        // pixel off, which moves its text's anti-aliasing from run to run.
        await page.addInitScript(() => {
            const still = document.createElement('style')
            still.textContent =
                '*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; }' +
                '[data-open], [data-closed], [data-starting-style], [data-ending-style] { animation-duration: 0s !important; animation-delay: 0s !important; }'
            document.addEventListener('DOMContentLoaded', () => document.head.append(still))
        })
        // A story that throws is broken however its screenshot looks, and is never approved as a baseline.
        const thrown: string[] = []
        page.on('pageerror', (error) => thrown.push(error.message))
        for (const [name, size] of Object.entries(VIEWPORTS)) {
            await page.setViewportSize(size)
            for (const mode of MODES) {
                await test.step(`${name} ${mode}`, async () => {
                    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                    await page.locator('#storybook-root > *').first().waitFor()
                    await mapsSettled(page)
                    await graphsSettled(page)
                    // A page still drawing its parts, such as the theme gallery's frames, says so with data-settling.
                    await page.waitForFunction(() => document.querySelector('[data-settling]') === null, null, { timeout: 90_000 })
                    await videosSettled(page)
                    await page.evaluate(() => document.fonts.ready)
                    // A popup fading in, or anything else still moving, would be caught mid-way. Endless ones such as
                    // spinners, and those driven by scrolling rather than time, are left running.
                    await page.waitForFunction(
                        () =>
                            document
                                .getAnimations()
                                .every(
                                    (animation) =>
                                        animation.playState !== 'running' ||
                                        animation.timeline !== document.timeline ||
                                        animation.effect?.getTiming().iterations === Infinity,
                                ),
                        null,
                        { timeout: 10_000 },
                    )
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
                    expect(thrown, 'errors thrown by the story').toEqual([])
                    await expect(page).toHaveScreenshot(`${story.id}--${name}-${mode}.png`)
                })
            }
        }
    })
}
