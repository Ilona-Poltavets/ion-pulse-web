import { expect, type Page } from '@playwright/test'

/** Demo accounts created by `ion_pulse.seeds` for local development only. */
export const DEMO_PASSWORD = 'IonPulseDemo2026!'

export async function signIn(page: Page, email = 'admin@ion-pulse.local'): Promise<void> {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).last().click()
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
}
