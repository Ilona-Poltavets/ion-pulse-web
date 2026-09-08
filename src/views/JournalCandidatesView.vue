<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MagazinePage from '@/components/journal/MagazinePage.vue'
import PageLayoutEditor from '@/components/journal/PageLayoutEditor.vue'
import { contentFirstImage, contentText } from '@/components/content/contentFormat'
import { balancedTextChunks } from '@/components/journal/textPagination'
import {
  createJournalIssue,
  listJournalCandidates,
  listJournalDrafts,
  listJournalIssues,
  saveJournalIssue,
  uploadJournalImage,
  publishJournalIssue,
  type JournalCandidate,
  type JournalIssue,
  type JournalPage,
} from '@/services/api'
const auth = useAuthStore()
const route = useRoute()
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
const uploadingImage = ref(false)
const pageLayoutEditorOpen = ref(false)
const templates: Array<{
  id: JournalPage['template']
  name: string
  description: string
  defaults: Partial<JournalPage>
}> = [
  {
    id: 'cover',
    name: 'Обложка',
    description: 'Главное фото, тема и анонсы',
    defaults: { image_position: 'background', image_height: 100, text_y: 58, text_size: 54 },
  },
  {
    id: 'title',
    name: 'Титульная',
    description: 'Название выпуска и выходные данные',
    defaults: {
      image_position: 'background',
      image_height: 100,
      text_x: 12,
      text_y: 36,
      text_width: 76,
      text_size: 58,
      heading: 'ION PULSE',
      text: 'Ежемесячный журнал об играх и людях',
    },
  },
  {
    id: 'contents',
    name: 'Содержание',
    description: 'Материалы и номера страниц',
    defaults: { image_position: 'right', image_width: 38, image_height: 28, heading: 'Содержание' },
  },
  {
    id: 'feature',
    name: 'Статья',
    description: 'Вводный текст, колонки и фото',
    defaults: { image_position: 'right', image_width: 38, image_height: 32 },
  },
  {
    id: 'interview',
    name: 'Интервью',
    description: 'Фото героя, цитата и разговор',
    defaults: { image_position: 'right', image_width: 44, image_height: 42 },
  },
  {
    id: 'photo',
    name: 'Фотостраница',
    description: 'Большое изображение и подпись',
    defaults: { image_position: 'full', image_width: 100, image_height: 62, text_size: 32 },
  },
  {
    id: 'briefs',
    name: 'Обзор / подборка',
    description: 'Список с иллюстрациями',
    defaults: { image_position: 'left', image_width: 30, image_height: 24 },
  },
  {
    id: 'infographic',
    name: 'Инфографика',
    description: 'Факты, цифры и показатели',
    defaults: { image_position: 'full', image_height: 34, heading: 'Главное в цифрах' },
  },
  {
    id: 'columns',
    name: 'Колонки',
    description: 'Классический журнальный текст',
    defaults: { image_position: 'full', image_height: 28 },
  },
  {
    id: 'poster',
    name: 'Постер',
    description: 'Тёмная полоса и крупный текст',
    defaults: { image_position: 'background', image_height: 100, text_size: 64 },
  },
  {
    id: 'finale',
    name: 'Финальная',
    description: 'Послесловие и следующий номер',
    defaults: {
      image_position: 'background',
      image_height: 100,
      text_x: 10,
      text_y: 18,
      text_width: 80,
      text_size: 48,
      heading: 'Спасибо, что были с нами!',
    },
  },
]
const fingerprint = computed(() => JSON.stringify([title.value, month.value, pages.value]))
const dirty = computed(() => saved.value !== fingerprint.value)
const standalonePage = computed(() =>
  page.value
    ? ['cover', 'title', 'finale'].includes(page.value.template) && !page.value.continuation
    : false,
)
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
      const publishedIssues = await listJournalIssues()
      drafts.value = await listJournalDrafts()
      const requestedId = route.query.issue || route.query.draft
      const requestedIssue = [...drafts.value, ...publishedIssues].find(
        (issue) => issue.id === requestedId,
      )
      if (requestedIssue) openDraft(requestedIssue)
    } catch (e) {
      error.value = String(e)
    }
  }
})
watch([month, locale], load)
function add(template: JournalPage['template']) {
  const preset = templates.find((item) => item.id === template)
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
    one_post_per_page: false,
    ...preset?.defaults,
  })
  active.value = pages.value.length - 1
}
function materialLimit(template: JournalPage['template']): number {
  if (template === 'contents') return 12
  if (template === 'briefs' || template === 'infographic') return 8
  return 4
}
function applyPreset(target: JournalPage): void {
  const preset = templates.find((item) => item.id === target.template)
  if (preset) Object.assign(target, preset.defaults)
  if (['cover', 'title', 'finale'].includes(target.template)) target.publication_ids = []
}
async function selectImage(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !page.value) return
  uploadingImage.value = true
  error.value = ''
  try {
    page.value.image_url = (await uploadJournalImage(file)).image_url
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось загрузить изображение.'
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
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
    one_post_per_page: value.one_post_per_page ?? false,
  }
}

