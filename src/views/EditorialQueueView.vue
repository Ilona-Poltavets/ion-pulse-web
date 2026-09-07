<script setup lang="ts">
import ContentBody from '@/components/content/ContentBody.vue'
import PreviewModal from '@/components/content/PreviewModal.vue'
import { computed, onMounted, ref } from 'vue'
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
const selectedId = ref<string | null>(null)
const isSaving = ref(false)
const selectedPublication = computed(() =>
  publications.value.find((publication) => publication.id === selectedId.value),
)

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
  } finally {
    isSaving.value = false
  }
})

function openReview(id: string): void {
  message.value = ''
  selectedId.value = id
}

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
    isSaving.value = true
    message.value = ''
    await decidePublication(publication.id, {
      decision,
      note,
      scheduled_at: scheduledValue ? new Date(scheduledValue).toISOString() : undefined,
    })
    publications.value = publications.value.filter((item) => item.id !== publication.id)
    selectedId.value = null
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
      <article v-for="publication in publications" :key="publication.id" class="queue-card">
        <button class="queue-summary" type="button" @click="openReview(publication.id)">
          <div>
            <p class="eyebrow">{{ publication.category_slug }} · {{ publication.source_locale }}</p>
            <h2>{{ publication.title }}</h2>
            <p>{{ publication.summary }}</p>
          </div>
          <span aria-hidden="true">→</span>
        </button>
      </article>
    </div>
    <PreviewModal
      :model-value="Boolean(selectedPublication)"
      :title="selectedPublication?.title || t('editorialQueue.title')"
      @update:model-value="
        (value) => {
          if (!value) selectedId = null
        }
      "
    >
      <div v-if="selectedPublication" class="editorial-review-modal">
        <p class="eyebrow">
          {{ selectedPublication.category_slug }} · {{ selectedPublication.source_locale }}
        </p>
        <h1>{{ selectedPublication.title }}</h1>
        <p class="publication-summary">{{ selectedPublication.summary }}</p>
        <ContentBody class="publication-body" :body="selectedPublication.body" />
      </div>
      <template v-if="selectedPublication" #aside>
        <aside class="editorial-review-controls">
          <p v-if="message" class="form-error" role="alert">{{ message }}</p>
          <label
            >{{ t('editorialQueue.note')
            }}<textarea
              v-model="notes[selectedPublication.id]"
              :placeholder="t('editorialQueue.notePlaceholder')"
              required
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(selectedPublication, 'publish')"
            >
              {{ t('editorialQueue.publish') }}
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(selectedPublication, 'request_changes')"
            >
              {{ t('editorialQueue.requestChanges') }}
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(selectedPublication, 'reject')"
            >
              {{ t('editorialQueue.reject') }}
            </button>
          </div>
          <div class="schedule-controls">
            <label
              >{{ t('editorialQueue.scheduleLabel')
              }}<input v-model="scheduledAt[selectedPublication.id]" type="datetime-local"
            /></label>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(selectedPublication, 'schedule')"
            >
              {{ t('editorialQueue.schedule') }}
            </button>
          </div>
        </aside>
      </template>
    </PreviewModal>
  </section>
</template>

<style scoped>
.editorial-review-modal {
  width: min(100%, 900px);
  margin: 0 auto;
}
.editorial-review-modal h1 {
  margin: 12px 0 20px;
  color: var(--text);
  font-size: clamp(30px, 4vw, 54px);
  line-height: 1.08;
}
.editorial-review-controls {
  display: grid;
  gap: 18px;
  padding: 0;
  color: var(--text);
  background: transparent;
}
.editorial-review-controls label,
.schedule-controls {
  display: grid;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}
.editorial-review-controls textarea,
.editorial-review-controls input {
  width: 100%;
  padding: 12px;
  color: var(--text);
  background: var(--background);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}
.editorial-review-controls textarea {
  min-height: 120px;
  resize: vertical;
}
.editorial-review-controls .editor-actions {
  display: grid;
}
</style>
