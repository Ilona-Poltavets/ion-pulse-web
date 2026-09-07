import { afterEach, expect, it, vi } from 'vitest'
import { login, saveJournalIssue } from '@/services/api'

afterEach(() => vi.unstubAllGlobals())
it('shows the validation message instead of object coercion', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid email address', input: 'private value' },
          ],
        }),
        { status: 422 },
      ),
    ),
  )
  await expect(login({ email: 'invalid', password: 'secret' })).rejects.toThrow(
    'email: Invalid email address',
  )
})
it('preserves string API errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid credentials' }), { status: 401 }),
      ),
  )
  await expect(login({ email: 'a@example.com', password: 'secret' })).rejects.toThrow(
    'Invalid credentials',
  )
})

it('sends a journal draft as JSON', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: 'issue-1',
        title: 'ION PULSE — 2026-09',
        period_start: '2026-09-01T00:00:00Z',
        period_end: '2026-10-01T00:00:00Z',
        pages: [],
        status: 'draft',
        published_at: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
  vi.stubGlobal('fetch', fetchMock)

  await saveJournalIssue('issue-1', {
    title: 'ION PULSE — 2026-09',
    period_start: '2026-09-01T00:00:00Z',
    period_end: '2026-10-01T00:00:00Z',
    pages: [],
  })

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/journal/issues/issue-1'),
    expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }),
  )
})
