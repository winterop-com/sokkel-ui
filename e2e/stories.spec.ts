import { existsSync, readFileSync } from 'node:fs'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

/**
 * Every story held to the screenshot it was last approved at: at a desktop width in dark and in
 * light, and at a phone width in dark. A phone shows the layout, which the scheme does not change, so
 * one scheme there is enough; layout.spec.ts checks every narrow width besides. One test per story, read from the built `storybook-static/index.json`,
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

/** Each width with the schemes it is held in. */
const VIEWPORTS = {
    desktop: { size: { width: 1440, height: 900 }, modes: ['dark', 'light'] },
    phone: { size: { width: 390, height: 844 }, modes: ['dark'] },
} as const

const stories: Entry[] = existsSync(INDEX)
    ? Object.values((JSON.parse(readFileSync(INDEX, 'utf8')) as { entries: Record<string, Entry> }).entries).filter(
          (entry) => entry.type === 'story' && !entry.tags?.includes('no-screenshot'),
      )
    : []

test('the stories are built', () => {
    expect(stories.length, `no stories in ${INDEX}: run bun run build-storybook first`).toBeGreaterThan(0)
})

/** Waits until the story on the page has drawn and stopped moving, so its screenshot is the same every run. */
async function settled(page: Page): Promise<void> {
    await page.locator('#storybook-root > *').first().waitFor()
    await mapsSettled(page)
    await graphsSettled(page)
    // A chart type outside the engine's base set loads before its chart draws.
    await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-echart]')].every((chart) => chart.hasAttribute('data-echart-settled')),
    )
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
                [...document.querySelectorAll('[data-slot=code-block]:not([data-plain]) [data-slot=code-block-code]')].every(
                    (code) => code.textContent === '' || code.querySelector('span[style]') !== null,
                ),
            null,
            { timeout: 5000 },
        )
        .catch(() => undefined)
    // A scroller that keeps to its end, such as a conversation's, scrolls there in steps after its
    // content settles; wait until none is moving and every scroll position holds for a few frames.
    await page
        .waitForFunction(() => document.querySelector('[data-autoscrolling], [data-pending-scroll]') === null, null, { timeout: 10_000 })
        .catch(() => undefined)
    // A scroller resting at its end may have got there in steps that round differently from run to
    // run, when its content is a fraction of a pixel tall. Scroll it to its top and straight back to
    // its end, so every run reaches the end the same way.
    await page.evaluate(() => {
        for (const element of document.querySelectorAll('*')) {
            const end = element.scrollHeight - element.clientHeight
            if (end <= 0 || element.scrollTop <= 0 || end - element.scrollTop > 2) continue
            element.scrollTop = 0
            element.scrollTop = element.scrollHeight
        }
    })
    await page.evaluate(async () => {
        const positions = () =>
            [...document.querySelectorAll('*')]
                .filter((element) => element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
                .map((element) => `${element.scrollTop},${element.scrollLeft}`)
                .join(' ')
        let last = positions()
        let still = 0
        for (let frame = 0; frame < 120 && still < 5; frame++) {
            await new Promise((resolve) => requestAnimationFrame(resolve))
            const now = positions()
            still = now === last ? still + 1 : 0
            last = now
        }
    })
    await page.waitForTimeout(300)
}

/** Turns transitions and opening animations off, so a popup is photographed where it lands. */
async function still(page: Page): Promise<void> {
    // Dialogs and popups open at once: a popup placed while its dialog was still zooming in sits a fraction of a
    // pixel off, which moves its text's anti-aliasing from run to run.
    await page.addInitScript(() => {
        const still = document.createElement('style')
        still.textContent =
            '*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; }' +
            '[data-open], [data-closed], [data-starting-style], [data-ending-style] { animation-duration: 0s !important; animation-delay: 0s !important; }'
        document.addEventListener('DOMContentLoaded', () => document.head.append(still))
    })
}

