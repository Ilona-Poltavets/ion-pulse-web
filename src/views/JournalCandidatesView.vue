<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import MagazinePage from '@/components/journal/MagazinePage.vue'
import {
  createJournalIssue,
  listJournalCandidates,
  listJournalDrafts,
  saveJournalIssue,
  publishJournalIssue,
  type JournalCandidate,
  type JournalIssue,
  type JournalPage,
} from '@/services/api'
const auth = useAuthStore()
const { locale } = useI18n()
const allowed = computed(() =>
  auth.user?.roles.some((r) => ['editor', 'administrator'].includes(r)),
)
const month = ref(new Date().toISOString().slice(0, 7))
const title = ref('ION PULSE — ' + month.value)
const pages = ref<JournalPage[]>([])
const active = ref(0)
const page = computed(() => pages.value[active.value])
const candidates = ref<JournalCandidate[]>([])
const drafts = ref<JournalIssue[]>([])
const issueId = ref('')
const sort = ref('score')
const search = ref('')
const busy = ref(false)
const error = ref('')
const message = ref('')
const saved = ref('')
const published = ref(false)
const templates: { id: JournalPage['template']; name: string; description: string }[] = [
  { id: 'cover', name: 'Обложка', description: 'Фоновая картинка и свободный текст' },
  { id: 'feature', name: 'Большой материал', description: 'Крупный заголовок и текст с буквицей' },
  { id: 'columns', name: 'Классические колонки', description: 'Две колонки журнального текста' },
  { id: 'interview', name: 'Интервью', description: 'Акцентная цитата и разговор' },
  { id: 'briefs', name: 'Коротко о главном', description: 'Сетка до четырёх новостей' },
  { id: 'poster', name: 'Постер', description: 'Тёмная страница и яркая типографика' },
]
const fingerprint = computed(() => JSON.stringify([title.value, month.value, pages.value]))
const dirty = computed(() => saved.value !== fingerprint.value)
const sorted = computed(() =>
  [...candidates.value]
    .filter((c) => c.title.toLowerCase().includes(search.value.toLowerCase()))
    .sort((a, b) => {
      if (sort.value === 'published_at')
        return Date.parse(b.published_at) - Date.parse(a.published_at)
      const key = sort.value as 'score' | 'view_count' | 'comment_count'
      return b[key] - a[key]
    }),
)
let loadVersion = 0
async function load() {
  if (!allowed.value) return
  const version = ++loadVersion
  try {
    const result = await listJournalCandidates(locale.value as 'ru' | 'en', month.value)
    if (version === loadVersion) candidates.value = result
  } catch (e) {
    error.value = String(e)
  }
}
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (allowed.value) {
    await load()
    try {
      drafts.value = await listJournalDrafts()
    } catch (e) {
      error.value = String(e)
    }
  }
})
watch([month, locale], load)
function add(template: JournalPage['template']) {
  pages.value.push({
    template,
    publication_ids: [],
    heading: '',
    text: '',
    image_url: '',
    accent: '#c5ef58',
    image_width: 100,
    image_height: template === 'cover' ? 100 : 38,
    image_position: template === 'cover' ? 'background' : 'full',
    text_x: 8,
    text_y: template === 'cover' ? 58 : 8,
    text_width: 84,
    text_size: template === 'cover' ? 54 : 38,
    continuation: false,
  })
  active.value = pages.value.length - 1
}
function normalizePage(value: JournalPage): JournalPage {
  return {
    ...value,
    image_width: value.image_width ?? 100,
    image_height: value.image_height ?? (value.template === 'cover' ? 100 : 38),
    image_position: value.image_position ?? (value.template === 'cover' ? 'background' : 'full'),
    text_x: value.text_x ?? 8,
    text_y: value.text_y ?? (value.template === 'cover' ? 58 : 8),
    text_width: value.text_width ?? 84,
    text_size: value.text_size ?? (value.template === 'cover' ? 54 : 38),
    continuation: value.continuation ?? false,
  }
}

