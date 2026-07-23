<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { decidePublication, listEditorialQueue, type Draft } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const publications = ref<Draft[]>([])
const notes = ref<Record<string, string>>({})
const message = ref('')

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (
    !auth.user ||
    !auth.user.roles.some((role) => role === 'editor' || role === 'administrator')
  ) {
    await router.replace('/')
    return
  }
  try {
    publications.value = await listEditorialQueue()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить очередь'
  }
})

async function decide(
  publication: Draft,
  decision: 'publish' | 'reject' | 'request_changes',
): Promise<void> {
  const note = notes.value[publication.id]?.trim()
  if (!note) {
    message.value = 'Добавьте комментарий к редакционному решению'
    return
  }
  try {
    await decidePublication(publication.id, { decision, note })
    publications.value = publications.value.filter((item) => item.id !== publication.id)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось сохранить решение'
  }
}
</script>

<template>
  <section class="content-section">
    <p class="eyebrow">EDITORIAL DESK</p>
    <h1>Очередь редактора</h1>
    <p v-if="message">{{ message }}</p>
    <p v-if="!publications.length">Материалов на проверке нет.</p>
    <article v-for="publication in publications" :key="publication.id" class="application-card">
      <p class="eyebrow">{{ publication.category_slug }} · {{ publication.source_locale }}</p>
      <h2>{{ publication.title }}</h2>
      <p>{{ publication.summary }}</p>
      <p class="article-body">{{ publication.body }}</p>
      <textarea v-model="notes[publication.id]" placeholder="Комментарий для автора" required />
      <div>
        <button class="button button-primary" @click="decide(publication, 'publish')">
          Опубликовать
        </button>
        <button class="button button-secondary" @click="decide(publication, 'request_changes')">
          На доработку
        </button>
        <button class="button button-secondary" @click="decide(publication, 'reject')">
          Отклонить
        </button>
      </div>
    </article>
  </section>
</template>
