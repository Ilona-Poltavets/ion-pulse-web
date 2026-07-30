<script setup lang="ts">
import { ref } from 'vue'

import { submitCurrentSanctionAppeal } from '@/services/api'

const email = ref('')
const password = ref('')
const reason = ref('')
const error = ref('')
const message = ref('')
const isSaving = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  try {
    isSaving.value = true
    await submitCurrentSanctionAppeal({
      email: email.value,
      password: password.value,
      reason: reason.value,
    })
    message.value = 'Обращение отправлено модератору.'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось отправить обращение'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">SANCTION APPEAL</p>
      <h1>Обжаловать блокировку</h1>
      <p>Подтвердите аккаунт и объясните, почему ограничение стоит пересмотреть.</p>
      <label>Email<input v-model.trim="email" required type="email" autocomplete="email" /></label>
      <label
        >Пароль<input v-model="password" required type="password" autocomplete="current-password"
      /></label>
      <label
        >Причина<textarea v-model.trim="reason" required minlength="10" maxlength="2000" />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <p v-if="message" class="dashboard-message">{{ message }}</p>
      <button class="button button-primary" :disabled="isSaving">Отправить обращение</button>
      <RouterLink class="auth-link" to="/login">Вернуться ко входу</RouterLink>
    </form>
  </section>
</template>
