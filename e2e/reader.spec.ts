import { expect, test } from '@playwright/test'

test.describe('journal reader', () => {
  test('opens the demo issue and remembers reading preferences', async ({ page }) => {
    await page.goto('/journal')
    const issueLink = page.locator('a[href*="/journal/"][href$="/read"]').first()
    await expect(issueLink).toBeVisible()
    await issueLink.click()

    const reader = page.locator('.curl-reader')
    await expect(reader).toBeVisible()

    await reader.getByRole('radio', { name: 'Ночь' }).click()
    await expect(reader).toHaveAttribute('data-theme', 'night')
    await reader.getByRole('radio', { name: /Размер текста 3/ }).click()

    await page.reload()
    await expect(page.locator('.curl-reader')).toHaveAttribute('data-theme', 'night')
  })

  test('turns pages with the keyboard', async ({ page }) => {
    await page.goto('/journal')
    await page.locator('a[href*="/journal/"][href$="/read"]').first().click()
    const counter = page.locator('.monthly-reader-bar [aria-live]')
    const before = await counter.innerText()
    await page.keyboard.press('ArrowRight')
    await expect.poll(async () => counter.innerText()).not.toBe(before)
  })
})
