<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  decideAuthorApplication,
  listAuthorApplications,
  type AuthorApplication,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
const applications = ref<AuthorApplication[]>([])
const notes = ref<Record<string, string>>({})
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user?.roles.includes('administrator')) {
    await router.replace('/')
    return
  }
  applications.value = await listAuthorApplications()
})
async function decide(
  application: AuthorApplication,
  status: 'approved' | 'rejected',
): Promise<void> {
  await decideAuthorApplication(application.id, {
    status,
    review_note: notes.value[application.id],
  })
  applications.value = applications.value.filter((item) => item.id !== application.id)
}
</script>
<template>
  <section class="content-section">
    <p class="eyebrow">ADMINISTRATION</p>
    <h2>Заявки авторов</h2>
    <p v-if="!applications.length">Активных заявок нет.</p>
    <article v-for="application in applications" :key="application.id" class="application-card">
      <p>{{ application.motivation }}</p>
      <a
        v-if="application.portfolio_url"
        :href="application.portfolio_url"
        target="_blank"
        rel="noreferrer"
        >Портфолио ↗</a
      ><textarea v-model="notes[application.id]" placeholder="Комментарий к решению" />
      <div>
        <button class="button button-primary" @click="decide(application, 'approved')">
          Одобрить</button
        ><button class="button button-secondary" @click="decide(application, 'rejected')">
          Отклонить
        </button>
      </div>
    </article>
  </section>
</template>
