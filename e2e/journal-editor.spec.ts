import { expect, test } from '@playwright/test'
test.describe('journal editor', () => {
  test.beforeEach(async ({ page }) => {
    // Start without a locally backed-up draft so the issue is assembled automatically.
    await page.addInitScript(() => {
      for (const key of Object.keys(localStorage))
        if (key.startsWith('ion-pulse:journal-draft:')) localStorage.removeItem(key)
    })
  })

  test('assembles an issue automatically and lets the editor undo changes', async ({ page }) => {
    await page.goto('/journal/candidates')
    const pagesTitle = page.getByRole('heading', { name: /Страницы · \d+/ })
    await expect(pagesTitle).toBeVisible()

    const count = async () => Number((await pagesTitle.innerText()).match(/\d+/)![0])
    await expect.poll(count).toBeGreaterThan(1)
    const initial = await count()
    expect(initial).toBeGreaterThanOrEqual(20)
    expect(initial).toBeLessThanOrEqual(34)

    await page.getByRole('button', { name: 'Удалить страницу' }).click()
    await expect.poll(count).toBe(initial - 1)

    await page.getByRole('button', { name: /Отменить/ }).click()
    await expect.poll(count).toBe(initial)
  })

  test('shows a thumbnail strip with one entry per page', async ({ page }) => {
    await page.goto('/journal/candidates')
    const thumbnails = page.locator('.page-thumb')
    await expect(thumbnails.first()).toBeVisible()
    const heading = await page.getByRole('heading', { name: /Страницы · \d+/ }).innerText()
    await expect(thumbnails).toHaveCount(Number(heading.match(/\d+/)![0]))
  })

  test('rebuilds the issue with the chosen page count', async ({ page }) => {
    await page.goto('/journal/candidates')
    await page.getByText('Настройки автосборки').click()
    await page.getByLabel('Страниц', { exact: true }).fill('16')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Автосборка \(~16 стр\.\)/ }).click()
    const heading = await page.getByRole('heading', { name: /Страницы · \d+/ }).innerText()
    expect(Number(heading.match(/\d+/)![0])).toBeLessThanOrEqual(16)
  })
})
