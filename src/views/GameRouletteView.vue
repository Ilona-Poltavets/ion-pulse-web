<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  getRouletteGames,
  getSteamAccount,
  getSteamConnectUrl,
  listGameSubscriptions,
  listGames,
  listSteamLibrary,
  type Game,
  type SteamAccount,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { wheelTargetRotation } from '@/components/roulette/wheelRotation'

type Mode = 'all' | 'library' | 'custom'

const { locale } = useI18n()
const auth = useAuthStore()
const mode = ref<Mode>('all')
const count = ref(8)
const catalog = ref<Game[]>([])
const library = ref<Game[]>([])
const steamAccount = ref<SteamAccount | null>(null)
const customIds = ref<string[]>([])
const wheelGames = ref<Game[]>([])
const winner = ref<Game | null>(null)
const loading = ref(true)
const spinning = ref(false)
const error = ref('')
const rotation = ref(0)
const wheelMax = computed(() => {
  if (mode.value === 'all') return 20
  const available = mode.value === 'library' ? library.value.length : customIds.value.length
  return Math.max(2, Math.min(available, 20))
})
const normalizedCount = computed(() => Math.min(Math.max(count.value, 2), wheelMax.value))

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
        settings: 'Настройки колеса',
        list: 'Список на колесе',
        allActive: 'Все активные',
        start: 'Старт',
        spin: 'Крутить',
        spinning: 'Выбираем…',
        result: 'Выбор сделан',
        again: 'Ещё раз',
        store: 'Открыть в Steam ↗',
        emptyLibrary: 'Подпишитесь на игры в профиле, чтобы собрать личное колесо.',
        connect: 'Привязать Steam',
        connected: 'Подключён Steam',
        steamFailed: 'Не удалось привязать Steam. Попробуйте ещё раз.',
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
        settings: 'Wheel settings',
        list: 'Wheel list',
        allActive: 'All active',
        start: 'Start',
        spin: 'Spin',
        spinning: 'Choosing…',
        result: 'The choice is made',
        again: 'Spin again',
        store: 'Open on Steam ↗',
        emptyLibrary: 'Follow games in your profile to build a personal wheel.',
        connect: 'Connect Steam',
        connected: 'Steam connected',
        steamFailed: 'Could not connect Steam. Please try again.',
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
      wheelGames.value = (await getRouletteGames(normalizedCount.value)).games
    } catch {
      error.value = copy.value.loadError
    }
    return
  }
  const source =
    mode.value === 'library'
      ? library.value
      : catalog.value.filter((game) => customIds.value.includes(game.id))
  wheelGames.value = sample(source, normalizedCount.value)
}

function spin(): void {
  if (spinning.value || wheelGames.value.length < 2) return
  spinning.value = true
  winner.value = null
  const index = Math.floor(Math.random() * wheelGames.value.length)
  rotation.value = wheelTargetRotation(rotation.value, index, wheelGames.value.length)
  window.setTimeout(() => {
    winner.value = wheelGames.value[index] ?? null
    spinning.value = false
  }, 1450)
}

function choose(game: Game): void {
  if (!spinning.value) winner.value = game
}

function segmentStyle(index: number): Record<string, string> {
  const angle = 360 / wheelGames.value.length
  return {
    '--segment-rotation': `${index * angle}deg`,
    '--segment-angle': `${angle}deg`,
  }
}

