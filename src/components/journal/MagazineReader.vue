<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { JournalCandidate, JournalPage } from '@/services/api'
import MagazinePage from './MagazinePage.vue'
import { journalImageUrl } from './journalImage'
import { pageCurl } from './pageCurl'
import { playFlipSound } from './flipSound'
import { FONT_SCALES, useReaderPreferences } from './readerPreferences'
import {
  canTurnReader,
  normalizeDesktopReaderIndex,
  readerRange,
  readerStep,
} from './readerPagination'

const props = defineProps<{ pages: JournalPage[]; materials: JournalCandidate[] }>()
const book = ref<HTMLElement>()
const preferences = useReaderPreferences()
const themes = [
  { id: 'paper', label: 'Бумага' },
  { id: 'sepia', label: 'Сепия' },
  { id: 'night', label: 'Ночь' },
] as const
const index = ref(0)
const width = ref(1200)
const height = ref(780)
const mobile = ref(false)
const pagesPerView = computed(() => (mobile.value ? 1 : 2))
const progress = ref(0)
const direction = ref<1 | -1>(1)
const tilt = ref(0.18)
const phase = ref<'idle' | 'dragging' | 'settling'>('idle')
const busy = computed(() => phase.value !== 'idle')
const pageWidth = computed(() => width.value / pagesPerView.value)
const curl = computed(() => pageCurl(pageWidth.value, height.value, progress.value, tilt.value))
const turnStep = computed(() => readerStep(index.value, direction.value, mobile.value))
const next = computed(() => canTurnReader(index.value, 1, props.pages.length, mobile.value))
const previous = computed(() => canTurnReader(index.value, -1, props.pages.length, mobile.value))
const range = computed(() => readerRange(index.value, props.pages.length, mobile.value))
const coverMode = computed(
  () =>
    !mobile.value &&
    (index.value === 0 || (busy.value && direction.value < 0 && index.value === 1)),
)
const frontIndex = computed(() =>
  direction.value > 0 ? (index.value === 0 ? 0 : index.value + 1) : index.value,
)
const backIndex = computed(() =>
  direction.value > 0 ? index.value + turnStep.value : index.value - 1,
)
const leftIndex = computed(() =>
  busy.value && direction.value < 0
    ? index.value - turnStep.value
    : busy.value && direction.value > 0 && index.value === 0
      ? 1
      : index.value,
)
const rightIndex = computed(() =>
  busy.value && direction.value > 0 ? index.value + turnStep.value + 1 : index.value + 1,
)
const singleIndex = computed(() => (busy.value ? index.value + direction.value : index.value))
let frame = 0
let observer: ResizeObserver | undefined
let reducedMotion: MediaQueryList | undefined
let suppressClick = false
let gesture: { id: number; x: number; y: number; time: number; started: boolean } | undefined
const imagePreloads = new Map<string, HTMLImageElement>()
const sheetStyle = computed(() => ({
  width: `${pageWidth.value}px`,
  height: `${height.value}px`,
  '--crease': `${curl.value.crease}px`,
  '--crease-angle': `${curl.value.angle}deg`,
  '--curl-lift': curl.value.lift,
}))

