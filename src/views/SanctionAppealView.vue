<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { submitCurrentSanctionAppeal } from '@/services/api'

const email = ref('')
const password = ref('')
const reason = ref('')
const error = ref('')
const message = ref('')
const isSaving = ref(false)
const { t } = useI18n()

async function submit(): Promise<void> {
  error.value = ''
  try {
    isSaving.value = true
    await submitCurrentSanctionAppeal({
      email: email.value,
      password: password.value,
      reason: reason.value,
    })
    message.value = t('auth.appealSent')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('auth.appealError')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">SANCTION APPEAL</p>
      <h1>{{ t('auth.appealTitle') }}</h1>
      <p>{{ t('auth.appealIntro') }}</p>
      <label>Email<input v-model.trim="email" required type="email" autocomplete="email" /></label>
      <label
        >{{ t('auth.password')
        }}<input v-model="password" required type="password" autocomplete="current-password"
      /></label>
      <label
        >{{ t('auth.reason')
        }}<textarea v-model.trim="reason" required minlength="10" maxlength="2000" />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <p v-if="message" class="dashboard-message">{{ message }}</p>
      <button class="button button-primary" :disabled="isSaving">
        {{ t('auth.submitAppeal') }}
      </button>
      <RouterLink class="auth-link" to="/login">{{ t('auth.backToLogin') }}</RouterLink>
    </form>
  </section>
</template>
