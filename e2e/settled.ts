import type { Page } from '@playwright/test'

import { mapsSettled } from './tiles.ts'

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

/**
 * Waits until the story on the page has drawn and stopped moving: its maps, graphs, charts, videos,
 * fonts, highlighting and scrollers. A screenshot taken then is the same every run, and a layout
 * measured then includes what loads late.
 */
export async function settled(page: Page): Promise<void> {
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
