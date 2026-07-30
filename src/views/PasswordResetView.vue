<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { requestPasswordReset, resetPassword } from '@/services/api'

const props = defineProps<{ mode: 'request' | 'confirm' }>()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const email = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const message = ref('')
const isSaving = ref(false)
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

async function submit(): Promise<void> {
  error.value = ''
  message.value = ''
  if (props.mode === 'confirm' && password.value !== confirmation.value) {
    error.value = t('auth.passwordsMismatch')
    return
  }
  try {
    isSaving.value = true
    if (props.mode === 'request') {
      await requestPasswordReset(email.value)
      message.value = t('auth.recoverySent')
    } else {
      if (!token.value) {
        error.value = t('auth.tokenMissing')
        return
      }
      await resetPassword({ token: token.value, password: password.value })
      await router.replace('/login')
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('auth.recoveryError')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">{{ t('auth.recovery') }}</p>
      <h1>{{ mode === 'request' ? t('auth.recoveryTitle') : t('auth.newPasswordTitle') }}</h1>
      <p v-if="mode === 'request'">
        {{ t('auth.recoveryIntro') }}
      </p>
      <p v-else>
        {{ t('auth.newPasswordIntro') }}
      </p>
      <label v-if="mode === 'request'">
        Email<input v-model.trim="email" required type="email" autocomplete="email" />
      </label>
      <template v-else>
        <label>
          {{ t('auth.newPassword')
          }}<input
            v-model="password"
            required
            type="password"
            minlength="12"
            autocomplete="new-password"
          />
        </label>
        <label>
          {{ t('auth.confirmPassword')
          }}<input
            v-model="confirmation"
            required
            type="password"
            minlength="12"
            autocomplete="new-password"
          />
        </label>
      </template>
      <p v-if="error" class="form-error">{{ error }}</p>
      <p v-if="message" class="dashboard-message">{{ message }}</p>
      <button class="button button-primary" :disabled="isSaving">
        {{
          isSaving
            ? t('auth.pleaseWait')
            : mode === 'request'
              ? t('auth.sendLink')
              : t('auth.savePassword')
        }}
      </button>
      <RouterLink class="auth-link" to="/login">{{ t('auth.backToLogin') }}</RouterLink>
    </form>
  </section>
</template>
