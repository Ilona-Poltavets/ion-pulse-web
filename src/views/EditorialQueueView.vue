<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { decidePublication, listEditorialQueue, type Draft } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()
const publications = ref<Draft[]>([])
const notes = ref<Record<string, string>>({})
const scheduledAt = ref<Record<string, string>>({})
const message = ref('')
const expandedId = ref<string | null>(null)
const isSaving = ref(false)

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (
    !auth.user ||
    !auth.user.roles.some((role) => role === 'editor' || role === 'administrator')
  ) {
    await router.replace('/')
    return
  }
  try {
    isSaving.value = true
    publications.value = await listEditorialQueue()
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('editorialQueue.loadError')
  }
})

async function decide(
  publication: Draft,
  decision: 'schedule' | 'publish' | 'reject' | 'request_changes',
): Promise<void> {
  const note = notes.value[publication.id]?.trim()
  if (!note) {
    message.value = t('editorialQueue.noteRequired')
    return
  }
  const scheduledValue = scheduledAt.value[publication.id]
  if (decision === 'schedule' && !scheduledValue) {
    message.value = t('editorialQueue.scheduleRequired')
    return
  }
  try {
    await decidePublication(publication.id, {
      decision,
      note,
      scheduled_at: scheduledValue ? new Date(scheduledValue).toISOString() : undefined,
    })
    publications.value = publications.value.filter((item) => item.id !== publication.id)
    expandedId.value = null
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('editorialQueue.saveError')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">{{ t('editorialQueue.eyebrow') }}</p>
        <h1>{{ t('editorialQueue.title') }}</h1>
      </div>
      <span>{{ t('editorialQueue.pendingCount', { count: publications.length }) }}</span>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="!publications.length" class="empty-state">{{ t('editorialQueue.empty') }}</p>
    <div v-else class="queue-list">
      <article
        v-for="publication in publications"
        :key="publication.id"
        class="queue-card"
        :class="{ expanded: expandedId === publication.id }"
      >
        <button
          class="queue-summary"
          type="button"
          @click="expandedId = expandedId === publication.id ? null : publication.id"
        >
          <div>
            <p class="eyebrow">{{ publication.category_slug }} · {{ publication.source_locale }}</p>
            <h2>{{ publication.title }}</h2>
            <p>{{ publication.summary }}</p>
          </div>
          <span aria-hidden="true">{{ expandedId === publication.id ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedId === publication.id" class="queue-detail">
          <div class="publication-body">{{ publication.body }}</div>
          <label
            >{{ t('editorialQueue.note')
            }}<textarea
              v-model="notes[publication.id]"
              :placeholder="t('editorialQueue.notePlaceholder')"
              required
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(publication, 'publish')"
            >
              {{ t('editorialQueue.publish') }}
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'request_changes')"
            >
              {{ t('editorialQueue.requestChanges') }}
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'reject')"
            >
              {{ t('editorialQueue.reject') }}
            </button>
          </div>
          <div class="schedule-controls">
            <label
              >{{ t('editorialQueue.scheduleLabel')
              }}<input v-model="scheduledAt[publication.id]" type="datetime-local"
            /></label>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'schedule')"
            >
              {{ t('editorialQueue.schedule') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
