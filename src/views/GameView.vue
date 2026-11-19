<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DiscoverCard from '@/components/DiscoverCard.vue'
import { useBookmarks } from '@/composables/useBookmarks'
import { useAuthStore } from '@/stores/auth'
import {
  getGameOverview,
  listGameSubscriptions,
  subscribeToGame,
  unsubscribeFromGame,
  type GameOverview,
} from '@/services/api'

const { locale } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const bookmarks = useBookmarks()
const game = ref<GameOverview>()
const subscribed = ref(false)
const error = ref('')
const busy = ref(false)
const slug = computed(() => String(route.params.slug))

async function load(): Promise<void> {
  error.value = ''
  game.value = undefined
  try {
    game.value = await getGameOverview(slug.value, locale.value as 'ru' | 'en')
    if (auth.isAuthenticated) {
      void bookmarks.load()
      const mine = await listGameSubscriptions().catch(() => [])
      subscribed.value = mine.some((entry) => entry.id === game.value?.id)
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  }
}
async function toggleSubscription(): Promise<void> {
  if (!game.value || busy.value) return
  busy.value = true
  try {
    if (subscribed.value) await unsubscribeFromGame(game.value.id)
    else await subscribeToGame(game.value.id)
    subscribed.value = !subscribed.value
    game.value.subscriber_count += subscribed.value ? 1 : -1
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  if (!auth.user) await auth.restore().catch(() => undefined)
  await load()
})
watch([slug, locale], load)
</script>

<template>
  <section class="editorial-page">
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <template v-else-if="game">
      <header class="queue-header">
        <div>
          <p class="eyebrow">ION PULSE / ИГРА</p>
          <h1>{{ game.title }}</h1>
        </div>
        <button
          v-if="auth.isAuthenticated"
          class="button"
          :class="subscribed ? 'button-secondary' : 'button-primary'"
          type="button"
          :disabled="busy"
          @click="toggleSubscription"
        >
          {{ subscribed ? 'Вы подписаны' : 'Следить за игрой' }}
        </button>
      </header>
      <dl class="game-facts">
        <div>
          <dt>Сводная оценка</dt>
          <dd>
            <strong v-if="game.average_score !== null"
              >★ {{ game.average_score.toFixed(1) }}</strong
            >
            <span v-else>—</span>
            <small v-if="game.review_count"> по {{ game.review_count }} обзор(ам)</small>
          </dd>
        </div>
        <div>
          <dt>Материалов</dt>
          <dd>{{ game.publication_count }}</dd>
        </div>
        <div>
          <dt>Подписчиков</dt>
          <dd>{{ game.subscriber_count }}</dd>
        </div>
      </dl>
      <p v-if="!game.publications.length" class="empty-state">Об этой игре пока нет материалов.</p>
      <div class="game-materials">
        <DiscoverCard
          v-for="item in game.publications"
          :key="item.id"
          :item="item"
          :can-bookmark="auth.isAuthenticated"
          :bookmarked="bookmarks.ids.value.has(item.id)"
          @toggle-bookmark="bookmarks.toggle"
        />
      </div>
    </template>
    <p v-else class="empty-state">Загрузка…</p>
  </section>
</template>

<style scoped>
.game-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin: 0 0 28px;
}
.game-facts dt {
  color: var(--muted, #aaa);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.game-facts dd {
  margin: 4px 0 0;
  font-size: 1.4rem;
}
.game-materials {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style>
