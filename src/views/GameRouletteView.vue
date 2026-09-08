<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getRouletteGames, listGameSubscriptions, listGames, type Game } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

type Mode = 'all' | 'library' | 'custom'

const { locale } = useI18n()
const auth = useAuthStore()
const mode = ref<Mode>('all')
const count = ref(8)
const catalog = ref<Game[]>([])
const library = ref<Game[]>([])
const customIds = ref<string[]>([])
const wheelGames = ref<Game[]>([])
const winner = ref<Game | null>(null)
const loading = ref(true)
const spinning = ref(false)
const error = ref('')
const rotation = ref(0)

const isRu = computed(() => locale.value === 'ru')
const copy = computed(() =>
  isRu.value
    ? {
        eyebrow: 'ION PULSE / GAME PICKER',
        title: 'Во что сыграть сегодня?',
        intro: 'Соберите колесо и оставьте выбор случаю.',
        all: 'Весь каталог',
        library: 'Мои игры',
        custom: 'Свой список',
        amount: 'Игр на колесе',
        refresh: 'Обновить подборку',
        spin: 'Крутить',
        spinning: 'Выбираем…',
        result: 'Выбор сделан',
        again: 'Ещё раз',
        store: 'Открыть в Steam ↗',
        emptyLibrary: 'Подпишитесь на игры в профиле, чтобы собрать личное колесо.',
        choose: 'Выберите минимум две игры.',
        loadError: 'Не удалось загрузить игры.',
      }
    : {
        eyebrow: 'ION PULSE / GAME PICKER',
        title: 'What should you play today?',
        intro: 'Build a wheel and leave the choice to chance.',
        all: 'Full catalog',
        library: 'My games',
        custom: 'Custom list',
        amount: 'Games on wheel',
        refresh: 'Refresh selection',
        spin: 'Spin',
        spinning: 'Choosing…',
        result: 'The choice is made',
        again: 'Spin again',
        store: 'Open on Steam ↗',
        emptyLibrary: 'Follow games in your profile to build a personal wheel.',
        choose: 'Choose at least two games.',
        loadError: 'Could not load games.',
      },
)

function sample(items: Game[], amount: number): Game[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!]
  }
  return shuffled.slice(0, amount)
}

async function fillWheel(): Promise<void> {
  error.value = ''
  winner.value = null
  if (mode.value === 'all') {
    try {
      wheelGames.value = (await getRouletteGames(count.value)).games
    } catch {
      error.value = copy.value.loadError
    }
    return
  }
  const source =
    mode.value === 'library'
      ? library.value
      : catalog.value.filter((game) => customIds.value.includes(game.id))
  wheelGames.value = sample(source, count.value)
}

function spin(): void {
  if (spinning.value || wheelGames.value.length < 2) return
  spinning.value = true
  winner.value = null
  const index = Math.floor(Math.random() * wheelGames.value.length)
  const segment = 360 / wheelGames.value.length
  rotation.value += 1440 + (360 - index * segment)
  window.setTimeout(() => {
    winner.value = wheelGames.value[index] ?? null
    spinning.value = false
  }, 1500)
}

function useFallbackPoster(event: Event, game: Game): void {
  const image = event.currentTarget as HTMLImageElement
  if (game.fallback_poster_url && image.src !== game.fallback_poster_url) {
    image.src = game.fallback_poster_url
  }
}

watch([mode, count], () => void fillWheel())
watch(customIds, () => mode.value === 'custom' && void fillWheel(), { deep: true })

