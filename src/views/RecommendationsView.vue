<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { recommendFromSteam, type SteamRecommendations } from '@/services/api'

const STORAGE_KEY = 'ion-pulse:last-steam-profile'
const auth = useAuthStore()
const link = ref('')
const result = ref<SteamRecommendations>()
const loading = ref(false)
const error = ref('')

function saved(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
function remember(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // The link is only a convenience; ignore unavailable storage.
  }
}
async function submit(): Promise<void> {
  const value = link.value.trim()
  if (!value || loading.value) return
  loading.value = true
  error.value = ''
  result.value = undefined
  try {
    result.value = await recommendFromSteam(value)
    remember(value)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    loading.value = false
  }
}
function hours(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
}
onMounted(async () => {
  link.value = saved()
  if (!auth.user) await auth.restore().catch(() => undefined)
})
</script>

<template>
  <section class="editorial-page recommend-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / ПОДБОР ИГР</p>
        <h1>Во что поиграть дальше</h1>
      </div>
    </header>
    <p class="recommend-lead">
      Вставьте ссылку на профиль Steam, и мы подберём игры по тому, во что вы играли недавно и
      сколько часов в них провели. Профиль и «Сведения об играх» должны быть публичными.
    </p>
    <p v-if="!auth.isAuthenticated" class="empty-state">
      <RouterLink to="/login">Войдите</RouterLink>, чтобы пользоваться подбором.
    </p>
    <form v-else class="recommend-form" @submit.prevent="submit">
      <input
        v-model="link"
        type="text"
        required
        maxlength="300"
        placeholder="https://steamcommunity.com/id/ваш_ник"
        aria-label="Ссылка на профиль Steam"
        autocomplete="off"
      />
      <button class="button button-primary" :disabled="loading">
        {{ loading ? 'Анализируем…' : 'Подобрать игры' }}
      </button>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <template v-if="result">
      <section class="recommend-profile" aria-label="Профиль">
        <img v-if="result.profile.avatar_url" :src="result.profile.avatar_url" alt="" />
        <div>
          <h2>{{ result.profile.name }}</h2>
          <p>
            {{ result.profile.games_owned }} игр в библиотеке ·
            {{ result.profile.games_played }} запускали · {{ hours(result.profile.total_hours) }} ч
            всего · {{ hours(result.profile.recent_hours) }} ч за 2 недели
          </p>
          <ul v-if="result.profile.top_tags.length" class="recommend-tags" aria-label="Вкусы">
            <li v-for="tag in result.profile.top_tags" :key="tag">#{{ tag }}</li>
          </ul>
        </div>
      </section>

      <section v-if="result.profile.top_played.length" aria-labelledby="rec-played">
        <h2 id="rec-played">Больше всего играли</h2>
        <ul class="recommend-played">
          <li v-for="game in result.profile.top_played" :key="game.app_id">
            <img :src="game.image_url" alt="" loading="lazy" />
            <strong>{{ game.name }}</strong>
            <small
              >{{ hours(game.hours) }} ч
              <template v-if="game.recent_hours">
                · {{ hours(game.recent_hours) }} ч недавно</template
              >
            </small>
          </li>
        </ul>
      </section>

      <section aria-labelledby="rec-picks">
        <h2 id="rec-picks">Вам понравится</h2>
        <p v-if="!result.recommendations.length" class="empty-state">
          Пока не хватает данных об играх, чтобы что-то посоветовать. Поиграйте ещё и попробуйте
          снова.
        </p>
        <ul class="recommend-grid">
          <li v-for="item in result.recommendations" :key="item.app_id" class="recommend-card">
            <img :src="item.image_url" :alt="item.title" loading="lazy" />
            <div class="recommend-body">
              <div class="recommend-head">
                <h3>{{ item.title }}</h3>
                <span class="recommend-match" :title="'Совпадение со вкусом'"
                  >{{ item.match_percent }}%</span
                >
              </div>
              <p v-if="item.because.length" class="recommend-because">
                Потому что вы играли в
                {{
                  item.because.map((entry) => `${entry.name} (${hours(entry.hours)} ч)`).join(', ')
                }}
              </p>
              <ul class="recommend-tags">
                <li
                  v-for="tag in item.tags.slice(0, 6)"
                  :key="tag"
                  :class="{ hit: item.matched_tags.includes(tag) }"
                >
                  #{{ tag }}
                </li>
              </ul>
              <a :href="item.store_url" target="_blank" rel="noopener noreferrer"
                >Открыть в Steam ↗</a
              >
            </div>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.recommend-lead {
  max-width: 62ch;
  color: var(--muted, #aaa);
  line-height: 1.6;
}
.recommend-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 18px 0 24px;
}
.recommend-form input {
  flex: 1 1 320px;
}
.recommend-profile {
  display: flex;
  gap: 18px;
  align-items: center;
  margin: 8px 0 28px;
}
.recommend-profile img {
  width: 72px;
  height: 72px;
  border-radius: 12px;
}
.recommend-profile h2 {
  margin: 0 0 4px;
}
.recommend-profile p {
  margin: 0 0 8px;
  color: var(--muted, #aaa);
}
.recommend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: var(--muted, #aaa);
}
.recommend-tags .hit {
  color: var(--lime, #c5ef58);
}
.recommend-played {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin: 12px 0 32px;
  padding: 0;
  list-style: none;
}
.recommend-played li {
  display: grid;
  gap: 4px;
}
.recommend-played img,
.recommend-card img {
  width: 100%;
  aspect-ratio: 460 / 215;
  object-fit: cover;
  border-radius: 8px;
  background: #fff1;
}
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  margin: 12px 0;
  padding: 0;
  list-style: none;
}
.recommend-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border, #fff2);
  border-radius: 10px;
  background: var(--surface, #fff1);
}
.recommend-body {
  display: grid;
  gap: 8px;
}
.recommend-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
}
.recommend-head h3 {
  margin: 0;
  font-size: 1.05rem;
}
.recommend-match {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--lime, #c5ef58);
  color: #151711;
  font-weight: 700;
  font-size: 0.85rem;
}
.recommend-because {
  margin: 0;
  color: var(--muted, #aaa);
  font-size: 0.85rem;
}
.recommend-card a {
  color: inherit;
  font-size: 0.9rem;
}
</style>
