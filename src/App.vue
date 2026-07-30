<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { locale, t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const nextLocale = computed<SupportedLocale>(() => (locale.value === 'ru' ? 'en' : 'ru'))

function setLocale(next: SupportedLocale): void {
  locale.value = next
  document.documentElement.lang = next
  localStorage.setItem('ion-pulse-locale', next)
  if (
    (route.name === 'publication' || route.name === 'localized-publication') &&
    typeof route.params.id === 'string'
  ) {
    void router.replace(`/${next}/publications/${route.params.id}`)
  }
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
        <RouterLink to="/#categories">{{ t('navigation.categories') }}</RouterLink>
        <RouterLink to="/journal">Журнал</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/write">{{ t('navigation.write') }}</RouterLink>
      </nav>

      <div class="header-actions">
        <RouterLink v-if="!auth.isAuthenticated" class="account-link" to="/login">{{
          t('navigation.login')
        }}</RouterLink>
        <RouterLink v-else class="account-link" to="/profile">{{
          auth.user?.display_name
        }}</RouterLink>
        <RouterLink
          v-if="
            auth.user?.roles.includes('content_manager') ||
            auth.user?.roles.includes('administrator')
          "
          class="account-link"
          to="/content/categories"
          >Категории</RouterLink
        >
        <RouterLink
          v-if="auth.user?.roles.includes('administrator')"
          class="account-link"
          to="/admin/author-applications"
          >{{ t('navigation.admin') }}</RouterLink
        >
        <RouterLink
          v-if="auth.user?.roles.includes('administrator')"
          class="account-link"
          to="/admin/users"
          >Роли</RouterLink
        >
        <RouterLink
          v-if="auth.user?.roles.includes('editor') || auth.user?.roles.includes('administrator')"
          class="account-link"
          to="/editorial-queue"
          >{{ t('navigation.editorial') }}</RouterLink
        >
        <RouterLink
          v-if="
            auth.user?.roles.some((role) => ['editor', 'moderator', 'administrator'].includes(role))
          "
          class="account-link"
          to="/journal/candidates"
          >Журнал</RouterLink
        >
        <RouterLink
          v-if="
            auth.user?.roles.includes('moderator') || auth.user?.roles.includes('administrator')
          "
          class="account-link"
          to="/moderation/reports"
          >{{ t('navigation.moderation') }}</RouterLink
        >
        <button
          v-if="auth.isAuthenticated"
          class="account-link"
          type="button"
          @click="auth.signOut"
        >
          {{ t('navigation.logout') }}
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
