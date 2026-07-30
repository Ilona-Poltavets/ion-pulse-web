<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
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
const { locale, t } = useI18n()
const candidates = ref<JournalCandidate[]>([])
const error = ref('')
const title = ref(t('journalCandidates.issueTitle'))
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
    error.value = caught instanceof Error ? caught.message : t('journalCandidates.loadError')
  }
})

watch(locale, () => {
  void (async () => {
    try {
      candidates.value = await listJournalCandidates(locale.value as 'ru' | 'en')
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : t('journalCandidates.loadError')
    }
  })()
})

async function publish(): Promise<void> {
  if (!selected.value.length) {
    error.value = t('journalCandidates.selectError')
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
    message.value = t('journalCandidates.published')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('journalCandidates.publishError')
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">WEEKLY JOURNAL</p>
        <h1>{{ t('journalCandidates.title') }}</h1>
      </div>
      <p>{{ t('journalCandidates.description') }}</p>
    </header>
    <form class="dashboard-card" @submit.prevent="publish">
      <label
        >{{ t('journalCandidates.issueLabel') }}<input v-model.trim="title" required minlength="5" maxlength="240"
      /></label>
      <button class="button button-primary">{{ t('journalCandidates.publish') }}</button>
    </form>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="!candidates.length" class="empty-state">{{ t('journalCandidates.empty') }}</p>
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
            {{ candidate.comment_count }} {{ t('journalCandidates.comments') }}</small
          ><RouterLink class="text-link" :to="`/publications/${candidate.id}`"
            >{{ t('journalCandidates.open') }}</RouterLink
          >
        </div>
      </li>
    </ol>
  </section>
</template>
