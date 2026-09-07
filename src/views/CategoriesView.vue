<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listManageableCategories, updateCategory, type ManagedCategory } from '@/services/api'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()
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
    message.value = t('categoryManagement.saved')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('categoryManagement.saveError')
  }
}
</script>
<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">{{ t('categoryManagement.eyebrow') }}</p>
        <h1>{{ t('categoryManagement.title') }}</h1>
      </div>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <div class="category-manager">
      <details v-for="category in categories" :key="category.slug" class="category-editor">
        <summary>
          <span class="category-color" :style="{ backgroundColor: category.color }"></span>
          <span
            ><strong>{{ category.name_ru }}</strong
            ><small>{{ category.name_en }} · {{ category.slug }}</small></span
          >
          <span class="category-state"
            >{{
              category.is_visible
                ? t('categoryManagement.visibleState')
                : t('categoryManagement.hiddenState')
            }}
            · {{ category.sort_order }}</span
          >
        </summary>
        <form @submit.prevent="save(category)">
          <label>{{ t('categoryManagement.nameRu') }}<input v-model="category.name_ru" /></label>
          <label>{{ t('categoryManagement.nameEn') }}<input v-model="category.name_en" /></label>
          <label class="wide"
            >{{ t('categoryManagement.descriptionRu')
            }}<textarea v-model="category.description_ru" rows="2" />
          </label>
          <label class="wide"
            >{{ t('categoryManagement.descriptionEn')
            }}<textarea v-model="category.description_en" rows="2" />
          </label>
          <label
            >{{ t('categoryManagement.color')
            }}<span class="color-control"
              ><input v-model="category.color" type="color" /><input
                v-model="category.color"
                pattern="#[0-9A-Fa-f]{6}" /></span
          ></label>
          <label
            >{{ t('categoryManagement.sortOrder')
            }}<input v-model.number="category.sort_order" type="number" min="0"
          /></label>
          <label class="checkbox-label wide"
            ><input v-model="category.is_visible" type="checkbox" />{{
              t('categoryManagement.visible')
            }}</label
          >
          <div class="wide category-save">
            <button class="button button-primary">{{ t('categoryManagement.save') }}</button>
          </div>
        </form>
      </details>
    </div>
  </section>
</template>

<style scoped>
.category-manager {
  display: grid;
  gap: 10px;
  padding-top: 24px;
}
.category-editor {
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.category-editor[open] {
  border-color: rgb(199 255 94 / 35%);
}
.category-editor summary {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  cursor: pointer;
  list-style: none;
}
.category-editor summary::-webkit-details-marker {
  display: none;
}
.category-editor summary > span:nth-child(2) {
  display: grid;
  gap: 2px;
}
.category-editor summary small,
.category-state {
  color: var(--muted);
  font-size: 12px;
}
.category-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(255 255 255 / 5%);
}
.category-editor form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  border-top: 1px solid var(--line);
}
.category-editor label {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
}
.category-editor input,
.category-editor textarea {
  width: 100%;
  padding: 10px 12px;
  color: var(--text);
  background: var(--background);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}
.category-editor textarea {
  min-height: 68px;
  resize: vertical;
}
.category-editor .wide {
  grid-column: 1 / -1;
}
.category-editor .checkbox-label {
  display: flex;
  align-items: center;
}
.category-editor .checkbox-label input {
  width: auto;
}
.color-control {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
}
.color-control input[type='color'] {
  height: 42px;
  padding: 4px;
  cursor: pointer;
}
.category-save {
  display: flex;
  justify-content: flex-end;
}
.category-save .button {
  min-width: 150px;
}
@media (max-width: 650px) {
  .category-editor form {
    grid-template-columns: 1fr;
  }
  .category-editor form > * {
    grid-column: 1 !important;
  }
  .category-state {
    display: none;
  }
}
</style>
