<script setup lang="ts">
import ContentBody from '@/components/content/ContentBody.vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import type { JournalCandidate, JournalPage } from '@/services/api'
const props = defineProps<{
  page: JournalPage
  materials: JournalCandidate[]
  number: number
  editable?: boolean
}>()
const emit = defineEmits<{ textPosition: [position: { x: number; y: number }] }>()
const pageElement = ref<HTMLElement>()
let drag: { pointerId: number; offsetX: number; offsetY: number } | undefined
const stories = computed(() =>
  props.page.publication_ids
    .map((id) => props.materials.find((item) => item.id === id))
    .filter((item) => !!item),
)
const photoStyle = computed(() => ({
  width: `${props.page.image_width ?? 100}%`,
  height: `${props.page.image_height ?? 38}%`,
}))
const coverTextStyle = computed(() => ({
  left: `${props.page.text_x ?? 8}%`,
  top: `${props.page.text_y ?? 58}%`,
  width: `${props.page.text_width ?? 84}%`,
  fontSize: `${props.page.text_size ?? 54}px`,
}))
function startTextDrag(event: PointerEvent): void {
  if (!props.editable || !pageElement.value) return
  const target = event.currentTarget as HTMLElement
  const targetRect = target.getBoundingClientRect()
  drag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - targetRect.left,
    offsetY: event.clientY - targetRect.top,
  }
  target.setPointerCapture(event.pointerId)
}
function moveText(event: PointerEvent): void {
  if (!drag || drag.pointerId !== event.pointerId || !pageElement.value) return
  const rect = pageElement.value.getBoundingClientRect()
  emit('textPosition', {
    x: Math.round(
      Math.max(0, Math.min(80, ((event.clientX - rect.left - drag.offsetX) / rect.width) * 100)),
    ),
    y: Math.round(
      Math.max(0, Math.min(85, ((event.clientY - rect.top - drag.offsetY) / rect.height) * 100)),
    ),
  })
}
function endTextDrag(event: PointerEvent): void {
  if (drag?.pointerId === event.pointerId) drag = undefined
}
onBeforeUnmount(() => {
  drag = undefined
})
</script>
<template>
  <article
    ref="pageElement"
    class="magazine-page"
    :class="`magazine-page--${page.template}`"
    :style="{ '--ink-accent': page.accent }"
  >
    <template v-if="page.template === 'cover'">
      <img v-if="page.image_url" class="magazine-cover-photo" :src="page.image_url" alt="" />
      <div class="magazine-cover-shade"></div>
      <div class="magazine-cover-brand">ION / PULSE <small>THE MONTHLY EDITION</small></div>
      <div
        class="magazine-cover-copy"
        :class="{ editable }"
        :style="coverTextStyle"
        @pointerdown="startTextDrag"
        @pointermove="moveText"
        @pointerup="endTextDrag"
        @pointercancel="endTextDrag"
      >
        <h2 v-if="page.heading">{{ page.heading }}</h2>
        <ContentBody v-if="page.text" :body="page.text" />
      </div>
    </template>
    <template v-else>
      <header class="magazine-running"><b>ION / PULSE</b><span>THE MONTHLY EDITION</span></header>
      <div class="magazine-paper-content" :class="`image-${page.image_position || 'full'}`">
        <img
          v-if="page.image_url"
          class="magazine-photo"
          :style="photoStyle"
          :src="page.image_url"
          alt=""
        />
        <h2 v-if="page.heading" class="magazine-heading">{{ page.heading }}</h2>
        <div class="magazine-stories">
          <section v-for="story in stories" :key="story.id" class="magazine-story">
            <small>{{ story.category_slug }}</small>
            <h2 v-if="!page.heading || stories.length > 1">{{ story.title }}</h2>
            <p class="magazine-deck">{{ story.summary }}</p>
            <ContentBody
              class="magazine-copy"
              :body="page.text && stories.length === 1 ? page.text : story.body"
            />
            <RouterLink :to="`/publications/${story.id}`">↗ {{ story.title }}</RouterLink>
          </section>
        </div>
        <ContentBody
          v-if="page.text && stories.length > 1"
          class="magazine-copy"
          :body="page.text"
        />
      </div>
      <footer class="magazine-running">
        <span>KEEP READING. STAY CURIOUS.</span><b>{{ String(number).padStart(2, '0') }}</b>
      </footer>
    </template>
  </article>
