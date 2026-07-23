<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createDraft, listMyDrafts, updateDraft, type DraftCreatePayload } from '@/services/api'
const router = useRouter()
const route = useRoute()
const draftId = typeof route.params.id === 'string' ? route.params.id : null
const draft = ref<DraftCreatePayload>({
  category_slug: 'reviews',
  source_locale: 'ru',
  title: '',
  summary: '',
  body: '',
})
const message = ref('')
onMounted(async () => {
  if (!draftId) return
  try {
    const existing = (await listMyDrafts()).find((item) => item.id === draftId)
    if (!existing) {
      message.value = 'Черновик не найден или недоступен для редактирования'
      return
    }
    draft.value = {
      category_slug: existing.category_slug,
      source_locale: existing.source_locale,
      title: existing.title,
      summary: existing.summary,
      body: existing.body,
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить черновик'
  }
})
async function save(): Promise<void> {
  try {
    if (draftId) {
      await updateDraft(draftId, {
        category_slug: draft.value.category_slug,
        title: draft.value.title,
        summary: draft.value.summary,
        body: draft.value.body,
      })
    } else {
      await createDraft(draft.value)
    }
    await router.push('/profile')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Ошибка'
  }
}
</script>
<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="save">
      <p class="eyebrow">NEW PUBLICATION</p>
      <h1>Новый материал</h1>
      <label
        >Категория<select v-model="draft.category_slug">
          <option value="reviews">Ревью игр</option>
          <option value="news">Новости</option>
          <option value="guides">Гайды</option>
          <option value="esports">Киберспорт</option>
        </select></label
      ><label
        >Язык<select v-model="draft.source_locale" :disabled="Boolean(draftId)">
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select></label
      ><label>Заголовок<input v-model.trim="draft.title" required minlength="5" /></label
      ><label>Анонс<textarea v-model.trim="draft.summary" required minlength="20" /></label
      ><label>Текст<textarea v-model.trim="draft.body" required minlength="50" /></label>
      <p v-if="message">{{ message }}</p>
      <button class="button button-primary">
        {{ draftId ? 'Сохранить изменения' : 'Сохранить черновик' }}
      </button>
    </form>
  </section>
</template>
