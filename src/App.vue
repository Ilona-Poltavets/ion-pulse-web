<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { locale, t } = useI18n()
const auth = useAuthStore()

const nextLocale = computed<SupportedLocale>(() => (locale.value === 'ru' ? 'en' : 'ru'))

function setLocale(next: SupportedLocale): void {
  locale.value = next
  document.documentElement.lang = next
  localStorage.setItem('ion-pulse-locale', next)
}

void auth.restore()
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

      <div class="header-actions">
        <RouterLink v-if="!auth.isAuthenticated" class="account-link" to="/login">Войти</RouterLink>
        <RouterLink v-else class="account-link" to="/profile">{{
          auth.user?.display_name
        }}</RouterLink>
        <RouterLink
          v-if="auth.user?.roles.includes('administrator')"
          class="account-link"
          to="/admin/author-applications"
          >Админ</RouterLink
        >
        <RouterLink
          v-if="auth.user?.roles.includes('editor') || auth.user?.roles.includes('administrator')"
          class="account-link"
          to="/editorial-queue"
          >Редактор</RouterLink
        >
        <button
          v-if="auth.isAuthenticated"
          class="account-link"
          type="button"
          @click="auth.signOut"
        >
          Выйти
        </button>
        <button class="locale-switcher" type="button" @click="setLocale(nextLocale)">
          <span>{{ locale.toUpperCase() }}</span>
          <span aria-hidden="true">→</span>
          <strong>{{ nextLocale.toUpperCase() }}</strong>
        </button>
      </div>
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