function sameFlow(first: JournalPage, second: JournalPage): boolean {
  return (
    first.template === second.template &&
    first.publication_ids.join(',') === second.publication_ids.join(',')
  )
}

function paginatePage(current: JournalPage) {
  let currentIndex = pages.value.indexOf(current)
  if (currentIndex < 0) return

  while (
    current.continuation &&
    currentIndex > 0 &&
    sameFlow(pages.value[currentIndex - 1]!, current)
  ) {
    current = pages.value[--currentIndex]!
  }

  const flowText = [current.text]
  let continuationIndex = currentIndex + 1
  while (
    pages.value[continuationIndex]?.continuation &&
    sameFlow(current, pages.value[continuationIndex]!)
  ) {
    flowText.push(pages.value[continuationIndex]!.text)
    continuationIndex += 1
  }
  pages.value.splice(currentIndex + 1, continuationIndex - currentIndex - 1)
  current.continuation = false
  current.text = flowText.join('\n\n').trim()
  active.value = currentIndex

  const standaloneTemplate = ['cover', 'title', 'finale'].includes(current.template)
  const continuationLimit = current.template === 'columns' ? 2200 : 1800
  const firstLimit = standaloneTemplate
    ? 450
    : current.image_url
      ? 700
      : current.one_post_per_page
        ? 1100
        : 1400
  const chunks = balancedTextChunks(current.text, firstLimit, continuationLimit)
  if (chunks.length < 2) {
    message.value = 'Текст помещается на одной странице.'
    return
  }
  current.text = chunks.shift() || ''
  const continuationPages = chunks.map((text) =>
    normalizePage({
      ...current,
      heading: '',
      text,
      image_url: '',
      image_position: 'full',
      continuation: true,
      layout_blocks: current.layout_blocks?.some((block) => block.id === 'body')
        ? [
            {
              id: 'body',
              x: 3,
              y: 3,
              width: 94,
              height: 94,
              font_size:
                current.layout_blocks.find((block) => block.id === 'body')?.font_size ?? 14,
            },
          ]
        : [],
    }),
  )
  pages.value.splice(currentIndex + 1, 0, ...continuationPages)
  message.value = `Страницы сбалансированы: ${continuationPages.length + 1} стр.`
}
function paginateText() {
  if (page.value) paginatePage(page.value)
}
function hydratePage(target: JournalPage, publicationId: string): void {
  const publication = candidates.value.find((item) => item.id === publicationId)
  if (!publication) return
  target.text = contentText(publication.body)
  if (!target.image_url) target.image_url = contentFirstImage(publication.body)
  requestAnimationFrame(() => paginatePage(target))
}
function refreshPageFromPublication(target: JournalPage): void {
  let targetIndex = pages.value.indexOf(target)
  while (
    target.continuation &&
    targetIndex > 0 &&
    sameFlow(pages.value[targetIndex - 1]!, target)
  ) {
    target = pages.value[--targetIndex]!
  }
  const publication = candidates.value.find((item) => item.id === target.publication_ids[0])
  if (!publication) return
  while (
    pages.value[targetIndex + 1]?.continuation &&
    sameFlow(target, pages.value[targetIndex + 1]!)
  )
    pages.value.splice(targetIndex + 1, 1)
  target.text = contentText(publication.body)
  if (!target.image_url) target.image_url = contentFirstImage(publication.body)
  active.value = targetIndex
  requestAnimationFrame(() => paginatePage(target))
}
function toggleMaterial(target: JournalPage, publicationId: string, selected: boolean): void {
  if (!selected) {
    target.publication_ids = target.publication_ids.filter((id) => id !== publicationId)
    const targetIndex = pages.value.indexOf(target)
    while (
      pages.value[targetIndex + 1]?.continuation &&
      pages.value[targetIndex + 1]?.publication_ids.includes(publicationId)
    ) {
      pages.value.splice(targetIndex + 1, 1)
    }
    return
  }
  if (target.one_post_per_page && target.publication_ids.length) {
    const targetIndex = pages.value.indexOf(target)
    const separatePage = normalizePage({
      ...target,
      publication_ids: [],
      heading: '',
      text: '',
      image_url: '',
      continuation: false,
    })
    pages.value.splice(targetIndex + 1, 0, separatePage)
    active.value = targetIndex + 1
    toggleMaterial(separatePage, publicationId, true)
    return
  }
  if (!target.publication_ids.includes(publicationId)) target.publication_ids.push(publicationId)
  if (target.publication_ids.length !== 1 || target.text.trim()) return
  hydratePage(target, publicationId)
}
function setOnePostPerPage(target: JournalPage, enabled: boolean): void {
  target.one_post_per_page = enabled
  if (!enabled || target.publication_ids.length < 2) {
    const publicationId = target.publication_ids[0]
    if (enabled && publicationId) {
      if (!target.text.trim()) hydratePage(target, publicationId)
      else requestAnimationFrame(() => paginatePage(target))
    }
    return
  }
  const [first, ...rest] = target.publication_ids
  target.publication_ids = first ? [first] : []
  if (first && !target.text.trim()) hydratePage(target, first)
  let insertionIndex = pages.value.indexOf(target) + 1
  for (const publicationId of rest) {
    const separatePage = normalizePage({
      ...target,
      publication_ids: [publicationId],
      heading: '',
      text: '',
      image_url: '',
      continuation: false,
    })
    pages.value.splice(insertionIndex++, 0, separatePage)
    hydratePage(separatePage, publicationId)
  }
}
function selectPage(index: number): void {
  active.value = index
  const target = pages.value[index]
  if (
    !target ||
    target.continuation ||
    target.text.trim() ||
    target.publication_ids.length !== 1 ||
    ['cover', 'title', 'finale'].includes(target.template)
  )
    return
  hydratePage(target, target.publication_ids[0]!)
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
function applyPageLayout(editedPage: JournalPage): void {
  if (!page.value) return
  Object.assign(page.value, editedPage)
  message.value = 'Макет страницы изменён. Сохраните черновик.'
}
function startNewIssue(): void {
  issueId.value = ''
  pages.value = []
  active.value = 0
  title.value = `ION PULSE — ${month.value}`
  published.value = false
  saved.value = ''
  error.value = ''
  message.value = 'Создаётся новый выпуск за выбранный месяц.'
}
function openDraft(draft: JournalIssue) {
  issueId.value = draft.id
  title.value = draft.title
  month.value = draft.period_start.slice(0, 7)
  pages.value = (JSON.parse(JSON.stringify(draft.pages)) as JournalPage[]).map(normalizePage)
  saved.value = fingerprint.value
  for (const target of pages.value) {
    const publication = candidates.value.find((item) => item.id === target.publication_ids[0])
    if (!target.continuation && !target.image_url && publication)
      target.image_url = contentFirstImage(publication.body)
  }
  selectPage(0)
  published.value = draft.status === 'published'
}
async function save() {
  error.value = ''
  message.value = ''
  if (title.value.length < 5) {
    error.value = 'Название выпуска должно содержать минимум 5 символов.'
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
    message.value = published.value
      ? 'Опубликованный выпуск обновлён.'
      : 'Черновик сохранён. Теперь его можно опубликовать.'
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
      <fieldset :disabled="busy" class="magazine-editor-fields">
        <div class="magazine-editor-toolbar">
          <label>Название<input v-model.trim="title" maxlength="240" /></label>
          <label>Месяц<input v-model="month" type="month" required /></label>
          <button class="button button-primary" @click="save">Сохранить</button>
          <button
            v-if="!published"
            class="button button-secondary"
            :disabled="dirty || !issueId"
            @click="publish"
          >
            Опубликовать
          </button>
          <button
            v-if="issueId && !dirty && !published"
            class="button button-secondary"
            type="button"
            @click="startNewIssue"
          >
            Новый выпуск этого месяца
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
        <div class="magazine-template-picker" aria-label="Пресеты страниц">
          <button v-for="tpl in templates" :key="tpl.id" @click="add(tpl.id)">
            <span class="preset-preview" :class="`preset-preview--${tpl.id}`" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
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
              @click="selectPage(index)"
            >
              {{ index + 1 }} /
              {{ entry.heading || templates.find((t) => t.id === entry.template)?.name }}
            </button>
            <template v-if="page">
              <div class="magazine-editor-toolbar">
                <button :disabled="active === 0" @click="move(-1)">↑</button
                ><button :disabled="active === pages.length - 1" @click="move(1)">↓</button
                ><button @click="remove">Удалить страницу</button>
                <button
                  v-if="!standalonePage"
                  class="button button-primary"
                  type="button"
                  @click="pageLayoutEditorOpen = true"
                >
                  Редактор страницы
                </button>
              </div>
              <label
                >Шаблон<select v-model="page.template" @change="applyPreset(page)">
                  <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                    {{ tpl.name }}
                  </option>
                </select></label
              >
              <label>Заголовок страницы<input v-model="page.heading" maxlength="240" /></label>
              <label
                >Изображение (URL)<input v-model="page.image_url" placeholder="https://…"
              /></label>
              <label class="magazine-upload">
                <span>{{ uploadingImage ? 'Загружаем…' : 'Загрузить с устройства' }}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  :disabled="uploadingImage"
                  @change="selectImage"
                />
              </label>
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
              <template v-if="standalonePage">
                <label
                  >Текст обложки<textarea
                    v-model="page.text"
                    rows="5"
                    maxlength="20000"
                    @blur="paginateText"
                  />
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
              <div v-if="page.text.trim()" class="page-text-actions">
                <button class="button secondary" type="button" @click="paginateText">
                  Сбалансировать страницы
                </button>
                <button
                  v-if="page.publication_ids.length === 1"
                  class="button secondary"
                  type="button"
                  title="Заменить редакторский текст актуальным содержимым исходной статьи"
                  @click="refreshPageFromPublication(page)"
                >
                  Обновить из статьи
                </button>
              </div>
              <h3 v-if="!standalonePage">Материалы за два месяца</h3>
              <template v-if="!standalonePage">
                <label class="checkbox-label magazine-flow-option">
                  <input
                    type="checkbox"
                    :checked="page.one_post_per_page"
                    @change="setOnePostPerPage(page, ($event.target as HTMLInputElement).checked)"
                  />
                  <span
                    ><strong>Один пост на страницу</strong
                    ><small
                      >Текст поста идёт в две колонки и автоматически продолжается на новых
                      страницах.</small
                    ></span
                  >
                </label>
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
                <p v-if="!sorted.length">За выбранный и предыдущий месяц материалов нет.</p>
                <label v-for="item in sorted" :key="item.id" class="magazine-candidate"
                  ><input
                    type="checkbox"
                    :checked="page.publication_ids.includes(item.id)"
                    :disabled="
                      page.publication_ids.length >= materialLimit(page.template) &&
                      !page.publication_ids.includes(item.id)
                    "
                    @change="
                      toggleMaterial(page, item.id, ($event.target as HTMLInputElement).checked)
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
              :editable="standalonePage"
              @text-position="
                ({ x, y }) => {
                  page!.text_x = x
                  page!.text_y = y
                }
              "
            />
            <p v-else class="empty-state">Выберите пресет, чтобы добавить первую страницу.</p>
          </div>
        </div>
      </fieldset>
      <button v-if="published" class="button button-primary" type="button" @click="startNewIssue">
        Создать ещё один выпуск этого месяца
      </button>
      <PageLayoutEditor
        v-if="page"
        v-model="pageLayoutEditorOpen"
        :page="page"
        :materials="candidates"
        :number="active + 1"
        @save="applyPageLayout"
      />
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
.magazine-upload {
  padding: 10px;
  border: 1px dashed rgb(199 255 94 / 45%);
  border-radius: 7px;
  background: rgb(199 255 94 / 5%);
}
.magazine-upload > span {
  color: var(--lime);
  font-size: 13px;
  font-weight: 700;
}
.magazine-upload input[type='file'] {
  padding: 0;
  border: 0;
  font-size: 11px;
}
.magazine-upload input[type='file']::file-selector-button {
  margin-right: 10px;
  padding: 8px 10px;
  color: #10130e;
  background: var(--lime);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 700;
}
.magazine-template-picker {
  display: flex;
  gap: 12px;
  padding-bottom: 10px;
  margin: 24px 0;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}
.magazine-template-picker button {
  flex: 0 0 180px;
  padding: 10px;
  text-align: left;
  background: #282f25;
  color: #f5f0df;
  border: 1px solid #c5ef5840;
  border-radius: 8px;
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    transform 160ms ease,
    border-color 160ms ease;
}
.magazine-template-picker button:hover {
  border-color: var(--lime);
  transform: translateY(-2px);
}
.magazine-template-picker small {
  display: block;
  margin-top: 10px;
  line-height: 1.5;
}
.preset-preview {
  position: relative;
  display: block;
  height: 112px;
  margin-bottom: 11px;
  overflow: hidden;
  background: #f3eedf;
  border-radius: 3px;
}
.preset-preview i {
  position: absolute;
  display: block;
  background: #20251f;
  opacity: 0.85;
}
.preset-preview i:nth-child(1) {
  top: 12px;
  left: 12px;
  width: 58%;
  height: 8px;
}
.preset-preview i:nth-child(2) {
  top: 28px;
  left: 12px;
  width: 42%;
  height: 4px;
}
.preset-preview i:nth-child(3) {
  top: 42px;
  left: 12px;
  width: 76%;
  height: 55px;
  background: #a8b0a5;
}
.preset-preview i:nth-child(4) {
  display: none;
}
.preset-preview--cover,
.preset-preview--poster,
.preset-preview--finale,
.preset-preview--title {
  background: linear-gradient(145deg, #66715f, #1b211c);
}
.preset-preview--cover i:nth-child(1),
.preset-preview--poster i:nth-child(1) {
  top: 64px;
  width: 70%;
  height: 18px;
  background: #fff;
}
.preset-preview--title i:nth-child(1) {
  top: 40px;
  left: 25px;
  width: 70%;
  height: 14px;
  background: var(--lime);
}
.preset-preview--finale i:nth-child(1) {
  top: 22px;
  width: 62%;
  height: 16px;
  background: #fff;
}
.preset-preview--contents i:nth-child(3) {
  left: auto;
  right: 10px;
  width: 35%;
}
.preset-preview--contents i:nth-child(4) {
  display: block;
  top: 44px;
  left: 12px;
  width: 42%;
  height: 48px;
  background: repeating-linear-gradient(#20251f 0 3px, transparent 3px 11px);
}
.preset-preview--interview i:nth-child(3) {
  left: auto;
  right: 10px;
  width: 42%;
  height: 70px;
}
.preset-preview--interview i:nth-child(4) {
  display: block;
  top: 58px;
  left: 12px;
  width: 38%;
  height: 28px;
  border-left: 4px solid var(--lime);
}
.preset-preview--photo i:nth-child(3) {
  top: 10px;
  left: 10px;
  width: calc(100% - 20px);
  height: 76px;
}
.preset-preview--briefs i:nth-child(3) {
  width: 24%;
  height: 14px;
  box-shadow:
    0 20px #a8b0a5,
    0 40px #a8b0a5;
}
.preset-preview--infographic i:nth-child(3) {
  top: 54px;
  height: 32px;
  background: repeating-linear-gradient(90deg, #a8b0a5 0 20px, transparent 20px 34px);
}
.preset-preview--columns i:nth-child(3) {
  background: repeating-linear-gradient(
    90deg,
    #a8b0a5 0 45%,
    transparent 45% 52%,
    #a8b0a5 52% 100%
  );
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
.magazine-flow-option {
  display: flex !important;
  align-items: flex-start;
  gap: 10px !important;
  padding: 12px;
  border: 1px solid rgb(197 239 88 / 28%);
  border-radius: 7px;
  background: rgb(197 239 88 / 6%);
  cursor: pointer;
}
.magazine-flow-option input {
  flex: 0 0 auto;
  width: auto;
  margin: 3px 0 0;
  accent-color: var(--lime);
}
.magazine-flow-option span {
  display: grid;
  gap: 4px;
}
.magazine-flow-option small {
  color: #a6ad9f;
  font-size: 12px;
  line-height: 1.4;
}
.page-text-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 16px;
}
.page-text-actions .button {
  padding-inline: 8px;
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
