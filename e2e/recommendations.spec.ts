import { expect, test } from '@playwright/test'

// Steam itself is never contacted: the API response is stubbed, so the test is stable offline.
const stub = {
  profile: {
    steam_id: '76561198000000000',
    name: 'Test Player',
    avatar_url: '',
    games_owned: 120,
    games_played: 40,
    total_hours: 2500.5,
    recent_hours: 31.5,
    top_played: [
      { app_id: 292030, name: 'The Witcher 3', hours: 210, recent_hours: 12, image_url: '' },
    ],
    top_tags: ['rpg', 'open-world'],
  },
  recommendations: [
    {
      app_id: 1245620,
      title: 'Elden Ring',
      match_percent: 83,
      tags: ['rpg', 'open-world', 'souls-like'],
      matched_tags: ['rpg', 'open-world'],
      because: [{ name: 'The Witcher 3', hours: 210 }],
      year: 2022,
      image_url: '',
      store_url: 'https://store.steampowered.com/app/1245620',
    },
  ],
}

test('turns a profile link into a list of recommended games', async ({ page }) => {
  let requestedProfile = ''
  await page.route('**/api/v1/recommendations/steam', async (route) => {
    requestedProfile = route.request().postDataJSON().profile_url
    await route.fulfill({ json: stub })
  })

  await page.goto('/recommendations')
  await page.getByLabel('Ссылка на профиль Steam').fill('https://steamcommunity.com/id/test_player')
  await page.getByRole('button', { name: 'Подобрать игры' }).click()

  await expect(page.getByRole('heading', { name: 'Test Player' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Elden Ring' })).toBeVisible()
  await expect(page.getByText('83%')).toBeVisible()
  await expect(page.getByText(/Потому что вы играли в The Witcher 3/)).toBeVisible()
  expect(requestedProfile).toBe('https://steamcommunity.com/id/test_player')
})

test('shows the reason when a profile cannot be read', async ({ page }) => {
  await page.route('**/api/v1/recommendations/steam', (route) =>
    route.fulfill({ status: 422, json: { detail: 'Профиль закрыт.' } }),
  )
  await page.goto('/recommendations')
  await page.getByLabel('Ссылка на профиль Steam').fill('someone')
  await page.getByRole('button', { name: 'Подобрать игры' }).click()
  await expect(page.getByRole('alert')).toHaveText('Профиль закрыт.')
})
