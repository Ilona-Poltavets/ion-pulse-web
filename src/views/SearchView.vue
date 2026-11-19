<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DiscoverCard from '@/components/DiscoverCard.vue'
import { useBookmarks } from '@/composables/useBookmarks'
import { useAuthStore } from '@/stores/auth'
import {
  listCategories,
  listDiscoverTags,
  listGameSummaries,
  searchMaterials,
  type Category,
  type DiscoverItem,
  type GameSummary,
  type TagCount,
} from '@/services/api'

const PAGE_SIZE = 12
const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const bookmarks = useBookmarks()

const filters = reactive({
  q: String(route.query.q ?? ''),
  category: String(route.query.category ?? ''),
  game: String(route.query.game ?? ''),
  tag: String(route.query.tag ?? ''),
  content_type: String(route.query.content_type ?? ''),
  min_score: String(route.query.min_score ?? ''),
  sort: (String(route.query.sort ?? 'new') as 'new' | 'score' | 'views') || 'new',
})
const items = ref<DiscoverItem[]>([])
const categories = ref<Category[]>([])
const games = ref<GameSummary[]>([])
const tags = ref<TagCount[]>([])
const loading = ref(false)
const error = ref('')
const hasMore = ref(false)
const contentTypes = [
  { value: '', label: 'Любой тип' },
  { value: 'review', label: 'Обзоры' },
  { value: 'guide', label: 'Гайды' },
  { value: 'article', label: 'Статьи' },
  { value: 'news', label: 'Новости' },
]
const activeCount = computed(
  () =>
    [
      filters.q,
      filters.category,
      filters.game,
      filters.tag,
      filters.content_type,
      filters.min_score,
    ].filter(Boolean).length,
)

function currentFilters(offset: number) {
  return {
    q: filters.q.trim() || undefined,
    category: filters.category || undefined,
    game: filters.game || undefined,
    tag: filters.tag || undefined,
    content_type: filters.content_type || undefined,
    min_score: filters.min_score ? Number(filters.min_score) : undefined,
    sort: filters.sort,
    limit: PAGE_SIZE,
    offset,
  }
}
let version = 0
async function run(append = false): Promise<void> {
  const current = ++version
  loading.value = true
  error.value = ''
  try {
    const result = await searchMaterials(
      locale.value as 'ru' | 'en',
      currentFilters(append ? items.value.length : 0),
    )
    if (current !== version) return
    items.value = append ? [...items.value, ...result] : result
    hasMore.value = result.length === PAGE_SIZE
  } catch (caught) {
    if (current === version) error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    if (current === version) loading.value = false
  }
}
function syncUrl(): void {
  const query = Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => value && !(key === 'sort' && value === 'new')),
  )
  void router.replace({ query })
}
let timer: ReturnType<typeof setTimeout> | undefined
watch(filters, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    syncUrl()
    void run()
  }, 250)
})
watch(locale, () => run())
function reset(): void {
  Object.assign(filters, {
    q: '',
    category: '',
    game: '',
    tag: '',
    content_type: '',
    min_score: '',
    sort: 'new',
  })
}
onMounted(async () => {
  if (!auth.user) await auth.restore().catch(() => undefined)
  if (auth.isAuthenticated) void bookmarks.load()
  void run()
  const lang = locale.value as 'ru' | 'en'
  categories.value = await listCategories(lang).catch(() => [])
  games.value = await listGameSummaries().catch(() => [])
  tags.value = await listDiscoverTags().catch(() => [])
})
</script>

<template>
  <section class="editorial-page search-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / ПОИСК</p>
        <h1>Найти материал</h1>
      </div>
    </header>
    <form class="search-filters" role="search" @submit.prevent="run()">
      <label class="search-wide"
        >Запрос
        <input v-model="filters.q" type="search" placeholder="Игра, тема, автор…" maxlength="120"
      /></label>
      <label
        >Рубрика
        <select v-model="filters.category">
          <option value="">Все</option>
          <option v-for="category in categories" :key="category.slug" :value="category.slug">
            {{ category.name }}
          </option>
        </select></label
      >
      <label
        >Игра
        <select v-model="filters.game">
          <option value="">Все</option>
          <option v-for="game in games" :key="game.slug" :value="game.slug">
            {{ game.title }}
          </option>
        </select></label
      >
      <label
        >Тип
        <select v-model="filters.content_type">
          <option v-for="type in contentTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select></label
      >
      <label
        >Оценка от
        <select v-model="filters.min_score">
          <option value="">Любая</option>
          <option v-for="score in [3, 3.5, 4, 4.5, 5]" :key="score" :value="String(score)">
            {{ score }}+
          </option>
        </select></label
      >
      <label
        >Сортировка
        <select v-model="filters.sort">
          <option value="new">Новые</option>
          <option value="score">По оценке</option>
          <option value="views">По просмотрам</option>
        </select></label
      >
      <button v-if="activeCount" class="button button-secondary" type="button" @click="reset">
        Сбросить ({{ activeCount }})
      </button>
    </form>
    <ul v-if="tags.length" class="search-tags" aria-label="Популярные теги">
      <li v-for="entry in tags" :key="entry.tag">
        <button
          type="button"
          :class="{ active: filters.tag === entry.tag }"
          @click="filters.tag = filters.tag === entry.tag ? '' : entry.tag"
        >
          #{{ entry.tag }} <small>{{ entry.count }}</small>
        </button>
      </li>
    </ul>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-else-if="loading && !items.length" class="empty-state">Ищем…</p>
    <p v-else-if="!items.length" class="empty-state">
      Ничего не найдено. Попробуйте изменить фильтры.
    </p>
    <div class="search-results" :aria-busy="loading">
      <DiscoverCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :can-bookmark="auth.isAuthenticated"
        :bookmarked="bookmarks.ids.value.has(item.id)"
        @toggle-bookmark="bookmarks.toggle"
      />
    </div>
    <button
      v-if="hasMore"
      class="button button-secondary search-more"
      type="button"
      :disabled="loading"
      @click="run(true)"
    >
      Показать ещё
    </button>
  </section>
</template>

<style scoped>
.search-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}
.search-filters label {
  display: grid;
  gap: 6px;
  font-size: 0.8rem;
}
.search-wide {
  grid-column: 1 / -1;
}
.search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
}
.search-tags button {
  border: 1px solid var(--border, #fff3);
  border-radius: 999px;
  padding: 4px 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.search-tags button.active {
  border-color: var(--lime, #c5ef58);
  color: var(--lime, #c5ef58);
}
.search-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.search-more {
  margin: 24px auto 0;
  display: flex;
}
</style>
