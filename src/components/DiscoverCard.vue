<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DiscoverItem } from '@/services/api'

defineProps<{ item: DiscoverItem; bookmarked?: boolean; canBookmark?: boolean }>()
const emit = defineEmits<{ toggleBookmark: [id: string] }>()

function date(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}
</script>

<template>
  <article class="discover-card">
    <p class="discover-meta">
      <span>{{ item.category_slug }}</span>
      <RouterLink v-if="item.game_slug" :to="`/games/${item.game_slug}`">{{
        item.game_title
      }}</RouterLink>
      <span v-if="item.review_score !== null" class="discover-score"
        >★ {{ item.review_score.toFixed(1) }}</span
      >
    </p>
    <h3>
      <RouterLink :to="`/publications/${item.id}`">{{ item.title }}</RouterLink>
    </h3>
    <p class="discover-summary">{{ item.summary }}</p>
    <p class="discover-foot">
      <small
        >{{ item.author_name }} · {{ date(item.published_at) }} · {{ item.view_count }} 👁</small
      >
      <button
        v-if="canBookmark"
        class="discover-bookmark"
        type="button"
        :aria-pressed="bookmarked"
        :title="bookmarked ? 'Убрать из закладок' : 'Прочитать позже'"
        @click="emit('toggleBookmark', item.id)"
      >
        {{ bookmarked ? '★ В закладках' : '☆ Позже' }}
      </button>
    </p>
    <ul v-if="item.tags.length" class="discover-tags">
      <li v-for="tag in item.tags" :key="tag">
        <RouterLink :to="{ path: '/search', query: { tag } }">#{{ tag }}</RouterLink>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.discover-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--border, #fff2);
  border-radius: 10px;
  background: var(--surface, #fff1);
}
.discover-card h3 {
  margin: 0;
  font-size: 1.15rem;
}
.discover-card a {
  color: inherit;
}
.discover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  color: var(--lime, #c5ef58);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.discover-score {
  color: #ffd166;
}
.discover-summary {
  margin: 0;
  color: var(--muted, #aaa);
  line-height: 1.5;
}
.discover-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--muted, #aaa);
}
.discover-bookmark {
  border: 1px solid var(--border, #fff3);
  border-radius: 999px;
  padding: 4px 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.discover-bookmark[aria-pressed='true'] {
  border-color: var(--lime, #c5ef58);
  color: var(--lime, #c5ef58);
}
.discover-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}
.discover-tags a {
  color: var(--muted, #aaa);
}
</style>
