<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useSystemStatusStore } from '@/stores/systemStatus'
import { useAuthStore } from '@/stores/auth'
import {
  listCategories,
  listPublishedPublications,
  type Category,
  type FeedPublication,
} from '@/services/api'

const { t, locale } = useI18n()
const systemStatus = useSystemStatusStore()
const auth = useAuthStore()
const { requestStatus, health } = storeToRefs(systemStatus)
const requestController = new AbortController()
const publications = ref<FeedPublication[]>([])
const feedError = ref('')
const isFeedLoading = ref(true)
const isLoadingMore = ref(false)
const hasMore = ref(false)
const selectedCategory = ref('all')
const categories = ref<Category[]>([])
const searchQuery = ref('')
const pageSize = 12

const statusLabel = computed(() => {
  if (requestStatus.value === 'success') return t('status.online')
  if (requestStatus.value === 'error') return t('status.offline')
  return t('status.loading')
})

onMounted(() => {
  void systemStatus.load(requestController.signal)
  void loadFeed()
  void loadCategories()
})

onBeforeUnmount(() => {
  requestController.abort()
})

watch(locale, () => {
  void loadFeed(true)
  void loadCategories()
})

async function loadFeed(reset = true): Promise<void> {
  try {
    if (reset) isFeedLoading.value = true
    else isLoadingMore.value = true
    feedError.value = ''
    const offset = reset ? 0 : publications.value.length
    const next = await listPublishedPublications(locale.value as 'ru' | 'en', {
      category_slug: selectedCategory.value === 'all' ? undefined : selectedCategory.value,
      search: searchQuery.value.trim() || undefined,
      limit: pageSize,
      offset,
    })
    publications.value = reset ? next : [...publications.value, ...next]
    hasMore.value = next.length === pageSize
  } catch (error) {
    feedError.value = error instanceof Error ? error.message : t('publications.feedError')
  } finally {
    isFeedLoading.value = false
    isLoadingMore.value = false
  }
}

function selectCategory(slug: string): void {
  selectedCategory.value = slug
  void loadFeed(true)
}

function submitSearch(): void {
  void loadFeed(true)
}

async function loadCategories(): Promise<void> {
  try {
    categories.value = await listCategories(locale.value as 'ru' | 'en')
  } catch {
    categories.value = []
  }
}
</script>

<template>
  <section class="feed-page" aria-labelledby="feed-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('publications.eyebrow') }}</p>
        <h2 id="feed-title">{{ t('publications.title') }}</h2>
      </div>
      <div class="feed-heading-actions">
        <p>{{ t('publications.description') }}</p>
        <RouterLink v-if="auth.isAuthenticated" class="button button-primary" to="/write">
          {{ t('publications.create') }}
        </RouterLink>
      </div>
    </div>

    <div class="category-filters" :aria-label="t('publications.filterLabel')">
      <button
        class="filter-chip"
        :class="{ active: selectedCategory === 'all' }"
        type="button"
        @click="selectCategory('all')"
      >
        {{ t('publications.all') }}
      </button>
      <button
        v-for="category in categories"
        :key="category.slug"
        class="filter-chip"
        :class="{ active: selectedCategory === category.slug }"
        type="button"
        @click="selectCategory(category.slug)"
      >
        {{ category.name }}
      </button>
    </div>
    <form class="feed-search" role="search" @submit.prevent="submitSearch">
      <label for="feed-search">{{ t('publications.searchLabel') }}</label>
      <input id="feed-search" v-model.trim="searchQuery" maxlength="120" />
      <button class="button button-secondary">{{ t('publications.searchAction') }}</button>
    </form>

    <p v-if="feedError" class="form-error">{{ feedError }}</p>
    <p v-else-if="isFeedLoading" class="empty-state">{{ t('publications.loadingFeed') }}</p>
    <p v-else-if="!publications.length" class="empty-state">{{ t('publications.empty') }}</p>
    <div v-else class="publication-grid">
      <RouterLink
        v-for="publication in publications"
        :key="publication.id"
        class="publication-card"
        :to="`/publications/${publication.id}`"
      >
        <div class="publication-card-meta">
          <span>{{ publication.category_slug }}</span>
          <span>{{ new Date(publication.published_at).toLocaleDateString(locale) }}</span>
        </div>
        <h3>{{ publication.title }}</h3>
        <p>{{ publication.summary }}</p>
        <footer>
          <span>{{ publication.author_name }}</span>
          <span v-if="!publication.translation_available">{{
            publication.locale.toUpperCase()
          }}</span>
        </footer>
      </RouterLink>
    </div>
    <button
      v-if="hasMore && !isFeedLoading"
      class="button button-secondary feed-more"
      :disabled="isLoadingMore"
      @click="loadFeed(false)"
    >
      {{ isLoadingMore ? t('publications.loadingMore') : t('publications.loadMore') }}
    </button>
  </section>

  <section class="welcome-section">
    <div>
      <p class="eyebrow">{{ t('hero.eyebrow') }}</p>
      <h1>
        {{ t('hero.titleFirst') }} <em>{{ t('hero.titleAccent') }}</em>
      </h1>
      <p class="hero-description">{{ t('hero.description') }}</p>
    </div>
    <div class="system-status" :data-state="requestStatus">
      <span class="status-light" aria-hidden="true"></span>
      <span>
        <small>{{ t('status.label') }}</small>
        <strong>{{ statusLabel }}</strong>
      </span>
      <code v-if="health">v{{ health.version }}</code>
    </div>
  </section>

  <section id="categories" class="content-section categories-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('categories.eyebrow') }}</p>
        <h2>{{ t('categories.title') }}</h2>
      </div>
      <p>{{ t('categories.description') }}</p>
    </div>

    <div class="category-grid">
      <article v-for="(category, index) in categories" :key="category.slug" class="category-card">
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <h3>{{ category.name }}</h3>
        <p>{{ category.description }}</p>
        <i aria-hidden="true">↗</i>
      </article>
    </div>
  </section>
</template>
