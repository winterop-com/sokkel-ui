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
