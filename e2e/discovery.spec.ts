import { expect, test } from '@playwright/test'
test.describe('search, games and bookmarks', () => {
  test('filters materials by minimum score', async ({ page }) => {
    await page.goto('/search?min_score=5')
    const cards = page.locator('.discover-card')
    await expect(cards.first()).toBeVisible()
    for (const score of await page.locator('.discover-score').allInnerTexts())
      expect(Number(score.replace('★', '').trim())).toBeGreaterThanOrEqual(5)
  })

  test('finds a game by text and opens its page with a combined score', async ({ page }) => {
    await page.goto('/search')
    await page.getByLabel('Запрос').fill('Hades')
    await expect(page.locator('.discover-card').first()).toContainText('Hades')
    await page
      .locator('.discover-card')
      .first()
      .getByRole('link', { name: 'Hades' })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hades' })).toBeVisible()
    await expect(page.getByText('Сводная оценка')).toBeVisible()
  })

  test.describe('as a signed-in reader', () => {
    test.use({ storageState: 'e2e/.auth/player.json' })

    test('saves a material to bookmarks and removes it again', async ({ page }) => {
      await page.goto('/search?q=Celeste')
      await page.locator('.discover-card').first().getByRole('button', { name: /Позже/ }).click()
      await page.goto('/bookmarks')
      await expect(page.locator('.discover-card')).toHaveCount(1)
      await page
        .locator('.discover-card')
        .first()
        .getByRole('button', { name: /В закладках/ })
        .click()
      await expect(page.getByText('Закладок пока нет')).toBeVisible()
    })
  })
})
