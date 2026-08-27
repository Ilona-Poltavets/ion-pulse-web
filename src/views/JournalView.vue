<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  listJournalIssuePublications,
  listJournalIssues,
  type DigestItem,
  type JournalIssue,
} from '@/services/api'

const issues = ref<JournalIssue[]>([])
const selected = ref<JournalIssue | null>(null)
const publications = ref<DigestItem[]>([])
const error = ref('')
const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const selectedIssueIndex = computed(() =>
  selected.value ? issues.value.findIndex((issue) => issue.id === selected.value?.id) : -1,
)
const previousIssue = computed(() =>
  selectedIssueIndex.value > 0 ? issues.value[selectedIssueIndex.value - 1] : null,
)
const nextIssue = computed(() =>
  selectedIssueIndex.value >= 0 && selectedIssueIndex.value < issues.value.length - 1
    ? issues.value[selectedIssueIndex.value + 1]
    : null,
)

async function openIssue(issue: JournalIssue, updateRoute = true): Promise<void> {
  selected.value = issue
  if (updateRoute) await router.push(`/journal/${issue.id}`)
  try {
    publications.value = await listJournalIssuePublications(issue.id, locale.value as 'ru' | 'en')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('journal.openError')
  }
}

onMounted(async () => {
  try {
    issues.value = await listJournalIssues()
    const issue = issues.value.find((entry) => entry.id === route.params.id)
    if (issue) await openIssue(issue, false)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('journal.loadError')
  }
})

watch(
  () => route.params.id,
  async (issueId) => {
    const issue = issues.value.find((entry) => entry.id === issueId)
    if (issue && selected.value?.id !== issue.id) await openIssue(issue, false)
  },
)

watch(locale, () => {
  if (selected.value) void openIssue(selected.value, false)
})
</script>
<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE WEEKLY</p>
        <h1>{{ t('journal.title') }}</h1>
      </div>
    </header>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="!issues.length" class="empty-state">{{ t('journal.empty') }}</p>
    <nav v-else class="journal-shelf" :aria-label="t('journal.issues')">
      <button
        v-for="issue in issues"
        :key="issue.id"
        class="journal-spine"
        :class="{ selected: selected?.id === issue.id }"
        :aria-current="selected?.id === issue.id ? 'page' : undefined"
        @click="openIssue(issue)"
      >
        <span>ION PULSE</span>
        <strong>{{ issue.title }}</strong
        ><small
          >{{ new Date(issue.period_start).toLocaleDateString(locale) }} —
          {{ new Date(issue.period_end).toLocaleDateString(locale) }}</small
        >
      </button>
    </nav>
    <section v-if="selected" class="journal-reader" aria-labelledby="journal-title">
      <section class="journal-virtual" :aria-label="t('journal.virtualReader')">
        <div class="journal-book">
          <header class="journal-book__cover">
            <p class="eyebrow">{{ t('journal.weeklyIssue') }}</p>
            <p class="journal-cover-number">{{ String(selectedIssueIndex + 1).padStart(2, '0') }}</p>
            <h2 id="journal-title">{{ selected.title }}</h2>
            <p>
              {{ new Date(selected.period_start).toLocaleDateString(locale) }} —
              {{ new Date(selected.period_end).toLocaleDateString(locale) }}
            </p>
            <span>ION PULSE</span>
          </header>
          <RouterLink v-if="publications[0]" class="journal-book__page journal-book__page--left" :to="`/publications/${publications[0].id}`">
            <small>{{ t('journal.page', { number: '01' }) }}</small>
            <span>{{ publications[0].category_slug }}</span>
            <h3>{{ publications[0].title }}</h3>
            <p>{{ publications[0].summary }}</p>
          </RouterLink>
          <RouterLink v-if="publications[1]" class="journal-book__page journal-book__page--right" :to="`/publications/${publications[1].id}`">
            <small>{{ t('journal.page', { number: '02' }) }}</small>
            <span>{{ publications[1].category_slug }}</span>
            <h3>{{ publications[1].title }}</h3>
            <p>{{ publications[1].summary }}</p>
          </RouterLink>
        </div>
      </section>
      <div class="journal-contents">
        <header>
          <p class="eyebrow">{{ t('journal.weeklyIssue') }}</p>
          <h3>{{ t('journal.contents') }}</h3>
        </header>
        <ol>
          <li v-for="(item, index) in publications" :key="item.id">
            <RouterLink :to="`/publications/${item.id}`">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <small>{{ item.category_slug }}</small
                ><strong>{{ item.title }}</strong>
              </div>
              <i aria-hidden="true">→</i>
            </RouterLink>
          </li>
        </ol>
      </div>
      <div class="journal-pages">
        <RouterLink
          v-for="(item, index) in publications"
          :key="item.id"
          :to="`/publications/${item.id}`"
        >
          <span>{{ t('journal.page', { number: String(index + 1).padStart(2, '0') }) }}</span>
          <small>{{ item.category_slug }}</small>
          <h3>{{ item.title }}</h3>
          <p>{{ item.summary }}</p>
          <strong>{{ t('journal.readStory') }}</strong>
        </RouterLink>
      </div>
      <nav class="journal-pagination" :aria-label="t('journal.issueNavigation')">
        <button
          v-if="previousIssue"
          class="button button-secondary"
          @click="openIssue(previousIssue)"
        >
          {{ t('journal.previous') }}
        </button>
        <span v-else />
        <button v-if="nextIssue" class="button button-secondary" @click="openIssue(nextIssue)">
          {{ t('journal.next') }}
        </button>
      </nav>
    </section>
  </section>
</template>
