import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSystemStatusStore } from '@/stores/systemStatus'

describe('system status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('marks the API as online after a successful health check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'ok',
            service: 'Ion Pulse API',
            version: '0.1.0',
            environment: 'test',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const store = useSystemStatusStore()
    await store.load()

    expect(store.isOnline).toBe(true)
    expect(store.health?.service).toBe('Ion Pulse API')
  })

  it('marks the API as offline when the health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))

    const store = useSystemStatusStore()
    await store.load()

    expect(store.requestStatus).toBe('error')
    expect(store.health).toBeNull()
  })
})
