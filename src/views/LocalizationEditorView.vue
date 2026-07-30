<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import {
  getPublicationLocalization,
  updatePublicationLocalization,
  type PublicationLocalization,
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const publicationId = typeof route.params.id === 'string' ? route.params.id : ''
const locale = route.params.locale === 'en' ? 'en' : route.params.locale === 'ru' ? 'ru' : null
const localization = ref<PublicationLocalization | null>(null)
const error = ref('')
const message = ref('')
const isSaving = ref(false)

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (
    !locale ||
    !auth.user ||
    !auth.user.roles.some((role) => role === 'editor' || role === 'administrator')
  ) {
    await router.replace('/')
    return
  }
  try {
    localization.value = await getPublicationLocalization(publicationId, locale)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось загрузить перевод'
  }
})

async function save(): Promise<void> {
  if (!localization.value || !locale) return
  try {
    isSaving.value = true
    localization.value = await updatePublicationLocalization(
      publicationId,
      locale,
      localization.value,
    )
    message.value = 'Перевод сохранён как ручная редактура'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось сохранить перевод'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="editor-page">
    <header class="editor-header">
      <div>
        <p class="eyebrow">HUMAN LOCALIZATION</p>
        <h1>Редактура перевода</h1>
      </div>
      <RouterLink class="button button-secondary" :to="`/publications/${publicationId}`"
        >К материалу</RouterLink
      >
    </header>
    <p v-if="error" class="form-error">{{ error }}</p>
    <form v-else-if="localization" class="editor-form localization-form" @submit.prevent="save">
      <p class="muted-copy">
        {{ localization.locale.toUpperCase() }} · источник: {{ localization.origin }} · ревизия
        оригинала {{ localization.source_revision }}
      </p>
      <label class="editor-title-field"
        >Заголовок<input v-model.trim="localization.title" required minlength="5"
      /></label>
      <label>Анонс<textarea v-model.trim="localization.summary" required minlength="20" /></label>
      <label class="editor-body-field"
        >Текст<textarea v-model.trim="localization.body" required minlength="50" />
      </label>
      <div class="editor-footer">
        <span>{{ message }}</span
        ><button class="button button-primary" :disabled="isSaving">
          {{ isSaving ? 'Сохраняем…' : 'Сохранить перевод' }}
        </button>
      </div>
    </form>
  </section>
</template>
