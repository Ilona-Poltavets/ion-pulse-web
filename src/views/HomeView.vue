<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useSystemStatusStore } from '@/stores/systemStatus'

const { t } = useI18n()
const systemStatus = useSystemStatusStore()
const { requestStatus, health } = storeToRefs(systemStatus)
const requestController = new AbortController()

const statusLabel = computed(() => {
  if (requestStatus.value === 'success') return t('status.online')
  if (requestStatus.value === 'error') return t('status.offline')
  return t('status.loading')
})

const categories = computed(() => [
  {
    index: '01',
    name: t('categories.reviews'),
    description: t('categories.reviewsDescription'),
  },
  {
    index: '02',
    name: t('categories.news'),
    description: t('categories.newsDescription'),
  },
  {
    index: '03',
    name: t('categories.guides'),
    description: t('categories.guidesDescription'),
  },
  {
    index: '04',
    name: t('categories.esports'),
    description: t('categories.esportsDescription'),
  },
])

const roadmapItems = computed(() => [
  t('roadmap.items.identity'),
  t('roadmap.items.publishing'),
  t('roadmap.items.translation'),
  t('roadmap.items.community'),
])

onMounted(() => {
  void systemStatus.load(requestController.signal)
})

onBeforeUnmount(() => {
  requestController.abort()
})
</script>

<template>
  <section class="hero-section">
    <div class="hero-copy">
      <p class="eyebrow">{{ t('hero.eyebrow') }}</p>
      <h1>
        {{ t('hero.titleFirst') }}
        <em>{{ t('hero.titleAccent') }}</em>
      </h1>
      <p class="hero-description">{{ t('hero.description') }}</p>

      <div class="hero-actions">
        <a class="button button-primary" href="#roadmap">{{ t('hero.primaryAction') }}</a>
        <a class="button button-secondary" href="#categories">
          {{ t('hero.secondaryAction') }}
        </a>
      </div>
    </div>

    <aside class="translation-card" aria-label="RU to EN translation preview">
      <div class="translation-orbit" aria-hidden="true"></div>
      <div class="translation-block translation-source">
        <span>RU</span>
        <strong>{{ t('hero.original') }}</strong>
        <div class="text-lines" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
      <div class="translation-pulse" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="translation-block translation-target">
        <span>EN</span>
        <strong>{{ t('hero.translation') }}</strong>
        <small>{{ t('hero.translationState') }}</small>
      </div>
    </aside>

    <div class="system-status" :data-state="requestStatus">
      <span class="status-light" aria-hidden="true"></span>
      <span>
        <small>{{ t('status.label') }}</small>
        <strong>{{ statusLabel }}</strong>
      </span>
      <code v-if="health">v{{ health.version }}</code>
    </div>
  </section>

  <section id="categories" class="content-section categories-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('categories.eyebrow') }}</p>
        <h2>{{ t('categories.title') }}</h2>
      </div>
      <p>{{ t('categories.description') }}</p>
    </div>

    <div class="category-grid">
      <article v-for="category in categories" :key="category.index" class="category-card">
        <span>{{ category.index }}</span>
        <h3>{{ category.name }}</h3>
        <p>{{ category.description }}</p>
        <i aria-hidden="true">↗</i>
      </article>
    </div>
  </section>

  <section id="roadmap" class="content-section roadmap-section">
    <div class="roadmap-intro">
      <p class="eyebrow">{{ t('roadmap.eyebrow') }}</p>
      <h2>{{ t('roadmap.title') }}</h2>
    </div>

    <ol class="roadmap-list">
      <li v-for="(item, index) in roadmapItems" :key="item">
        <span>0{{ index + 1 }}</span>
        <strong>{{ item }}</strong>
      </li>
    </ol>
  </section>
</template>
