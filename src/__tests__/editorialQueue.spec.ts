import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const { listEditorialQueue, decidePublication } = vi.hoisted(() => ({
  listEditorialQueue: vi.fn<() => Promise<unknown[]>>(),
  decidePublication: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/services/api', () => ({
  listEditorialQueue,
  decidePublication,
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { roles: ['editor'] }, restore: vi.fn<() => Promise<void>>() }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn<() => Promise<void>>() }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import EditorialQueueView from '@/views/EditorialQueueView.vue'

beforeEach(() => {
  listEditorialQueue.mockResolvedValue([
    {
      id: 'publication-1',
      category_slug: 'reviews',
      source_locale: 'ru',
      title: 'Материал на проверке',
      summary: 'Достаточно длинный анонс материала',
      body: '<p>Текст материала для редакционной проверки.</p>',
    },
  ])
})

it('enables editorial decisions after the queue has loaded', async () => {
  const wrapper = mount(EditorialQueueView, {
    global: {
      stubs: {
        PreviewModal: { template: '<div><slot /></div>' },
        ContentBody: true,
      },
    },
  })
  await flushPromises()
  await wrapper.get('.queue-summary').trigger('click')

  expect(wrapper.get('.editorial-review-controls .button-primary').attributes('disabled')).toBe(
    undefined,
  )
})