for (const story of stories) {
    test(story.id, async ({ page }, info) => {
        // A story tagged slow, such as the theme gallery, draws many frames three times over.
        test.setTimeout(story.tags?.includes('slow') ? 8 * 60_000 : 3 * 60_000)
        await routeTiles(page, info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed')
        await still(page)
        // A story that throws is broken however its screenshot looks, and is never approved as a baseline.
        const thrown: string[] = []
        page.on('pageerror', (error) => thrown.push(error.message))
        for (const [name, { size, modes }] of Object.entries(VIEWPORTS)) {
            await page.setViewportSize(size)
            for (const mode of modes) {
                await test.step(`${name} ${mode}`, async () => {
                    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${mode}`)
                    await settled(page)
                    expect(thrown, 'errors thrown by the story').toEqual([])
                    await expect(page).toHaveScreenshot(`${story.id}--${name}-${mode}.png`)
                })
            }
        }
    })
}

/** The library's themes, read from the tokens, so a new theme is photographed without being listed here. */
const THEMES = Object.keys((JSON.parse(readFileSync('tokens/tokens.json', 'utf8')) as { themes: Record<string, unknown> }).themes)

// Every theme's kitchen sink in dark and in light. The story suite above draws only the default theme, and its
// comparison lets a small color shift through; here a theme whose colors move fails.
for (const theme of THEMES) {
    test(`theme ${theme}`, async ({ page }) => {
        await still(page)
        await page.setViewportSize(VIEWPORTS.desktop.size)
        for (const mode of VIEWPORTS.desktop.modes) {
            await test.step(mode, async () => {
                await page.goto(`/iframe.html?id=themes-kitchen-sink--kitchen-sink&viewMode=story&globals=theme:${mode};look:${theme}`)
                await settled(page)
                await expect(page).toHaveScreenshot(`theme-${theme}--${mode}.png`, { threshold: 0.02 })
            })
        }
    })
}

/**
 * How far a hovered part's fill stands from the surface behind it: the largest difference in any
 * channel, 0 to 255, with a see-through fill laid over that surface first.
 */
async function hoverStandsOut(page: Page, part: Locator): Promise<number> {
    await part.hover()
    await page.waitForTimeout(150)
    return part.evaluate((element) => {
        const paint = (css: string) => {
            const canvas = document.createElement('canvas')
            canvas.width = 1
            canvas.height = 1
            const context = canvas.getContext('2d')
            if (context === null) return [0, 0, 0, 0]
            context.fillStyle = css
            context.fillRect(0, 0, 1, 1)
            return [...context.getImageData(0, 0, 1, 1).data]
        }
        let behind = element.parentElement
        while (behind !== null && paint(getComputedStyle(behind).backgroundColor)[3] === 0) behind = behind.parentElement
        const [r, g, b] = paint(behind === null ? 'white' : getComputedStyle(behind).backgroundColor)
        const [hr, hg, hb, ha] = paint(getComputedStyle(element).backgroundColor)
        const alpha = ha / 255
        const over = [hr * alpha + r * (1 - alpha), hg * alpha + g * (1 - alpha), hb * alpha + b * (1 - alpha)]
        return Math.max(Math.abs(over[0] - r), Math.abs(over[1] - g), Math.abs(over[2] - b))
    })
}

/** The least a hover must stand out from its surface, so the pointer always shows where it is. */
const HOVER_SHOWS = 8

// Every theme, dark and light: a hovered menu item, an entry in the rail, a quiet button on a card and an
// item in the account menu each stand out from the surface behind them. A hover painted in the surface's
// own color passes every screenshot, as no screenshot hovers, so this measures it instead.
for (const theme of THEMES) {
    test(`hover shows in ${theme}`, async ({ page }) => {
        await still(page)
        await page.setViewportSize(VIEWPORTS.desktop.size)
        for (const mode of VIEWPORTS.desktop.modes) {
            await test.step(mode, async () => {
                const globals = `theme:${mode};look:${theme}`
                await page.goto(`/iframe.html?id=primitives-menus-dropdownmenu--items&viewMode=story&globals=${globals}`)
                await settled(page)
                expect(await hoverStandsOut(page, page.getByRole('menuitem').first()), 'a menu item').toBeGreaterThanOrEqual(HOVER_SHOWS)
                await page.goto(`/iframe.html?id=themes-kitchen-sink--kitchen-sink&viewMode=story&globals=${globals}`)
                await settled(page)
                expect(
                    await hoverStandsOut(page, page.getByRole('navigation').getByRole('link').nth(1)),
                    'a rail entry',
                ).toBeGreaterThanOrEqual(HOVER_SHOWS)
                expect(
                    await hoverStandsOut(page, page.getByRole('button', { name: 'Refresh' })),
                    'a quiet button on a card',
                ).toBeGreaterThanOrEqual(HOVER_SHOWS)
                await page.locator('[data-slot=account-menu-trigger], button:has-text("ada")').first().click()
                expect(await hoverStandsOut(page, page.getByRole('menuitem').first()), 'an account menu item').toBeGreaterThanOrEqual(
                    HOVER_SHOWS,
                )
            })
        }
    })
}
