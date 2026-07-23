<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ mode: 'login' | 'register' }>()
const router = useRouter()
const auth = useAuthStore()
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
    error.value = reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
  }
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">ION PULSE ACCOUNT</p>
      <h1>{{ mode === 'register' ? 'Создать аккаунт' : 'Войти' }}</h1>
      <p>
        {{
          mode === 'register'
            ? 'Публикуйте и обсуждайте игры на двух языках.'
            : 'Рады видеть вас снова.'
        }}
      </p>
      <label v-if="mode === 'register'"
        >Имя пользователя<input
          v-model.trim="displayName"
          required
          minlength="2"
          maxlength="80"
          pattern="[A-Za-z0-9_-]+"
      /></label>
      <label>Email<input v-model.trim="email" required type="email" autocomplete="email" /></label>
      <label
        >Пароль<input
          v-model="password"
          required
          type="password"
          minlength="12"
          autocomplete="current-password"
      /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="button button-primary" :disabled="auth.isLoading">
        {{ auth.isLoading ? 'Подождите…' : mode === 'register' ? 'Зарегистрироваться' : 'Войти' }}
      </button>
      <RouterLink class="auth-link" :to="mode === 'register' ? '/login' : '/register'">{{
        mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'
      }}</RouterLink>
    </form>
  </section>
</template>
