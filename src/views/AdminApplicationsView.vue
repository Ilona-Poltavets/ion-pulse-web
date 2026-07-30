<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  decideAuthorApplication,
  listAuthorApplications,
  type AuthorApplication,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
const applications = ref<AuthorApplication[]>([])
const notes = ref<Record<string, string>>({})
const message = ref('')
const expandedId = ref<string | null>(null)
const isSaving = ref(false)
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user?.roles.includes('administrator')) {
    await router.replace('/')
    return
  }
  try {
    applications.value = await listAuthorApplications()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить заявки'
  }
})
async function decide(
  application: AuthorApplication,
  status: 'approved' | 'rejected',
): Promise<void> {
  try {
    isSaving.value = true
    await decideAuthorApplication(application.id, {
      status,
      review_note: notes.value[application.id],
    })
    applications.value = applications.value.filter((item) => item.id !== application.id)
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
        <p class="eyebrow">ADMINISTRATION</p>
        <h1>Заявки авторов</h1>
      </div>
      <span>{{ applications.length }} ожидают решения</span>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="!applications.length" class="empty-state">Активных заявок нет.</p>
    <div v-else class="queue-list">
      <article
        v-for="application in applications"
        :key="application.id"
        class="queue-card"
        :class="{ expanded: expandedId === application.id }"
      >
        <button
          class="queue-summary"
          type="button"
          @click="expandedId = expandedId === application.id ? null : application.id"
        >
          <div>
            <p class="eyebrow">AUTHOR APPLICATION</p>
            <h2>Заявка от участника</h2>
            <p>
              {{ application.motivation.slice(0, 160)
              }}{{ application.motivation.length > 160 ? '…' : '' }}
            </p>
          </div>
          <span aria-hidden="true">{{ expandedId === application.id ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedId === application.id" class="queue-detail">
          <p class="publication-body">{{ application.motivation }}</p>
          <a
            v-if="application.portfolio_url"
            class="text-link"
            :href="application.portfolio_url"
            target="_blank"
            rel="noreferrer"
            >Открыть портфолио ↗</a
          >
          <label
            >Комментарий к решению<textarea
              v-model="notes[application.id]"
              placeholder="Поясните решение участнику"
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(application, 'approved')"
            >
              Одобрить
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(application, 'rejected')"
            >
              Отклонить
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