function connectSteam(): void {
  window.location.assign(getSteamConnectUrl())
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
    if (auth.isAuthenticated) {
      try {
        steamAccount.value = await getSteamAccount()
        library.value = await listSteamLibrary()
      } catch {
        library.value = await listGameSubscriptions()
      }
    }
    const steamResult = new URLSearchParams(window.location.search).get('steam')
    if (steamResult && steamResult !== 'connected') error.value = copy.value.steamFailed
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
    <div v-else class="roulette-folder">
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
      <div class="roulette-layout">
        <aside class="roulette-controls">
          <button
            v-if="auth.isAuthenticated && !steamAccount"
            class="steam-connect-button"
            type="button"
            @click="connectSteam"
          >
            <span aria-hidden="true">◉</span> {{ copy.connect }}
          </button>
          <div v-else-if="steamAccount" class="steam-account-chip">
            <img v-if="steamAccount.avatar_url" :src="steamAccount.avatar_url" alt="" />
            <span>
              <small>{{ copy.connected }}</small>
              <strong>{{ steamAccount.display_name }}</strong>
            </span>
          </div>
          <label class="roulette-count">
            <span class="roulette-count-head">
              <span
                ><strong>{{ copy.settings }}</strong
                ><small>{{ copy.amount }}: {{ normalizedCount }} / {{ wheelMax }}</small></span
              >
              <span class="roulette-count-actions">
                <button type="button" @click="fillWheel">{{ copy.list }}</button>
                <button type="button" @click="count = wheelMax">{{ copy.allActive }}</button>
              </span>
            </span>
            <input v-model.number="count" type="range" min="2" :max="wheelMax" />
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

        <div class="roulette-wheel-column">
          <div class="roulette-composition">
            <div class="roulette-stage">
              <div class="roulette-pointer" aria-hidden="true"></div>
              <div
                class="roulette-wheel"
                :class="{ spinning }"
                :style="{ transform: `rotate(${rotation}deg)` }"
              >
                <button
                  v-for="(game, index) in wheelGames"
                  :key="game.id"
                  type="button"
                  class="roulette-segment"
                  :style="segmentStyle(index)"
                  :aria-label="game.title"
                  @click="choose(game)"
                >
                  <img
                    :src="game.poster_url || game.fallback_poster_url"
                    :alt="game.title"
                    @error="useFallbackPoster($event, game)"
                  />
                </button>
                <span
                  v-for="(game, index) in wheelGames"
                  :key="`divider-${game.id}`"
                  class="roulette-divider"
                  aria-hidden="true"
                  :style="{ transform: `rotate(${index * (360 / wheelGames.length)}deg)` }"
                />
              </div>
              <button
                class="roulette-spin"
                :disabled="spinning || wheelGames.length < 2"
                @click="spin"
              >
                {{ spinning ? copy.spinning : copy.start }}
              </button>
            </div>
            <button
              class="button button-primary roulette-spin-wide"
              :disabled="spinning || wheelGames.length < 2"
              @click="spin"
            >
              {{ spinning ? copy.spinning : winner ? copy.again : copy.spin }}
            </button>
          </div>
        </div>
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
  grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 1.1fr);
  gap: 1.5rem;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  border-top-left-radius: 0;
}
.roulette-controls {
  display: grid;
  gap: 1rem;
  align-content: start;
}
.steam-connect-button,
.steam-account-chip {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  min-height: 58px;
  padding: 0.8rem 1rem;
  color: var(--text);
  background: linear-gradient(135deg, #1b2838, var(--surface));
  border: 1px solid rgb(199 255 94 / 30%);
  border-radius: 12px;
}
.steam-connect-button {
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
.steam-connect-button span {
  color: var(--lime);
  font-size: 1.35rem;
}
.steam-account-chip img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.steam-account-chip span {
  display: grid;
  gap: 0.1rem;
}
.steam-account-chip small {
  color: var(--lime);
  font-size: 0.67rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.roulette-tabs {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  padding-left: 16px;
}
.roulette-tabs button {
  min-height: 44px;
  padding: 0 20px;
  color: var(--muted);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  cursor: pointer;
  font-weight: 600;
  transform: translateY(1px);
}
.roulette-tabs button.active {
  z-index: 2;
  color: var(--text);
  background: var(--surface);
  border-color: var(--line);
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
.roulette-count-head,
.roulette-count-head > span:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.roulette-count-head > span:first-child {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.25rem;
}
.roulette-count-head small {
  color: var(--muted);
}
.roulette-count-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.roulette-count-actions button {
  min-height: 36px;
  padding: 0 0.75rem;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
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
.roulette-wheel-column {
  display: flex;
  min-height: clamp(480px, 58vh, 680px);
  align-items: center;
  justify-content: center;
}
.roulette-composition {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.roulette-stage {
  position: relative;
  width: clamp(360px, 42vw, 540px);
  max-width: min(100%, 72vh);
  aspect-ratio: 1;
  flex: 0 0 auto;
}
.roulette-wheel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--surface-raised);
  border: 7px solid #f4f7fb;
  border-radius: 50%;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 6%),
    0 24px 56px rgb(0 0 0 / 32%),
    inset 0 0 0 2px rgb(255 255 255 / 55%);
  transition: transform 1450ms ease-out;
  will-change: transform;
}
.roulette-segment {
  position: absolute;
  inset: 0;
  padding: 0;
  overflow: hidden;
  background: var(--surface-raised);
  border: 0;
  clip-path: circle(50% at 50% 50%);
  cursor: pointer;
  mask: conic-gradient(
    from var(--segment-rotation),
    #000 0 var(--segment-angle),
    transparent var(--segment-angle) 360deg
  );
  -webkit-mask: conic-gradient(
    from var(--segment-rotation),
    #000 0 var(--segment-angle),
    transparent var(--segment-angle) 360deg
  );
}
.roulette-segment:hover {
  filter: saturate(1.14) brightness(1.05);
}
.roulette-segment img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.12) contrast(1.03);
  user-select: none;
}
.roulette-segment::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(transparent, rgb(0 0 0 / 18%));
  pointer-events: none;
}
.roulette-divider {
  position: absolute;
  top: 0;
  left: calc(50% - 2px);
  z-index: 3;
  width: 4px;
  height: 50%;
  background: #fff;
  border-radius: 999px;
  box-shadow: 0 0 0 0.5px rgb(0 0 0 / 8%);
  transform-origin: 50% 100%;
  pointer-events: none;
}
.roulette-pointer {
  position: absolute;
  top: -1px;
  left: 50%;
  z-index: 6;
  width: 0;
  height: 0;
  border-top: clamp(28px, 7vw, 44px) solid var(--lime);
  border-right: clamp(15px, 4vw, 24px) solid transparent;
  border-left: clamp(15px, 4vw, 24px) solid transparent;
  filter: drop-shadow(0 8px 14px rgb(199 255 94 / 35%));
  transform: translateX(-50%);
  pointer-events: none;
}
.roulette-spin {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: clamp(82px, 19%, 112px);
  aspect-ratio: 1;
  padding: 0.5rem;
  color: #fff;
  background: #22252b;
  border: 4px solid #fff;
  border-radius: 999px;
  cursor: pointer;
  font-size: clamp(0.74rem, 1.8vw, 0.95rem);
  font-weight: 800;
  line-height: 1.05;
  text-align: center;
  transform: translate(-50%, -50%);
  box-shadow:
    0 12px 26px rgb(15 23 42 / 24%),
    inset 0 0 0 1px rgb(255 255 255 / 8%);
}
.roulette-spin:hover:not(:disabled) {
  background: #111318;
}
.roulette-spin:disabled {
  cursor: not-allowed;
  opacity: 0.78;
}
.roulette-spin-wide {
  width: min(100%, 280px);
  min-height: 48px;
}
@media (max-width: 900px) {
  .roulette-layout {
    grid-template-columns: 1fr;
  }
  .roulette-wheel-column {
    grid-row: 1;
    min-height: auto;
  }
  .roulette-stage {
    width: min(100%, 360px);
  }
}
</style>
