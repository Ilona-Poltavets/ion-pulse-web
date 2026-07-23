<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
const displayName = ref('')
const message = ref('')
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user) {
    await router.replace('/login')
    return
  }
  displayName.value = auth.user.display_name
})
async function save(): Promise<void> {
  try {
    await auth.update({ display_name: displayName.value })
    message.value = 'Профиль сохранён'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Ошибка'
  }
}
</script>
<template>
  <section class="auth-page">
    <form v-if="auth.user" class="auth-card" @submit.prevent="save">
      <p class="eyebrow">ION PULSE PROFILE</p>
      <h1>{{ auth.user.display_name }}</h1>
      <p>{{ auth.user.email }}</p>
      <label>Имя пользователя<input v-model.trim="displayName" required minlength="2" /></label>
      <p>Роли: {{ auth.user.roles.length ? auth.user.roles.join(', ') : 'Участник' }}</p>
      <p v-if="message">{{ message }}</p>
      <button class="button button-primary">Сохранить</button>
    </form>
  </section>
</template>
