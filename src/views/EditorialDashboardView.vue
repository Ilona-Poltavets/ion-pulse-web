<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createDraft,
  getDiagnostics,
  getEditorialCalendar,
  getEditorialStats,
  listCategories,
  previewLink,
  searchOpenImages,
  type CalendarEntry,
  type Category,
  type EditorialStats,
  type LinkPreview,
  type SystemDiagnostics,
  type OpenImage,
} from '@/services/api'

const auth = useAuthStore()
const allowed = computed(() =>
  auth.user?.roles.some((role) => ['editor', 'content_manager', 'administrator'].includes(role)),
)

// --- calendar
const month = ref(new Date().toISOString().slice(0, 7))
const calendar = ref<CalendarEntry[]>([])
const days = computed(() => {
  const groups = new Map<string, CalendarEntry[]>()
  for (const entry of calendar.value) {
    const day = entry.at.slice(0, 10)
    groups.set(day, [...(groups.get(day) ?? []), entry])
  }
  return [...groups.entries()]
})
// --- stats
const stats = ref<EditorialStats>()
// --- system health (administrators only)
const diagnostics = ref<SystemDiagnostics>()
const isAdministrator = computed(() => auth.user?.roles.includes('administrator'))
function uptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours} ч ${minutes} мин` : `${minutes} мин`
}
// --- link import
const url = ref('')
const preview = ref<LinkPreview>()
const categories = ref<Category[]>([])
const categorySlug = ref('news')
const note = ref('')
const linkBusy = ref(false)
const linkMessage = ref('')
// --- images
const imageQuery = ref('')
const images = ref<OpenImage[]>([])
const imageBusy = ref(false)
const imageMessage = ref('')
const error = ref('')

function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught)
}
function dayLabel(day: string): string {
  return new Date(day + 'T12:00:00Z').toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}
async function loadCalendar(): Promise<void> {
  try {
    calendar.value = await getEditorialCalendar(month.value)
  } catch (caught) {
    error.value = messageOf(caught)
  }
}
async function loadPreview(): Promise<void> {
  linkBusy.value = true
  linkMessage.value = ''
  preview.value = undefined
  try {
    preview.value = await previewLink(url.value.trim())
  } catch (caught) {
    linkMessage.value = messageOf(caught)
  } finally {
    linkBusy.value = false
  }
}
async function createCitationDraft(): Promise<void> {
  if (!preview.value) return
  linkBusy.value = true
  try {
    const source = preview.value
    const summary = (source.description || source.title).slice(0, 500).padEnd(20, '.')
    await createDraft({
      category_slug: categorySlug.value,
      content_type: 'news',
      game_id: null,
      review_score: null,
      source_locale: 'ru',
      title: source.title.slice(0, 240).padEnd(5, '.'),
      summary,
      body:
        `${note.value.trim() || 'Заметка редакции: добавьте свой комментарий.'}\n\n` +
        `Источник: ${source.site_name} — ${source.source_url}`,
    })
    linkMessage.value = 'Черновик с атрибуцией создан. Найдите его в разделе «Мои публикации».'
    preview.value = undefined
    url.value = ''
    note.value = ''
  } catch (caught) {
    linkMessage.value = messageOf(caught)
  } finally {
    linkBusy.value = false
  }
}
async function findImages(): Promise<void> {
  imageBusy.value = true
  imageMessage.value = ''
  try {
    images.value = await searchOpenImages(imageQuery.value.trim())
    if (!images.value.length) imageMessage.value = 'Подходящих свободных изображений не найдено.'
  } catch (caught) {
    imageMessage.value = messageOf(caught)
  } finally {
    imageBusy.value = false
  }
}
async function copyImage(image: OpenImage): Promise<void> {
  const credit = `${image.title} — ${image.author}, ${image.license} (${image.page_url})`
  try {
    await navigator.clipboard.writeText(image.image_url)
    imageMessage.value = `Ссылка скопирована. Подпись: ${credit}`
  } catch {
    imageMessage.value = `Ссылка: ${image.image_url} · Подпись: ${credit}`
  }
}
onMounted(async () => {
  if (!auth.user) await auth.restore().catch(() => undefined)
  if (!allowed.value) return
  await loadCalendar()
  stats.value = await getEditorialStats().catch((caught) => {
    error.value = messageOf(caught)
    return undefined
  })
  categories.value = await listCategories('ru').catch(() => [])
  if (isAdministrator.value) diagnostics.value = await getDiagnostics().catch(() => undefined)
})
watch(month, loadCalendar)
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / РЕДАКЦИЯ</p>
        <h1>Рабочий стол редакции</h1>
      </div>
      <RouterLink class="button button-secondary" to="/journal/candidates"
        >Мастерская журнала</RouterLink
      >
    </header>
    <p v-if="!allowed" class="empty-state">Раздел доступен редакторам и администраторам.</p>
    <template v-else>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <section v-if="diagnostics" class="desk-block" aria-labelledby="desk-health">
        <h2 id="desk-health">Состояние системы</h2>
        <p class="desk-hint">
          {{ diagnostics.service }} {{ diagnostics.version }} · {{ diagnostics.environment }} ·
          работает {{ uptime(diagnostics.uptime_seconds) }} · миграция
          {{ diagnostics.migration_revision ?? '—' }}
        </p>
        <ul class="desk-health">
          <li v-for="check in diagnostics.checks" :key="check.name" :data-ok="check.ok">
            <span aria-hidden="true">{{ check.ok ? '●' : '▲' }}</span>
            <strong>{{ check.name }}</strong>
            <small>{{ check.detail }}</small>
          </li>
        </ul>
        <p class="desk-hint">
          Очереди:
          <template v-for="(states, queue) in diagnostics.queues" :key="queue">
            {{ queue }} —
            {{
              Object.entries(states)
                .map(([state, count]) => `${state}: ${count}`)
                .join(', ') || 'пусто'
            }};
          </template>
        </p>
      </section>

      <section v-if="stats" class="desk-block" aria-labelledby="desk-stats">
        <h2 id="desk-stats">Статистика</h2>
        <div class="desk-numbers">
          <div>
            <strong>{{ stats.published }}</strong
            ><small>материалов</small>
          </div>
          <div>
            <strong>{{ stats.total_views }}</strong
            ><small>просмотров</small>
          </div>
          <div>
            <strong>{{ stats.total_comments }}</strong
            ><small>комментариев</small>
          </div>
          <div>
            <strong>{{ stats.published_issues }}/{{ stats.draft_issues }}</strong
            ><small>выпусков (вышло/черновик)</small>
          </div>
        </div>
        <div class="desk-columns">
          <div>
            <h3>По рубрикам</h3>
            <ul class="desk-bars">
              <li v-for="row in stats.categories" :key="row.slug">
                <span>{{ row.slug }}</span>
                <span
                  class="desk-bar"
                  :style="{
                    width: `${Math.max(4, (row.views / Math.max(1, stats.categories[0]?.views ?? 1)) * 100)}%`,
                  }"
                ></span>
                <small>{{ row.views }} · {{ row.publications }} шт.</small>
              </li>
            </ul>
          </div>
          <div>
            <h3>Самые читаемые</h3>
            <ol class="desk-top">
              <li v-for="row in stats.top" :key="row.id">
                <RouterLink :to="`/publications/${row.id}`">{{ row.title }}</RouterLink>
                <small
                  >{{ row.views }} 👁 · {{ row.comments }} 💬
                  <template v-if="row.average_rating !== null">
                    · ★ {{ row.average_rating }}</template
                  ></small
                >
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section class="desk-block" aria-labelledby="desk-calendar">
        <h2 id="desk-calendar">Календарь публикаций</h2>
        <label class="desk-inline">Месяц <input v-model="month" type="month" /></label>
        <p v-if="!days.length" class="empty-state">В этом месяце ничего не запланировано.</p>
        <ul class="desk-calendar">
          <li v-for="[day, entries] in days" :key="day">
            <strong>{{ dayLabel(day) }}</strong>
            <ul>
              <li v-for="entry in entries" :key="entry.id">
                <span class="desk-kind" :data-kind="entry.kind">{{
                  entry.kind === 'issue' ? 'Выпуск' : 'Материал'
                }}</span>
                <RouterLink
                  :to="
                    entry.kind === 'issue'
                      ? `/journal/candidates?issue=${entry.id}`
                      : `/publications/${entry.id}`
                  "
                  >{{ entry.title }}</RouterLink
                >
                <small>{{ entry.status === 'scheduled' ? 'запланировано' : entry.status }}</small>
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <section class="desk-block" aria-labelledby="desk-link">
        <h2 id="desk-link">Цитата по ссылке</h2>
        <p class="desk-hint">
          Подтянем только заголовок и описание страницы и оформим черновик со ссылкой на источник.
          Текст чужой статьи не копируется.
        </p>
        <form class="desk-form" @submit.prevent="loadPreview">
          <input v-model="url" type="url" required placeholder="https://…" aria-label="Ссылка" />
          <button class="button button-primary" :disabled="linkBusy">Проверить ссылку</button>
        </form>
        <div v-if="preview" class="desk-preview">
          <img v-if="preview.image_url" :src="preview.image_url" alt="" loading="lazy" />
          <div>
            <strong>{{ preview.title }}</strong>
            <p>{{ preview.description }}</p>
            <small>{{ preview.site_name }}</small>
            <label
              >Рубрика
              <select v-model="categorySlug">
                <option v-for="category in categories" :key="category.slug" :value="category.slug">
                  {{ category.name }}
                </option>
              </select></label
            >
            <label
              >Ваш комментарий
              <textarea v-model="note" rows="3" maxlength="2000"></textarea>
            </label>
            <button class="button button-primary" :disabled="linkBusy" @click="createCitationDraft">
              Создать черновик
            </button>
          </div>
        </div>
        <p v-if="linkMessage" class="dashboard-message">{{ linkMessage }}</p>
      </section>

      <section class="desk-block" aria-labelledby="desk-images">
        <h2 id="desk-images">Свободные изображения</h2>
        <p class="desk-hint">
          Поиск по Wikimedia Commons: показываем только файлы со свободной лицензией. Не забудьте
          указать автора и лицензию в подписи.
        </p>
        <form class="desk-form" @submit.prevent="findImages">
          <input
            v-model="imageQuery"
            required
            minlength="2"
            placeholder="Например: gaming controller"
            aria-label="Запрос"
          />
          <button class="button button-primary" :disabled="imageBusy">Найти</button>
        </form>
        <p v-if="imageMessage" class="dashboard-message">{{ imageMessage }}</p>
        <ul class="desk-images">
          <li v-for="image in images" :key="image.page_url">
            <img :src="image.thumbnail_url" :alt="image.title" loading="lazy" />
            <small>{{ image.license }} · {{ image.author }}</small>
            <button class="button button-secondary" type="button" @click="copyImage(image)">
              Скопировать ссылку
            </button>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.desk-block {
  margin: 0 0 40px;
  padding-top: 8px;
  border-top: 1px solid var(--border, #fff2);
}
.desk-health {
  display: grid;
  gap: 6px;
  margin: 12px 0;
  padding: 0;
  list-style: none;
}
.desk-health li {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: baseline;
}
.desk-health li[data-ok='true'] span {
  color: var(--lime, #c5ef58);
}
.desk-health li[data-ok='false'] span {
  color: #ffb454;
}
.desk-health small {
  color: var(--muted, #aaa);
}
.desk-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin: 12px 0 24px;
}
.desk-numbers strong {
  display: block;
  font-size: 1.8rem;
}
.desk-numbers small,
.desk-hint {
  color: var(--muted, #aaa);
}
.desk-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}
.desk-bars,
.desk-top,
.desk-calendar,
.desk-calendar ul,
.desk-images {
  margin: 0;
  padding: 0;
  list-style: none;
}
.desk-bars li {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.desk-bar {
  height: 10px;
  border-radius: 5px;
  background: var(--lime, #c5ef58);
}
.desk-top {
  list-style: decimal inside;
}
.desk-top li {
  display: grid;
  gap: 2px;
  margin-bottom: 8px;
}
.desk-top a,
.desk-calendar a {
  color: inherit;
}
.desk-inline {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
.desk-calendar > li {
  margin-bottom: 14px;
}
.desk-calendar ul li {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: baseline;
  padding: 4px 0;
}
.desk-kind {
  padding: 1px 8px;
  border-radius: 999px;
  background: #fff2;
  font-size: 0.7rem;
  text-transform: uppercase;
}
.desk-kind[data-kind='issue'] {
  background: var(--lime, #c5ef58);
  color: #151711;
}
.desk-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
}
.desk-form input {
  flex: 1 1 260px;
}
.desk-preview {
  display: grid;
  grid-template-columns: minmax(0, 220px) 1fr;
  gap: 20px;
  margin: 16px 0;
}
.desk-preview img {
  width: 100%;
  border-radius: 8px;
}
.desk-preview label {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}
.desk-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.desk-images li {
  display: grid;
  gap: 6px;
}
.desk-images img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
}
@media (max-width: 640px) {
  .desk-preview {
    grid-template-columns: 1fr;
  }
}
</style>
