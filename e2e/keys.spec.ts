import { expect, test, type Page } from '@playwright/test'

/** The frame's keys driven as a person would, against their stories: the palette's keys, and the palette over the top bar's search. */
const open = async (page: Page, id: string) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:light`)
    await page.locator('#storybook-root > *').first().waitFor()
}

test("a palette row draws its sequence's two presses with the word between", async ({ page }) => {
    await open(page, 'patterns-keys--from-palette')
    await expect(page.getByRole('option', { name: /^Runs/ })).toContainText(/G\s*then\s*R/)
})

test("the search's results stay closed when the palette gives focus back to the search", async ({ page }) => {
    await open(page, 'patterns-shell--search-results-story')
    const search = page.getByRole('combobox', { name: 'Search' })
    const results = page.locator('[data-slot="search-results"]')
    await search.click()
    await expect(results).toBeVisible()
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
    await expect(results).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden()
    await expect(search).toBeFocused()
    await expect(results).toBeHidden()
    await search.click()
    await expect(results).toBeVisible()
})

/** A key pressed as a person would, a frame apart: dnd-kit listens for the keys that carry a held row only from the task after the one that picked it up. */
const press = async (page: Page, key: string) => {
    await page.keyboard.press(key)
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
}

test('a table row is picked up from its grip with Space, carried by the arrows and dropped with Space, or put back with Escape', async ({
    page,
}) => {
    await open(page, 'patterns-drag-and-drop--table-rows')
    const grips = page.locator('[data-row-grip]')
    const order = () => grips.evaluateAll((all) => all.map((grip) => grip.getAttribute('aria-label')))
    await expect(grips).toHaveCount(5)
    const first = (await order())[0] ?? ''
    await page.getByRole('button', { name: first }).focus()
    for (const key of ['Space', 'ArrowDown', 'ArrowDown', 'Space']) await press(page, key)
    await expect.poll(async () => (await order()).indexOf(first)).toBe(2)
    await page.getByRole('button', { name: first }).focus()
    for (const key of ['Enter', 'ArrowUp', 'Escape']) await press(page, key)
    await expect.poll(async () => (await order()).indexOf(first)).toBe(2)
})
