<script setup lang="ts">
import ContentBody from '@/components/content/ContentBody.vue'
import { computed } from 'vue'
import type { JournalCandidate, JournalPage } from '@/services/api'
const props = defineProps<{ page: JournalPage; materials: JournalCandidate[]; number: number }>()
const stories = computed(() =>
  props.page.publication_ids
    .map((id) => props.materials.find((item) => item.id === id))
    .filter((item) => !!item),
)
</script>
<template>
  <article
    class="magazine-page"
    :class="`magazine-page--${page.template}`"
    :style="{ '--ink-accent': page.accent }"
  >
    <header class="magazine-running"><b>ION / PULSE</b><span>THE MONTHLY EDITION</span></header>
    <div class="magazine-paper-content">
      <img v-if="page.image_url" class="magazine-photo" :src="page.image_url" alt="" />
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
      <ContentBody v-if="page.text && stories.length > 1" class="magazine-copy" :body="page.text" />
    </div>
    <footer class="magazine-running">
      <span>KEEP READING. STAY CURIOUS.</span><b>{{ String(number).padStart(2, '0') }}</b>
    </footer>
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
  max-height: 260px;
  object-fit: cover;
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
