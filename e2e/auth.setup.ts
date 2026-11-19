import { existsSync, statSync } from 'node:fs'
import { test as setup } from '@playwright/test'
import { signIn } from './helpers'

// The API rate-limits sign-ins (10 per 15 minutes), so each demo account signs in once and
// the saved session is reused for a few minutes across runs.
const FRESH_MS = 10 * 60 * 1000

for (const [name, email] of [
  ['admin', 'admin@ion-pulse.local'],
  ['player', 'player@ion-pulse.local'],
] as const) {
  setup(`sign in as ${name}`, async ({ page }) => {
    const path = `e2e/.auth/${name}.json`
    if (existsSync(path) && Date.now() - statSync(path).mtimeMs < FRESH_MS) return
    await signIn(page, email)
    await page.context().storageState({ path })
  })
}