function reset() {
  cancelAnimationFrame(frame)
  const pointer = gesture?.id
  gesture = undefined
  if (pointer !== undefined && book.value?.hasPointerCapture(pointer))
    book.value.releasePointerCapture(pointer)
  phase.value = 'idle'
  progress.value = 0
}
function canTurn(value: number) {
  return canTurnReader(index.value, value > 0 ? 1 : -1, props.pages.length, mobile.value)
}
function settle(complete: boolean) {
  if (complete && preferences.sound && !reducedMotion?.matches) playFlipSound()
  phase.value = 'settling'
  const from = progress.value
  const target = complete ? 1 : 0
  const start = performance.now()
  const duration = reducedMotion?.matches ? 0 : 300 + Math.abs(target - from) * 560
  function animate(now: number) {
    const elapsed = duration ? Math.min(1, (now - start) / duration) : 1
    const eased = 1 - Math.pow(1 - elapsed, 3)
    progress.value = from + (target - from) * eased
    if (elapsed < 1) frame = requestAnimationFrame(animate)
    else {
      if (complete) index.value += direction.value * turnStep.value
      reset()
    }
  }
  frame = requestAnimationFrame(animate)
}
function turn(value: number) {
  if (busy.value || !canTurn(value)) return
  direction.value = value > 0 ? 1 : -1
  tilt.value = 0.2
  progress.value = 0
  settle(true)
}
function down(event: PointerEvent) {
  if (
    busy.value ||
    !event.isPrimary ||
    event.button !== 0 ||
    (event.target as HTMLElement).closest('a,button,input,textarea,select')
  )
    return
  suppressClick = false
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    started: false,
  }
}
function move(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId || phase.value === 'settling') return
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  if (!gesture.started) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return
    if (Math.abs(dy) > Math.abs(dx)) {
      gesture = undefined
      return
    }
    direction.value = dx < 0 ? 1 : -1
    if (!canTurn(direction.value)) {
      gesture = undefined
      return
    }
    gesture.started = true
    suppressClick = true
    phase.value = 'dragging'
    book.value?.setPointerCapture(event.pointerId)
    const rect = book.value!.getBoundingClientRect()
    tilt.value = gesture.y - rect.top < rect.height / 2 ? -0.22 : 0.22
    window.getSelection()?.removeAllRanges()
  }
  event.preventDefault()
  progress.value = Math.max(0, Math.min(1, (-dx * direction.value) / (pageWidth.value * 1.45)))
}
function up(event: PointerEvent, cancelled = false) {
  if (!gesture || gesture.id !== event.pointerId) return
  const current = gesture
  gesture = undefined
  if (book.value?.hasPointerCapture(event.pointerId))
    book.value.releasePointerCapture(event.pointerId)
  if (!current.started) {
    tapEdge(current, event, cancelled)
    return
  }
  const distance = (current.x - event.clientX) * direction.value
  const velocity = distance / Math.max(1, performance.now() - current.time)
  settle(!cancelled && (progress.value > 0.32 || (distance > 45 && velocity > 0.45)))
}
/** A quick tap on the outer edge of the spread turns the page, like on an e-reader. */
function tapEdge(
  start: { x: number; y: number; time: number },
  event: PointerEvent,
  cancelled: boolean,
) {
  if (cancelled || !book.value || busy.value) return
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
  if (moved > 6 || performance.now() - start.time > 350) return
  const rect = book.value.getBoundingClientRect()
  const edge = (event.clientX - rect.left) / rect.width
  if (edge < 0.12) turn(-1)
  else if (edge > 0.88) turn(1)
}
function click(event: MouseEvent) {
  if (suppressClick) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }
}
function key(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    turn(event.key === 'ArrowRight' ? 1 : -1)
  }
}
watch(
  () => props.pages,
  () => {
    reset()
    index.value = 0
  },
)
watch(
  [() => props.pages, () => props.materials],
  () => {
    const urls = new Set(props.pages.map((page) => journalImageUrl(page.image_url)).filter(Boolean))
    for (const url of urls) {
      if (imagePreloads.has(url)) continue
      const preload = new Image()
      preload.decoding = 'async'
      preload.src = url
      imagePreloads.set(url, preload)
    }
  },
  { immediate: true },
)
onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  window.addEventListener('keydown', key)
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    const single = window.innerWidth <= 700
    if (width.value !== entry.contentRect.width || mobile.value !== single) {
      reset()
      mobile.value = single
      index.value = single ? index.value : normalizeDesktopReaderIndex(index.value)
      width.value = entry.contentRect.width
    }
    height.value = entry.contentRect.height
  })
  if (book.value) observer.observe(book.value)
})
onBeforeUnmount(() => {
  reset()
  observer?.disconnect()
  window.removeEventListener('keydown', key)
  imagePreloads.clear()
})
</script>

