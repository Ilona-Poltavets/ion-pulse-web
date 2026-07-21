<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/i18n'

const { locale, t } = useI18n()

const nextLocale = computed<SupportedLocale>(() => (locale.value === 'ru' ? 'en' : 'ru'))

function setLocale(next: SupportedLocale): void {
  locale.value = next
  document.documentElement.lang = next
  localStorage.setItem('ion-pulse-locale', next)
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="Ion Pulse">
        <span class="brand-mark" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span>ION PULSE</span>
      </RouterLink>

      <nav class="main-navigation" :aria-label="t('navigation.primary')">
        <RouterLink to="/">{{ t('navigation.feed') }}</RouterLink>
        <a href="#categories">{{ t('navigation.categories') }}</a>
        <a href="#roadmap">{{ t('navigation.roadmap') }}</a>
      </nav>

      <button class="locale-switcher" type="button" @click="setLocale(nextLocale)">
        <span>{{ locale.toUpperCase() }}</span>
        <span aria-hidden="true">→</span>
        <strong>{{ nextLocale.toUpperCase() }}</strong>
      </button>
    </header>

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <span>© {{ new Date().getFullYear() }} Ion Pulse</span>
      <span>{{ t('footer.tagline') }}</span>
    </footer>
  </div>
</template>