function splitText(value: string, limit: number): string[] {
  const words = value.trim().split(/\s+/)
  const chunks: string[] = []
  let chunk = ''
  for (const word of words) {
    if (chunk && `${chunk} ${word}`.length > limit) {
      chunks.push(chunk)
      chunk = word
    } else chunk = chunk ? `${chunk} ${word}` : word
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function paginateText() {
  if (!page.value || page.value.template === 'cover') return
  const current = page.value
  const limit = current.template === 'columns' ? 2600 : current.image_url ? 1200 : 1800
  const chunks = splitText(current.text, limit)
  if (chunks.length < 2) return
  current.text = chunks.shift() || ''
  const continuationPages = chunks.map((text, index) =>
    normalizePage({
      ...current,
      heading: `${current.heading || 'Продолжение'}${index ? ` · ${index + 2}` : ' · продолжение'}`,
      text,
      image_url: '',
      image_position: 'full',
      continuation: true,
    }),
  )
  pages.value.splice(active.value + 1, 0, ...continuationPages)
  message.value = `Текст перенесён на ${continuationPages.length} стр. продолжения.`
}
function move(delta: number) {
  const target = active.value + delta
  if (target < 0 || target >= pages.value.length) return
  const item = pages.value.splice(active.value, 1)[0]
  if (item) pages.value.splice(target, 0, item)
  active.value = target
}
function remove() {
  pages.value.splice(active.value, 1)
  active.value = Math.max(0, active.value - 1)
}
function openDraft(draft: JournalIssue) {
  issueId.value = draft.id
  title.value = draft.title
  month.value = draft.period_start.slice(0, 7)
  pages.value = (JSON.parse(JSON.stringify(draft.pages)) as JournalPage[]).map(normalizePage)
  active.value = 0
  saved.value = fingerprint.value
  published.value = false
}
async function save() {
  error.value = ''
  message.value = ''
  if (
    title.value.length < 5 ||
    !pages.value.length ||
    !pages.value.some((p) => p.publication_ids.length) ||
    pages.value.some((p) => p.template !== 'cover' && !p.publication_ids.length)
  ) {
    error.value = 'Укажите название и добавьте материал на каждую внутреннюю страницу.'
    return
  }
  busy.value = true
  try {
    const start = new Date(month.value + '-01T00:00:00Z')
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 1)
    const payload = {
      title: title.value,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      pages: pages.value,
    }
    if (!issueId.value) issueId.value = (await createJournalIssue(payload)).id
    await saveJournalIssue(issueId.value, payload)
    saved.value = fingerprint.value
    drafts.value = await listJournalDrafts()
    message.value = 'Черновик сохранён. Теперь его можно опубликовать.'
  } catch (e) {
    error.value = String(e)
  } finally {
    busy.value = false
  }
}
async function publish() {
  if (dirty.value || !issueId.value) return
  busy.value = true
  try {
    await publishJournalIssue(issueId.value)
    published.value = true
    message.value = 'Журнал опубликован.'
  } catch (e) {
    error.value = String(e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="editorial-page magazine-editor">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / MONTHLY</p>
        <h1>Мастерская журнала</h1>
        <p>Соберите месяц в выпуск, который хочется перелистывать.</p>
      </div>
      <RouterLink to="/journal">На полку →</RouterLink>
    </header>
    <p v-if="!allowed" class="empty-state">Создавать журнал может редактор или администратор.</p>
    <template v-else>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
      <p v-if="message" role="status">
        {{ message }}
        <RouterLink v-if="published" :to="`/journal/${issueId}/read`">Читать выпуск →</RouterLink>
      </p>
      <fieldset :disabled="busy || published" class="magazine-editor-fields">
        <div class="magazine-editor-toolbar">
          <label>Название<input v-model.trim="title" maxlength="240" /></label>
          <label>Месяц<input v-model="month" type="month" required /></label>
          <button class="button button-primary" @click="save">Сохранить</button>
          <button class="button button-secondary" :disabled="dirty || !issueId" @click="publish">
            Опубликовать
          </button>
          <span>{{ dirty ? 'Есть несохранённые изменения' : 'Сохранено' }}</span>
        </div>
        <details v-if="drafts.length">
          <summary>Сохранённые черновики</summary>
          <button
            v-for="draft in drafts"
            :key="draft.id"
            class="button button-secondary"
            @click="openDraft(draft)"
          >
            {{ draft.title }}
          </button>
        </details>
        <div class="magazine-template-picker">
          <button v-for="tpl in templates" :key="tpl.id" @click="add(tpl.id)">
            <strong>＋ {{ tpl.name }}</strong
            ><small>{{ tpl.description }}</small>
          </button>
        </div>
        <div class="magazine-workspace">
          <aside>
            <h2>Страницы · {{ pages.length }}</h2>
            <button
              v-for="(entry, index) in pages"
              :key="index"
              class="magazine-page-tab"
              :class="{ active: active === index }"
              @click="active = index"
            >
              {{ index + 1 }} /
              {{ entry.heading || templates.find((t) => t.id === entry.template)?.name }}
            </button>
            <template v-if="page">
              <div class="magazine-editor-toolbar">
                <button :disabled="active === 0" @click="move(-1)">↑</button
                ><button :disabled="active === pages.length - 1" @click="move(1)">↓</button
                ><button @click="remove">Удалить страницу</button>
              </div>
              <label
                >Шаблон<select v-model="page.template">
                  <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                    {{ tpl.name }}
                  </option>
                </select></label
              >
              <label>Заголовок страницы<input v-model="page.heading" maxlength="240" /></label>
              <label
                >Изображение (URL)<input v-model="page.image_url" placeholder="https://…"
              /></label>
              <label
                >Расположение изображения<select v-model="page.image_position">
                  <option value="full">На всю ширину</option>
                  <option value="left">Слева, текст обтекает</option>
                  <option value="right">Справа, текст обтекает</option>
                  <option value="background">Фон страницы</option>
                </select></label
              >
              <label
                >Ширина изображения · {{ page.image_width }}%<input
                  v-model.number="page.image_width"
                  type="range"
                  min="20"
                  max="100"
              /></label>
              <label
                >Высота изображения · {{ page.image_height }}%<input
                  v-model.number="page.image_height"
                  type="range"
                  min="15"
                  max="100"
              /></label>
              <label>Акцент<input v-model="page.accent" type="color" /></label>
              <template v-if="page.template === 'cover'">
                <label
                  >Текст обложки<textarea v-model="page.text" rows="5" maxlength="20000" />
                </label>
                <label
                  >Позиция текста по горизонтали · {{ page.text_x }}%<input
                    v-model.number="page.text_x"
                    type="range"
                    min="0"
                    max="80"
                /></label>
                <label
                  >Позиция текста по вертикали · {{ page.text_y }}%<input
                    v-model.number="page.text_y"
                    type="range"
                    min="0"
                    max="85"
                /></label>
                <label
                  >Ширина текста · {{ page.text_width }}%<input
                    v-model.number="page.text_width"
                    type="range"
                    min="20"
                    max="100"
                /></label>
                <label
                  >Размер текста · {{ page.text_size }} px<input
                    v-model.number="page.text_size"
                    type="range"
                    min="12"
                    max="96"
                /></label>
              </template>
              <label v-else
                >Редакторский текст<textarea
                  v-model="page.text"
                  rows="10"
                  maxlength="20000"
                  @blur="paginateText"
                />
              </label>
              <h3 v-if="page.template !== 'cover'">Материалы месяца</h3>
              <template v-if="page.template !== 'cover'">
                <input
                  v-model="search"
                  aria-label="Поиск новостей"
                  placeholder="Поиск по названию"
                />
                <select v-model="sort" aria-label="Сортировка">
                  <option value="score">Популярность</option>
                  <option value="published_at">Сначала новые</option>
                  <option value="view_count">Просмотры</option>
                  <option value="comment_count">Комментарии</option>
                </select>
                <p v-if="!sorted.length">За этот месяц новостей нет.</p>
                <label v-for="item in sorted" :key="item.id" class="magazine-candidate"
                  ><input
                    v-model="page.publication_ids"
                    type="checkbox"
                    :value="item.id"
                    :disabled="
                      page.publication_ids.length >= 4 && !page.publication_ids.includes(item.id)
                    "
                  /><span
                    >{{ item.title
                    }}<small
                      >{{ new Date(item.published_at).toLocaleDateString() }} · ◉
                      {{ item.view_count }} · ◇ {{ item.comment_count }}</small
                    ></span
                  ></label
                >
              </template>
            </template>
          </aside>
          <div class="magazine-preview">
            <MagazinePage
              v-if="page"
              :page="page"
              :materials="candidates"
              :number="active + 1"
              editable
              @text-position="
                ({ x, y }) => {
                  page!.text_x = x
                  page!.text_y = y
                }
              "
            />
            <p v-else class="empty-state">
              Выберите один из пяти шаблонов, чтобы добавить первую страницу.
            </p>
          </div>
        </div>
      </fieldset>
    </template>
  </section>
</template>
<style scoped>
.magazine-editor-fields {
  border: 0;
  padding: 0;
  min-width: 0;
}
.magazine-editor-toolbar {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.magazine-editor label {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}
.magazine-editor input,
.magazine-editor select,
.magazine-editor textarea {
  max-width: 100%;
  padding: 10px;
  border: 1px solid #7776;
  border-radius: 4px;
  background: var(--surface);
  color: inherit;
}
.magazine-template-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 24px 0;
}
.magazine-template-picker button {
  padding: 18px;
  text-align: left;
  background: #282f25;
  color: #f5f0df;
  border: 1px solid #c5ef5840;
  border-radius: 8px;
  cursor: pointer;
}
.magazine-template-picker small {
  display: block;
  margin-top: 10px;
  line-height: 1.5;
}
.magazine-workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 32px;
}
.magazine-workspace aside {
  max-height: 900px;
  overflow: auto;
  padding-right: 10px;
}
.magazine-preview {
  height: 850px;
  max-width: 660px;
  width: 100%;
  position: sticky;
  top: 20px;
}
.magazine-page-tab {
  display: block;
  padding: 12px;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.magazine-page-tab.active {
  background: #c5ef58;
  color: #20251f;
}
.magazine-candidate {
  display: flex !important;
  align-items: start;
  border-top: 1px solid #8884;
  padding-top: 12px;
}
.magazine-candidate small {
  display: block;
  margin-top: 8px;
  opacity: 0.6;
}
@media (max-width: 900px) {
  .magazine-template-picker {
    grid-template-columns: repeat(2, 1fr);
  }
  .magazine-workspace {
    grid-template-columns: 1fr;
  }
  .magazine-preview {
    position: static;
    height: 700px;
  }
  .magazine-workspace aside {
    max-height: none;
  }
}
</style>

<style scoped>
.journal-content-editor {
  margin-top: 36px;
  scroll-margin-top: 24px;
}
.journal-content-editor > p {
  margin-bottom: 20px;
  color: #899082;
}
</style>
