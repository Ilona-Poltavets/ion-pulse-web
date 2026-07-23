<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createDraft, type DraftCreatePayload } from '@/services/api'
const router = useRouter()
const draft = ref<DraftCreatePayload>({
  category_slug: 'reviews',
  source_locale: 'ru',
  title: '',
  summary: '',
  body: '',
})
const message = ref('')
async function save(): Promise<void> {
  try {
    await createDraft(draft.value)
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
        >Язык<select v-model="draft.source_locale">
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select></label
      ><label>Заголовок<input v-model.trim="draft.title" required minlength="5" /></label
      ><label>Анонс<textarea v-model.trim="draft.summary" required minlength="20" /></label
      ><label>Текст<textarea v-model.trim="draft.body" required minlength="50" /></label>
      <p v-if="message">{{ message }}</p>
      <button class="button button-primary">Сохранить черновик</button>
    </form>
  </section>
</template>
