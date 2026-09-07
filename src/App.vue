<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { locale, t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const localeMenu = ref<HTMLDetailsElement | null>(null)

const isStaff = computed(() =>
  auth.user?.roles.some((role) =>
    ['content_manager', 'editor', 'moderator', 'administrator'].includes(role),
  ),
)

function setLocale(next: SupportedLocale): void {
  localeMenu.value?.removeAttribute('open')
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
      <div class="site-header__inner">
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
          <RouterLink to="/journal">{{ t('navigation.journal') }}</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" to="/write">{{
            t('navigation.write')
          }}</RouterLink>
        </nav>

        <div class="header-actions">
          <RouterLink v-if="!auth.isAuthenticated" class="account-link" to="/login">{{
            t('navigation.login')
          }}</RouterLink>
          <RouterLink v-else class="account-link" to="/profile">{{
            auth.user?.display_name
          }}</RouterLink>
          <details v-if="isStaff" class="workspace-menu">
            <summary>{{ t('navigation.workspace') }}</summary>
            <div class="workspace-menu-panel">
              <RouterLink
                v-if="
                  auth.user?.roles.includes('content_manager') ||
                  auth.user?.roles.includes('administrator')
                "
                to="/content/categories"
                >{{ t('navigation.categories') }}</RouterLink
              >
              <RouterLink
                v-if="auth.user?.roles.includes('administrator')"
                to="/admin/author-applications"
                >{{ t('navigation.admin') }}</RouterLink
              >
              <RouterLink v-if="auth.user?.roles.includes('administrator')" to="/admin/users">{{
                t('navigation.roles')
              }}</RouterLink>
              <RouterLink
                v-if="
                  auth.user?.roles.includes('editor') || auth.user?.roles.includes('administrator')
                "
                to="/editorial-queue"
                >{{ t('navigation.editorial') }}</RouterLink
              >
              <RouterLink
                v-if="auth.user?.roles.some((role) => ['editor', 'administrator'].includes(role))"
                to="/journal/candidates"
                >{{ t('navigation.journal') }}</RouterLink
              >
              <RouterLink
                v-if="
                  auth.user?.roles.includes('moderator') ||
                  auth.user?.roles.includes('administrator')
                "
                to="/moderation/reports"
                >{{ t('navigation.moderation') }}</RouterLink
              >
            </div>
          </details>
          <button
            v-if="auth.isAuthenticated"
            class="account-link"
            type="button"
            @click="auth.signOut"
          >
            {{ t('navigation.logout') }}
          </button>
          <details ref="localeMenu" class="locale-switcher">
            <span class="sr-only">{{ t('navigation.language') }}</span>
            <summary :aria-label="t('navigation.language')">
              <span>{{ locale.toUpperCase() }}</span>
            </summary>
            <div class="locale-switcher__menu">
              <button :class="{ active: locale === 'ru' }" type="button" @click="setLocale('ru')">
                <span>RU</span> Русский
              </button>
              <button :class="{ active: locale === 'en' }" type="button" @click="setLocale('en')">
                <span>EN</span> English
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <span>© {{ new Date().getFullYear() }} Ion Pulse</span>
      <span>{{ t('footer.tagline') }}</span>
    </footer>
  </div>
</template>