</template>
<style>
.magazine-page {
  --ink-accent: #c5ef58;
  background: #f5f0df;
  color: #23251f;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  padding: 24px;
  box-sizing: border-box;
  font-family: Georgia, serif;
  box-shadow: inset 12px 0 22px #32281812;
  position: relative;
  overflow: hidden;
}
.magazine-running {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font: 10px/1.4 monospace;
  letter-spacing: 1px;
  border-bottom: 2px solid;
  padding-bottom: 10px;
}
.magazine-running:last-child {
  border: 0;
  border-top: 1px solid;
  padding: 10px 0 0;
  margin-top: auto;
}
.magazine-paper-content {
  overflow: auto;
  flex: 1;
  padding: 18px 0;
  min-height: 0;
}
.magazine-heading,
.magazine-story h2 {
  font-size: clamp(22px, 2.5vw, 42px);
  line-height: 1.04;
  margin: 12px 0;
  overflow-wrap: anywhere;
}
.magazine-story small {
  font: 11px monospace;
  text-transform: uppercase;
  background: var(--ink-accent);
  color: #20221c;
  padding: 4px 8px;
}
.magazine-deck {
  font-size: 17px;
  font-style: italic;
  line-height: 1.5;
}
.magazine-copy {
  font-size: 14px;
  line-height: 1.65;
  white-space: normal;
  overflow-wrap: anywhere;
}
.magazine-story a {
  display: block;
  font: 11px/1.4 monospace;
  color: inherit;
  margin: 18px 0;
}
.magazine-photo {
  width: 100%;
  object-fit: cover;
}
.magazine-paper-content.image-left .magazine-photo {
  float: left;
  margin: 0 18px 12px 0;
}
.magazine-paper-content.image-right .magazine-photo {
  float: right;
  margin: 0 0 12px 18px;
}
.magazine-paper-content.image-background .magazine-photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100% !important;
  height: 100% !important;
  opacity: 0.25;
}
.magazine-paper-content.image-background > :not(.magazine-photo) {
  position: relative;
  z-index: 1;
}
.magazine-cover-photo,
.magazine-cover-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.magazine-cover-photo {
  object-fit: cover;
}
.magazine-cover-shade {
  background: linear-gradient(180deg, #10110f22 20%, #10110fcc 100%);
}
.magazine-cover-brand {
  position: absolute;
  top: 5%;
  left: 7%;
  right: 7%;
  display: flex;
  justify-content: space-between;
  color: #fff;
  font: 800 22px/1 sans-serif;
  letter-spacing: -1px;
}
.magazine-cover-brand small {
  font: 9px/1.4 monospace;
  letter-spacing: 1px;
}
.magazine-cover-copy {
  position: absolute;
  z-index: 1;
  color: #fff;
  line-height: 1.05;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 18px #0009;
}
.magazine-cover-copy h2 {
  margin: 0 0 0.3em;
  font: inherit;
  font-weight: 800;
}
.magazine-cover-copy .content-prose {
  font-size: 0.42em;
  line-height: 1.35;
}
.magazine-cover-copy.editable {
  cursor: move;
  touch-action: none;
  outline: 1px dashed #fff8;
  outline-offset: 8px;
}
.magazine-page--columns .magazine-copy {
  column-count: 2;
  column-gap: 22px;
}
.magazine-page--feature .magazine-copy:first-letter {
  float: left;
  font-size: 58px;
  line-height: 1;
  padding-right: 8px;
}
.magazine-page--interview .magazine-deck {
  border-left: 5px solid var(--ink-accent);
  padding: 16px;
  font-size: 24px;
}
.magazine-page--interview .magazine-copy {
  border-top: 1px solid;
  padding-top: 15px;
}
.magazine-page--briefs .magazine-stories {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.magazine-page--briefs .magazine-story {
  border-top: 5px solid var(--ink-accent);
  padding-top: 14px;
}
.magazine-page--briefs .magazine-story h2 {
  font-size: 22px;
}
.magazine-page--poster {
  background: #20251f;
  color: #f5f0df;
}
.magazine-page--poster .magazine-heading,
.magazine-page--poster .magazine-story h2 {
  color: var(--ink-accent);
  font-size: clamp(32px, 4vw, 64px);
  text-transform: uppercase;
}
@media (max-width: 600px) {
  .magazine-page {
    padding: 16px;
  }
  .magazine-page--columns .magazine-copy {
    column-count: 1;
  }
}
</style>
