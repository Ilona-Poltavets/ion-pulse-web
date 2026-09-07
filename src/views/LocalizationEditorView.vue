<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BlockEditor from '@/components/content/BlockEditor.vue'
import { contentText } from '@/components/content/contentFormat'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  getPublicationLocalization,
  updatePublicationLocalization,
  type PublicationLocalization,
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
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
    error.value = caught instanceof Error ? caught.message : t('localizationEditor.loadError')
  }
})

async function save(): Promise<void> {
  if (!localization.value || !locale) return
  if (contentText(localization.value.body).trim().length < 50) {
    error.value = 'Добавьте минимум 50 символов текста материала.'
    return
  }
  try {
    isSaving.value = true
    localization.value = await updatePublicationLocalization(
      publicationId,
      locale,
      localization.value,
    )
    message.value = t('localizationEditor.saved')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('localizationEditor.saveError')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="editor-page">
    <header class="editor-header">
      <div>
        <p class="eyebrow">{{ t('localizationEditor.eyebrow') }}</p>
        <h1>{{ t('localizationEditor.title') }}</h1>
      </div>
      <RouterLink class="button button-secondary" :to="`/publications/${publicationId}`">{{
        t('localizationEditor.backToPublication')
      }}</RouterLink>
    </header>
    <p v-if="error" class="form-error">{{ error }}</p>
    <form v-else-if="localization" class="editor-form localization-form" @submit.prevent="save">
      <p class="muted-copy">
        {{
          t('localizationEditor.metadata', {
            locale: localization.locale.toUpperCase(),
            origin: localization.origin,
            revision: localization.source_revision,
          })
        }}
      </p>
      <label class="editor-title-field"
        >{{ t('localizationEditor.headline')
        }}<input v-model.trim="localization.title" required minlength="5"
      /></label>
      <label
        >{{ t('localizationEditor.summary')
        }}<textarea v-model.trim="localization.summary" required minlength="20" />
      </label>
      <BlockEditor
        v-model="localization.body"
        :disabled="isSaving"
        :label="t('localizationEditor.body')"
      />
      <div class="editor-footer">
        <span>{{ message }}</span
        ><button class="button button-primary" :disabled="isSaving">
          {{ isSaving ? t('localizationEditor.saving') : t('localizationEditor.save') }}
        </button>
      </div>
    </form>
  </section>
</template>
