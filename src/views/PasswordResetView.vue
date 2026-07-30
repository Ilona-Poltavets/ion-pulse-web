<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { requestPasswordReset, resetPassword } from '@/services/api'

const props = defineProps<{ mode: 'request' | 'confirm' }>()
const route = useRoute()
const router = useRouter()
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
    error.value = 'Пароли не совпадают'
    return
  }
  try {
    isSaving.value = true
    if (props.mode === 'request') {
      await requestPasswordReset(email.value)
      message.value = 'Если такой аккаунт существует, ссылка для восстановления уже отправлена.'
    } else {
      if (!token.value) {
        error.value = 'В ссылке восстановления отсутствует токен'
        return
      }
      await resetPassword({ token: token.value, password: password.value })
      await router.replace('/login')
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Не удалось восстановить доступ'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">ACCOUNT RECOVERY</p>
      <h1>{{ mode === 'request' ? 'Восстановить доступ' : 'Новый пароль' }}</h1>
      <p v-if="mode === 'request'">
        Введите email аккаунта. Мы отправим одноразовую ссылку, если адрес зарегистрирован.
      </p>
      <p v-else>
        Задайте новый пароль. После сохранения потребуется войти заново на всех устройствах.
      </p>
      <label v-if="mode === 'request'">
        Email<input v-model.trim="email" required type="email" autocomplete="email" />
      </label>
      <template v-else>
        <label>
          Новый пароль<input
            v-model="password"
            required
            type="password"
            minlength="12"
            autocomplete="new-password"
          />
        </label>
        <label>
          Повторите пароль<input
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
            ? 'Подождите…'
            : mode === 'request'
              ? 'Отправить ссылку'
              : 'Сохранить новый пароль'
        }}
      </button>
      <RouterLink class="auth-link" to="/login">Вернуться ко входу</RouterLink>
    </form>
  </section>
</template>
