import { afterEach, expect, it, vi } from 'vitest'
import { login } from '@/services/api'

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