<template>
  <div
    class="curl-reader"
    :data-theme="preferences.theme"
    :style="{ '--reader-font-scale': preferences.fontScale }"
  >
    <div class="reader-settings" role="group" aria-label="Настройки чтения">
      <span class="reader-settings-group" role="radiogroup" aria-label="Тема">
        <button
          v-for="theme in themes"
          :key="theme.id"
          type="button"
          role="radio"
          :aria-checked="preferences.theme === theme.id"
          :class="{ active: preferences.theme === theme.id }"
          @click="preferences.theme = theme.id"
        >
          {{ theme.label }}
        </button>
      </span>
      <span class="reader-settings-group" role="radiogroup" aria-label="Размер текста">
        <button
          v-for="(scale, step) in FONT_SCALES"
          :key="scale"
          type="button"
          role="radio"
          :aria-checked="preferences.fontScale === scale"
          :class="{ active: preferences.fontScale === scale }"
          :aria-label="`Размер текста ${step + 1} из ${FONT_SCALES.length}`"
          :title="`Размер текста ${step + 1} из ${FONT_SCALES.length}`"
          :style="{ fontSize: `${12 + step * 3}px` }"
          @click="preferences.fontScale = scale"
        >
          A
        </button>
      </span>
      <button
        type="button"
        class="reader-sound"
        :class="{ active: preferences.sound }"
        :aria-pressed="preferences.sound"
        @click="preferences.sound = !preferences.sound"
      >
        {{ preferences.sound ? '🔊 Звук листания' : '🔈 Звук выключен' }}
      </button>
    </div>
    <p class="curl-help">Потяните страницу мышью или пальцем · тап по краю · ← → на клавиатуре</p>
    <div class="curl-stage">
      <div
        ref="book"
        class="curl-book"
        :class="{ 'is-dragging': phase === 'dragging', 'is-single': mobile, 'is-turning': busy }"
        aria-label="Страницы журнала"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up($event)"
        @pointercancel="up($event, true)"
        @lostpointercapture="up($event, true)"
        @click.capture="click"
        @dragstart.prevent
      >
        <template v-if="mobile">
          <MagazinePage
            v-if="pages[singleIndex]"
            :key="singleIndex"
            :page="pages[singleIndex]!"
            :materials="materials"
            :number="singleIndex + 1"
          />
        </template>
        <template v-else-if="coverMode">
          <MagazinePage
            v-if="pages[0]"
            class="curl-cover-page"
            :page="pages[0]!"
            :materials="materials"
            :number="1"
          />
        </template>
        <template v-else>
          <MagazinePage
            v-if="pages[leftIndex]"
            :key="leftIndex"
            :page="pages[leftIndex]!"
            :materials="materials"
            :number="leftIndex + 1"
          />
          <MagazinePage
            v-if="pages[rightIndex]"
            :key="rightIndex"
            :page="pages[rightIndex]!"
            :materials="materials"
            :number="rightIndex + 1"
          />
          <div v-else class="curl-end">ION PULSE<small>До следующего месяца.</small></div>
        </template>
        <div
          v-if="busy"
          class="curl-overlay"
          :class="{ 'is-backward': direction < 0 }"
          aria-hidden="true"
          inert
        >
          <div class="curl-sheet" :style="sheetStyle">
            <div class="curl-front" :style="{ clipPath: curl.frontClip }">
              <div class="curl-content">
                <MagazinePage
                  v-if="pages[frontIndex]"
                  :page="pages[frontIndex]!"
                  :materials="materials"
                  :number="frontIndex + 1"
                />
              </div>
              <div class="curl-front-shade" />
            </div>
            <div
              class="curl-shadow"
              :style="{
                filter: `drop-shadow(${-6 * curl.lift}px ${9 * curl.lift}px ${12 * curl.lift}px #17150f66)`,
              }"
            >
              <div
                class="curl-back"
                :style="{ clipPath: curl.backClip, transform: curl.reflection }"
              >
                <div class="curl-back-content">
                  <div class="curl-content">
                    <MagazinePage
                      v-if="pages[backIndex]"
                      :page="pages[backIndex]!"
                      :materials="materials"
                      :number="backIndex + 1"
                    />
                  </div>
                </div>
                <div class="curl-back-shade" />
              </div>
            </div>
          </div>
        </div>
        <span v-if="!busy && next" class="curl-corner" aria-hidden="true">↶</span>
      </div>
    </div>
    <nav class="monthly-reader-bar" aria-label="Страницы">
      <button class="button button-secondary" :disabled="!previous || busy" @click="turn(-1)">
        ← Назад
      </button>
      <span aria-live="polite">
        {{ range[0] }}<template v-if="range[1] !== range[0]">–{{ range[1] }}</template> /
        {{ pages.length }}
      </span>
      <button class="button button-primary" :disabled="!next || busy" @click="turn(1)">
        Далее →
      </button>
    </nav>
  </div>
