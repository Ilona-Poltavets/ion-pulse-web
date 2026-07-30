<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ mode: 'login' | 'register' }>()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const email = ref('')
const displayName = ref('')
const password = ref('')
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  try {
    if (props.mode === 'register')
      await auth.signUp({
        email: email.value,
        display_name: displayName.value,
        password: password.value,
      })
    else await auth.signIn({ email: email.value, password: password.value })
    await router.push('/')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('auth.actionError')
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">{{ t('auth.account') }}</p>
      <h1>{{ mode === 'register' ? t('auth.registerTitle') : t('auth.loginTitle') }}</h1>
      <p>
        {{
          mode === 'register'
            ? t('auth.registerIntro')
            : t('auth.loginIntro')
        }}
      </p>
      <label v-if="mode === 'register'"
        >{{ t('auth.displayName') }}<input
          v-model.trim="displayName"
          required
          minlength="2"
          maxlength="80"
          pattern="[A-Za-z0-9_-]+"
      /></label>
      <label>Email<input v-model.trim="email" required type="email" autocomplete="email" /></label>
      <label
        >{{ t('auth.password') }}<input
          v-model="password"
          required
          type="password"
          minlength="12"
          autocomplete="current-password"
      /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="button button-primary" :disabled="auth.isLoading">
        {{ auth.isLoading ? t('auth.pleaseWait') : mode === 'register' ? t('auth.registerAction') : t('auth.loginAction') }}
      </button>
      <RouterLink v-if="mode === 'login'" class="auth-link" to="/password-reset">
        {{ t('auth.forgotPassword') }}
      </RouterLink>
      <RouterLink v-if="mode === 'login'" class="auth-link" to="/sanction-appeal">
        {{ t('auth.appeal') }}
      </RouterLink>
      <RouterLink class="auth-link" :to="mode === 'register' ? '/login' : '/register'">{{
        mode === 'register' ? t('auth.hasAccount') : t('auth.noAccount')
      }}</RouterLink>
    </form>
  </section>
</template>
