<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { decidePublication, listEditorialQueue, type Draft } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
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
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить очередь'
  }
})

async function decide(
  publication: Draft,
  decision: 'schedule' | 'publish' | 'reject' | 'request_changes',
): Promise<void> {
  const note = notes.value[publication.id]?.trim()
  if (!note) {
    message.value = 'Добавьте комментарий к редакционному решению'
    return
  }
  const scheduledValue = scheduledAt.value[publication.id]
  if (decision === 'schedule' && !scheduledValue) {
    message.value = 'Укажите дату и время публикации'
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
    message.value = error instanceof Error ? error.message : 'Не удалось сохранить решение'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">EDITORIAL DESK</p>
        <h1>Очередь редактора</h1>
      </div>
      <span>{{ publications.length }} ожидают решения</span>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="!publications.length" class="empty-state">Материалов на проверке нет.</p>
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
            >Комментарий для автора<textarea
              v-model="notes[publication.id]"
              placeholder="Объясните решение"
              required
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(publication, 'publish')"
            >
              Опубликовать
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'request_changes')"
            >
              На доработку
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'reject')"
            >
              Отклонить
            </button>
          </div>
          <div class="schedule-controls">
            <label
              >Запланировать публикацию<input
                v-model="scheduledAt[publication.id]"
                type="datetime-local"
            /></label>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(publication, 'schedule')"
            >
              Запланировать
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
