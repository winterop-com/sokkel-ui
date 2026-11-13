import { expect, test, type Page } from '@playwright/test'

/**
 * The data-entry parts driven as a person would, against their stories: a bad submit, a server's
 * refusal, a field's stored and new files, and a repeated group's rows.
 */
const open = async (page: Page, id: string) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:light`)
    await page.locator('#storybook-root > *').first().waitFor()
}

test('a bad submit focuses the first field that stops it', async ({ page }) => {
    await open(page, 'patterns-schema-form--empty')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.locator(':focus')).toHaveAttribute('aria-invalid', 'true')
})

test("a submit sends once and puts the server's refusal at its field", async ({ page }) => {
    await open(page, 'patterns-schema-form--sending')
    const create = page.getByRole('button', { name: 'Create' })
    await create.click()
    await create.click()
    const code = page.getByRole('textbox', { name: /^Code/ })
    await expect(code).toHaveAttribute('aria-invalid', 'true')
})

test('Escape in a picker that matches nothing closes its list and leaves the dialog around it open', async ({ page }) => {
    await open(page, 'patterns-async-select--in-dialog')
    const dialog = page.getByRole('dialog', { name: 'New schedule' })
    const search = page.getByRole('combobox', { name: 'Search' })
    await expect(page.getByText('Nothing matches.')).toBeVisible()
    await search.click()
    await page.keyboard.press('Escape')
    await expect(search).toBeHidden()
    // A dialog that is closing is still drawn while it fades; `data-open` goes at once.
    await expect(dialog).toHaveAttribute('data-open', '')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Weekly digest')
})

test("a field's stored files are taken out and new ones go up before saving", async ({ page }) => {
    await open(page, 'primitives-inputs-file-field--editing')
    const summary = page.getByText(/^To save:|^Saving waits/)
    await expect(summary).toHaveText('To save: keep 2, remove 0, add 0.')
    await page.getByRole('button', { name: /remove.*validate-report/i }).click()
    await expect(summary).toHaveText('To save: keep 1, remove 1, add 0.')
    await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'october.csv', mimeType: 'text/csv', buffer: Buffer.from('id,total\n1,2\n') })
    await expect(summary).toHaveText('Saving waits for the uploads.')
    for (let step = 0; step < 4; step += 1) await page.getByRole('button', { name: 'Move uploads on' }).click()
    await expect(summary).toHaveText('To save: keep 1, remove 1, add 1.')
})

test("a repeated group's rows keep their fields as they move and go", async ({ page }) => {
    await open(page, 'patterns-repeated-group--editable')
    const codes = page.getByRole('textbox', { name: 'Code' })
    await expect(codes).toHaveCount(3)
    await page.getByRole('button', { name: 'Move up: Step 3' }).click()
    await expect(codes.nth(1)).toHaveValue('upload')
    await page.getByRole('button', { name: 'Remove Step 1' }).click()
    await expect(codes).toHaveCount(2)
    await expect(codes.nth(0)).toHaveValue('upload')
})
