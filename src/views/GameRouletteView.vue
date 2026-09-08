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