</template>
<style>
.reader-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: center;
  margin-bottom: 10px;
}
.reader-settings-group {
  display: inline-flex;
  border: 1px solid #fff3;
  border-radius: 999px;
  overflow: hidden;
}
.reader-settings button {
  min-width: 36px;
  padding: 5px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.reader-settings button.active {
  background: #c5ef58;
  color: #151711;
}
.reader-sound {
  border: 1px solid #fff3 !important;
  border-radius: 999px;
}
.curl-reader .magazine-copy {
  font-size: calc(14px * var(--reader-font-scale, 1)) !important;
}
.curl-reader[data-theme='sepia'] .curl-book {
  filter: sepia(0.55) saturate(0.9) brightness(0.97);
}
.curl-reader[data-theme='night'] .curl-book {
  filter: invert(0.9) hue-rotate(180deg) brightness(0.9);
}
.curl-reader[data-theme='night'] .curl-book img {
  filter: invert(1) hue-rotate(180deg);
}
.curl-help {
  font-size: 13px;
  color: #a4ab9e;
  text-align: right;
  margin: 0 0 18px;
}
.curl-stage {
  padding: 36px 18px;
  background: radial-gradient(ellipse at 50% 30%, #4b5343, #171e1a 85%);
  border-radius: 12px;
  overflow: hidden;
}
.curl-book {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  aspect-ratio: 132 / 85;
  height: auto;
  max-width: 1320px;
  margin: auto;
  isolation: isolate;
  box-shadow:
    0 2px 0 #dad3bf,
    0 5px 0 #777465,
    0 8px 0 #c5bfad,
    0 25px 50px #0007;
  touch-action: pan-y;
  cursor: grab;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.curl-book.is-dragging {
  cursor: grabbing;
}
.curl-book.is-turning > .magazine-page {
  pointer-events: none;
}
.curl-book > .magazine-page:first-child {
  box-shadow: inset -18px 0 26px #30271420;
}
.curl-book > .magazine-page:nth-child(2) {
  box-shadow: inset 14px 0 22px #3027141c;
}
.curl-book > .curl-cover-page {
  grid-column: 1 / -1;
  width: 50%;
  justify-self: end;
  box-shadow: 0 25px 50px #0008;
}
.curl-end {
  display: grid;
  place-content: center;
  gap: 16px;
  background: #eee8d7;
  color: #20251f;
  text-align: center;
  font: 40px Georgia;
}
.curl-end small {
  font-size: 16px;
}
.curl-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.curl-overlay.is-backward {
  transform: scaleX(-1);
}
.curl-sheet {
  position: absolute;
  left: 50%;
  top: 0;
}
.curl-front,
.curl-back,
.curl-shadow,
.curl-content,
.curl-back-content {
  position: absolute;
  inset: 0;
}
.curl-front,
.curl-back {
  background: #f5f0df;
}
.curl-back {
  transform-origin: 0 0;
  will-change: transform, clip-path;
}
.curl-front {
  will-change: clip-path;
}
.curl-back-content {
  transform: scaleX(-1);
}
.is-backward .curl-content {
  transform: scaleX(-1);
}
.curl-front-shade,
.curl-back-shade {
  position: absolute;
  top: -50%;
  height: 200%;
  transform-origin: 50% 50%;
  transform: rotate(var(--crease-angle));
  pointer-events: none;
  opacity: var(--curl-lift);
}
.curl-front-shade {
  left: calc(var(--crease) - 70px);
  width: 70px;
  background: linear-gradient(90deg, transparent, #29251b0a 35%, #29251b30 95%, #fff5);
}
.curl-back-shade {
  left: calc(var(--crease) - 1px);
  width: 125px;
  background: linear-gradient(90deg, #27251c65, #514b3740 12%, #fff9 43%, #fff3 65%, transparent);
}
.curl-corner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  padding: 14px 5px 0 18px;
  background: linear-gradient(135deg, transparent 48%, #d4cbb4 50%, #fffbec 75%);
  color: #675f4b;
  opacity: 0.5;
  transition: opacity 0.2s;
  pointer-events: none;
}
.curl-book:hover .curl-corner {
  opacity: 1;
}
.curl-book.is-single {
  grid-template-columns: 1fr;
  aspect-ratio: 66 / 85;
  overflow: hidden;
}
.is-single .curl-sheet {
  left: 0;
}
@media (max-width: 700px) {
  .curl-stage {
    padding: 12px 6px 20px;
  }
  .curl-help {
    text-align: left;
    line-height: 1.6;
  }
  .curl-book {
    height: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .curl-corner {
    transition: none;
  }
}
</style>
