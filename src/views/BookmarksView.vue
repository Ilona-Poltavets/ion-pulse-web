<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import DiscoverCard from '@/components/DiscoverCard.vue'
import { useBookmarks } from '@/composables/useBookmarks'
import { useAuthStore } from '@/stores/auth'
import { listBookmarks, type DiscoverItem } from '@/services/api'

const { locale } = useI18n()
const auth = useAuthStore()
const bookmarks = useBookmarks()
const items = ref<DiscoverItem[]>([])
const loading = ref(true)
const error = ref('')

async function load(): Promise<void> {
  if (!auth.isAuthenticated) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    await bookmarks.load(true)
    items.value = await listBookmarks(locale.value as 'ru' | 'en')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    loading.value = false
  }
}
async function toggle(id: string): Promise<void> {
  await bookmarks.toggle(id)
  items.value = items.value.filter((item) => bookmarks.ids.value.has(item.id))
}
onMounted(async () => {
  if (!auth.user) await auth.restore().catch(() => undefined)
  await load()
})
watch(locale, load)
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / ЗАКЛАДКИ</p>
        <h1>Прочитать позже</h1>
      </div>
    </header>
    <p v-if="!auth.isAuthenticated" class="empty-state">
      <RouterLink to="/login">Войдите</RouterLink>, чтобы сохранять материалы в закладки.
    </p>
    <p v-else-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="!items.length" class="empty-state">
      Закладок пока нет. Нажмите «☆ Позже» на карточке материала в
      <RouterLink to="/search">поиске</RouterLink>.
    </p>
    <div class="bookmark-list">
      <DiscoverCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        can-bookmark
        :bookmarked="bookmarks.ids.value.has(item.id)"
        @toggle-bookmark="toggle"
      />
    </div>
  </section>
</template>

<style scoped>
.bookmark-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style>
