<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createAuthorApplication,
  getAuthorApplication,
  type AuthorApplication,
} from '@/services/api'
const auth = useAuthStore()
const router = useRouter()
const displayName = ref('')
const message = ref('')
const application = ref<AuthorApplication | null>(null)
const motivation = ref('')
const portfolioUrl = ref('')
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user) {
    await router.replace('/login')
    return
  }
  displayName.value = auth.user.display_name
  application.value = await getAuthorApplication()
})
async function save(): Promise<void> {
  try {
    await auth.update({ display_name: displayName.value })
    message.value = 'Профиль сохранён'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Ошибка'
  }
}
async function submitApplication(): Promise<void> {
  try {
    application.value = await createAuthorApplication({
      motivation: motivation.value,
      portfolio_url: portfolioUrl.value || undefined,
    })
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось отправить заявку'
  }
}
</script>
<template>
  <section class="auth-page">
    <div v-if="auth.user" class="auth-card">
      <form @submit.prevent="save">
        <p class="eyebrow">ION PULSE PROFILE</p>
        <h1>{{ auth.user.display_name }}</h1>
        <p>{{ auth.user.email }}</p>
        <label>Имя пользователя<input v-model.trim="displayName" required minlength="2" /></label>
        <p>Роли: {{ auth.user.roles.length ? auth.user.roles.join(', ') : 'Участник' }}</p>
        <p v-if="message">{{ message }}</p>
        <button class="button button-primary">Сохранить</button>
      </form>
      <form
        v-if="!application && !auth.user.roles.includes('author')"
        class="author-application"
        @submit.prevent="submitApplication"
      >
        <p class="eyebrow">AUTHOR APPLICATION</p>
        <h2>Стать автором</h2>
        <label
          >Почему вы хотите писать для Ion Pulse?<textarea
            v-model="motivation"
            required
            minlength="50"
          />
        </label>
        <label>Портфолио (необязательно)<input v-model.trim="portfolioUrl" type="url" /></label>
        <button class="button button-secondary">Отправить заявку</button>
      </form>
      <p v-else-if="application">Заявка на автора: {{ application.status }}</p>
    </div>
  </section>
</template>
