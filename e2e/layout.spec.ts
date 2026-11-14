import { existsSync, readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { mapsSettled, routeTiles } from './tiles.ts'

/**
 * Every story at the narrow widths the library supports: a foldable folded and unfolded, the
 * narrowest and widest phones, and tablets upright and on their side. A story passes when it renders
 * without throwing (no uncaught error, no Storybook error screen), its page never scrolls sideways,
 * so nothing runs past the edge of the screen, and no scroll area inside it scrolls sideways past
 * everything it shows: a swipe there would only bring an empty pane into view.
 */
interface Entry {
    id: string
    type: string
    tags?: string[]
}

const INDEX = 'storybook-static/index.json'

const WIDTHS = { 'foldable folded': 344, 'phone narrow': 360, 'phone wide': 430, 'foldable open': 690, tablet: 768, 'tablet wide': 1024 }

/**
 * The scroll areas in the page that scroll sideways further than anything visible in them reaches,
 * each named with how far it scrolls and how far its content goes. Something laid out but not drawn
 * (hidden, transparent) widens a scroll area without showing there; the area's own end padding and
 * a few pixels of margin are allowed.
 */
function emptyScroll(): string[] {
    const found: string[] = []
    for (const box of document.body.querySelectorAll<HTMLElement>('*')) {
        const style = getComputedStyle(box)
        if (!/auto|scroll/.test(style.overflowX)) continue
        const shown = box.clientWidth
        if (shown === 0 || box.scrollWidth <= shown + 1 || !box.checkVisibility()) continue
        const start = box.getBoundingClientRect().left + box.clientLeft - box.scrollLeft
        let reach = 0
        for (const inner of box.querySelectorAll('*')) {
            const rect = inner.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            if (!inner.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
            reach = Math.max(reach, rect.right - start)
        }
        if (box.scrollWidth > Math.max(reach + parseFloat(style.paddingRight), shown) + 8) {
            const slot = box.dataset.slot === undefined ? '' : `[data-slot=${box.dataset.slot}]`
            const name = `${box.tagName.toLowerCase()}${slot}.${[...box.classList].slice(0, 4).join('.')}`
            found.push(
                `${name} scrolls to ${String(box.scrollWidth)}px, its content reaches ${String(Math.round(reach))}px of ${String(shown)}px shown`,
            )
        }
    }
    return found
}

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
            for (const area of await page.evaluate(emptyScroll)) over.push(`${name} (${String(width)}px): ${area}`)
            const failed = await page.evaluate(() => document.body.classList.contains('sb-show-errordisplay'))
            if (failed) thrown.push(`${name}: Storybook shows its error screen`)
        }
        expect(thrown, thrown.join('\n')).toEqual([])
        expect(over, over.join('\n')).toEqual([])
    })
}
