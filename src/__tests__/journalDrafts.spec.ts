import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

const { listJournalIssues, listJournalDrafts } = vi.hoisted(() => ({
  listJournalIssues: vi.fn<() => Promise<unknown[]>>(),
  listJournalDrafts: vi.fn<() => Promise<unknown[]>>(),
}))

vi.mock('@/services/api', () => ({
  listJournalIssues,
  listJournalDrafts,
  getJournalMaterials: vi.fn<() => Promise<unknown[]>>(),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { roles: ['editor'] }, restore: vi.fn<() => Promise<void>>() }),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'journal', params: {} }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ locale: { value: 'ru' } }) }))

import JournalView from '@/views/JournalView.vue'

it('shows saved journal drafts to editors when no issue is published', async () => {
  listJournalIssues.mockResolvedValue([])
  listJournalDrafts.mockResolvedValue([
    {
      id: 'draft-1',
      title: 'ION PULSE — 2026-09',
      period_start: '2026-09-01T00:00:00Z',
      period_end: '2026-10-01T00:00:00Z',
      status: 'draft',
      published_at: null,
      pages: [{ template: 'cover' }, { template: 'feature' }],
    },
  ])

  const wrapper = mount(JournalView, {
    global: {
      stubs: {
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
        MagazineReader: true,
      },
    },
  })
  await flushPromises()

  expect(wrapper.get('.journal-draft-card').text()).toContain('ION PULSE — 2026-09')
  expect(wrapper.get('.journal-draft-card').text()).toContain('2 стр.')
})