onMounted(async () => {
  try {
    catalog.value = await listGames()
    customIds.value = catalog.value.slice(0, 8).map((game) => game.id)
    if (auth.isAuthenticated) library.value = await listGameSubscriptions()
    await fillWheel()
  } catch {
    error.value = copy.value.loadError
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="roulette-page">
    <header class="roulette-heading">
      <p class="eyebrow">{{ copy.eyebrow }}</p>
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.intro }}</p>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <div v-if="loading" class="empty-state">{{ copy.spinning }}</div>
    <div v-else class="roulette-layout">
      <aside class="roulette-controls">
        <div class="roulette-tabs" role="tablist">
          <button :class="{ active: mode === 'all' }" @click="mode = 'all'">{{ copy.all }}</button>
          <button
            :class="{ active: mode === 'library' }"
            :disabled="!auth.isAuthenticated"
            @click="mode = 'library'"
          >
            {{ copy.library }}
          </button>
          <button :class="{ active: mode === 'custom' }" @click="mode = 'custom'">
            {{ copy.custom }}
          </button>
        </div>

        <label class="roulette-count">
          <span
            >{{ copy.amount }}: <strong>{{ count }}</strong></span
          >
          <input v-model.number="count" type="range" min="2" max="12" />
        </label>

        <div v-if="mode === 'custom'" class="roulette-catalog">
          <label v-for="game in catalog" :key="game.id">
            <input v-model="customIds" type="checkbox" :value="game.id" />
            <span>{{ game.title }}</span>
          </label>
        </div>
        <p v-if="mode === 'library' && !library.length" class="roulette-note">
          {{ copy.emptyLibrary }}
        </p>
        <p v-if="wheelGames.length < 2" class="roulette-note">{{ copy.choose }}</p>
        <button class="button button-secondary" :disabled="spinning" @click="fillWheel">
          {{ copy.refresh }}
        </button>

        <article v-if="winner" class="roulette-result">
          <p class="eyebrow">{{ copy.result }}</p>
          <h2>{{ winner.title }}</h2>
          <p>{{ winner.genre }}</p>
          <a v-if="winner.store_url" :href="winner.store_url" target="_blank" rel="noopener">{{
            copy.store
          }}</a>
        </article>
      </aside>

      <div class="roulette-stage">
        <div class="roulette-pointer" aria-hidden="true"></div>
        <div
          class="roulette-wheel"
          :class="{ spinning }"
          :style="{ transform: `rotate(${rotation}deg)` }"
        >
          <div
            v-for="(game, index) in wheelGames"
            :key="game.id"
            class="roulette-game"
            :style="{
              transform: `rotate(${index * (360 / wheelGames.length)}deg) translateY(-42%)`,
            }"
          >
            <img
              :src="game.poster_url || game.fallback_poster_url"
              :alt="game.title"
              @error="useFallbackPoster($event, game)"
            />
            <span>{{ game.title }}</span>
          </div>
        </div>
        <button class="roulette-spin" :disabled="spinning || wheelGames.length < 2" @click="spin">
          {{ spinning ? copy.spinning : winner ? copy.again : copy.spin }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.roulette-page {
  min-height: calc(100vh - var(--header-height));
  padding: clamp(3rem, 6vw, 6rem) 0;
}
.roulette-heading {
  max-width: 920px;
  margin-bottom: clamp(2rem, 5vw, 4rem);
}
.roulette-heading h1 {
  max-width: 900px;
  margin: 0.35rem 0 0.8rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(3rem, 7vw, 7rem);
  line-height: 0.9;
  letter-spacing: -0.06em;
}
.roulette-heading > p:last-child,
.roulette-note {
  color: var(--muted);
}
.roulette-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.72fr) minmax(500px, 1.28fr);
  gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
}
.roulette-controls {
  display: grid;
  gap: 1.25rem;
  align-content: start;
}
.roulette-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}
.roulette-tabs button {
  padding: 0.72rem 1rem;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}
.roulette-tabs button.active {
  color: #10111a;
  background: var(--lime);
  border-color: var(--lime);
}
.roulette-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.roulette-count {
  display: grid;
  gap: 0.7rem;
  padding: 1.1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}
.roulette-count input {
  width: 100%;
  accent-color: var(--lime);
}
.roulette-catalog {
  display: grid;
  max-height: 280px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}
.roulette-catalog label {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}
.roulette-catalog input {
  accent-color: var(--lime);
}
.roulette-result {
  padding: 1.4rem;
  background: linear-gradient(145deg, rgb(199 255 94 / 11%), var(--surface));
  border: 1px solid rgb(199 255 94 / 35%);
  border-radius: 14px;
}
.roulette-result h2 {
  margin: 0.35rem 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(1.7rem, 3vw, 2.7rem);
  line-height: 1;
}
.roulette-result a {
  display: inline-block;
  margin-top: 0.65rem;
  color: var(--lime);
}
.roulette-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: min(70vw, 720px);
  aspect-ratio: 1;
  margin: 0 auto;
}
.roulette-wheel {
  position: absolute;
  inset: 2%;
  overflow: hidden;
  background:
    radial-gradient(circle, var(--surface) 0 19%, transparent 20%),
    repeating-conic-gradient(
      from -8deg,
      rgb(199 255 94 / 16%) 0 22.5deg,
      rgb(166 139 255 / 14%) 22.5deg 45deg
    );
  border: 7px solid var(--surface-raised);
  border-radius: 50%;
  box-shadow: 0 32px 90px rgb(0 0 0 / 44%);
  transition: transform 1.5s cubic-bezier(0.12, 0.72, 0.12, 1);
}
.roulette-game {
  position: absolute;
  top: 50%;
  left: calc(50% - 48px);
  display: grid;
  width: 96px;
  height: 46%;
  justify-items: center;
  align-content: start;
  transform-origin: 50% 100%;
}
.roulette-game img {
  width: clamp(48px, 7vw, 82px);
  aspect-ratio: 2 / 3;
  object-fit: cover;
  background: var(--surface-raised);
  border: 2px solid rgb(255 255 255 / 60%);
  border-radius: 7px;
}
.roulette-game span {
  width: 120px;
  margin-top: 0.35rem;
  overflow: hidden;
  color: var(--text);
  font-size: clamp(0.55rem, 1vw, 0.72rem);
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roulette-pointer {
  position: absolute;
  top: -1%;
  z-index: 3;
  width: 0;
  height: 0;
  border-top: 30px solid var(--lime);
  border-right: 18px solid transparent;
  border-left: 18px solid transparent;
  filter: drop-shadow(0 5px 8px rgb(0 0 0 / 50%));
}
.roulette-spin {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 22%;
  aspect-ratio: 1;
  padding: 0.5rem;
  color: #10111a;
  background: var(--lime);
  border: 8px solid var(--surface-raised);
  border-radius: 50%;
  cursor: pointer;
  font-weight: 800;
}
.roulette-spin:disabled {
  cursor: wait;
  opacity: 0.7;
}
@media (max-width: 900px) {
  .roulette-layout {
    grid-template-columns: 1fr;
  }
  .roulette-stage {
    width: min(92vw, 620px);
  }
}
</style>
