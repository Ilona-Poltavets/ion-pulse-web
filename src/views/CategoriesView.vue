<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listManageableCategories, updateCategory, type ManagedCategory } from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const categories = ref<ManagedCategory[]>([])
const message = ref('')

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (
    !auth.user ||
    !auth.user.roles.some((role) => role === 'content_manager' || role === 'administrator')
  ) {
    await router.replace('/')
    return
  }
  categories.value = await listManageableCategories()
})

async function save(category: ManagedCategory): Promise<void> {
  try {
    await updateCategory(category.slug, {
      name_ru: category.name_ru,
      name_en: category.name_en,
      description_ru: category.description_ru,
      description_en: category.description_en,
      color: category.color,
      sort_order: category.sort_order,
      is_visible: category.is_visible,
    })
    message.value = 'Категория сохранена'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось сохранить категорию'
  }
}
</script>
<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">CONTENT MANAGEMENT</p>
        <h1>Категории</h1>
      </div>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <div class="queue-list">
      <form
        v-for="category in categories"
        :key="category.slug"
        class="dashboard-card"
        @submit.prevent="save(category)"
      >
        <p class="eyebrow">{{ category.slug }}</p>
        <label>Название (RU)<input v-model="category.name_ru" /></label>
        <label>Название (EN)<input v-model="category.name_en" /></label>
        <label>Описание (RU)<textarea v-model="category.description_ru" /></label>
        <label>Описание (EN)<textarea v-model="category.description_en" /></label>
        <label>Цвет<input v-model="category.color" pattern="#[0-9A-Fa-f]{6}" /></label>
        <label>Порядок<input v-model.number="category.sort_order" type="number" min="0" /></label>
        <label class="checkbox-label">
          <input v-model="category.is_visible" type="checkbox" /> Показывать в публичном каталоге
        </label>
        <button class="button button-primary">Сохранить</button>
      </form>
    </div>
  </section>
</template>
