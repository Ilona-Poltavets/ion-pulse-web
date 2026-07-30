<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import {
  createJournalIssue,
  listJournalCandidates,
  publishJournalIssue,
  replaceJournalIssuePublications,
  type JournalCandidate,
} from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const { locale } = useI18n()
const candidates = ref<JournalCandidate[]>([])
const error = ref('')
const title = ref('Выпуск недели')
const selected = ref<string[]>([])
const message = ref('')

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user?.roles.some((role) => ['editor', 'moderator', 'administrator'].includes(role))) {
    await router.replace('/')
    return
  }
  try {
    candidates.value = await listJournalCandidates(locale.value as 'ru' | 'en')
    selected.value = candidates.value.map((candidate) => candidate.id)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось загрузить кандидатов'
  }
})

async function publish(): Promise<void> {
  if (!selected.value.length) {
    error.value = 'Выберите хотя бы один материал'
    return
  }
  try {
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    const issue = await createJournalIssue({
      title: title.value,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    })
    await replaceJournalIssuePublications(issue.id, selected.value)
    await publishJournalIssue(issue.id)
    message.value = 'Выпуск опубликован'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось опубликовать выпуск'
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">WEEKLY JOURNAL</p>
        <h1>Кандидаты выпуска</h1>
      </div>
      <p>Последние 7 дней UTC. Счёт: средняя оценка + 0,1 за каждый видимый комментарий.</p>
    </header>
    <form class="dashboard-card" @submit.prevent="publish">
      <label
        >Название выпуска<input v-model.trim="title" required minlength="5" maxlength="240"
      /></label>
      <button class="button button-primary">Опубликовать выпуск</button>
    </form>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="!candidates.length" class="empty-state">За эту неделю кандидатов пока нет.</p>
    <ol v-else class="queue-list journal-candidates">
      <li v-for="candidate in candidates" :key="candidate.id" class="dashboard-card">
        <label class="checkbox-label"
          ><input v-model="selected" type="checkbox" :value="candidate.id"
        /></label>
        <div>
          <p class="eyebrow">{{ candidate.category_slug }}</p>
          <h2>{{ candidate.title }}</h2>
          <p>{{ candidate.summary }}</p>
        </div>
        <div class="candidate-score">
          <strong>{{ candidate.score.toFixed(1) }}</strong
          ><small
            >★ {{ candidate.average_rating.toFixed(1) }} ·
            {{ candidate.comment_count }} комм.</small
          ><RouterLink class="text-link" :to="`/publications/${candidate.id}`"
            >Открыть →</RouterLink
          >
        </div>
      </li>
    </ol>
  </section>
</template>
