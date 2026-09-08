import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import PageLayoutEditor from '@/components/journal/PageLayoutEditor.vue'
import type { JournalPage } from '@/services/api'

describe('PageLayoutEditor', () => {
  it('opens with a reactive journal page', async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
    const page = reactive<JournalPage>({
      template: 'feature',
      publication_ids: [],
      heading: 'Заголовок',
      text: 'Текст страницы',
      image_url: '',
      accent: '#c5ef58',
      image_width: 100,
      image_height: 38,
      image_position: 'full',
      text_x: 8,
      text_y: 58,
      text_width: 84,
      text_size: 38,
      continuation: false,
      one_post_per_page: false,
    })

    const wrapper = mount(PageLayoutEditor, {
      props: { modelValue: true, page, materials: [], number: 1 },
      attachTo: document.body,
      global: {
        stubs: {
          MagazinePage: true,
          Teleport: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.page-layout-controls').text()).toContain('БЛОКИ СТРАНИЦЫ')
    expect(wrapper.find('.content-preview-modal').attributes('open')).toBeDefined()
    wrapper.unmount()
  })
})
