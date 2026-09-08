<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MagazineReader from '@/components/journal/MagazineReader.vue'
import {
  getJournalMaterials,
  getJournalIssue,
  listJournalDrafts,
  listJournalIssues,
  type JournalCandidate,
  type JournalIssue,
  type JournalPage,
} from '@/services/api'
const route = useRoute()
const auth = useAuthStore()
const { locale } = useI18n()
const issues = ref<JournalIssue[]>([])
const drafts = ref<JournalIssue[]>([])
const selected = computed(
  () =>
    issues.value.find((i) => i.id === route.params.id) ||
    (!route.params.id ? issues.value[0] : undefined),
)
const materials = ref<JournalCandidate[]>([])
const error = ref('')
const loading = ref(true)
const reading = computed(() => route.name === 'journal-reader')
const canEdit = computed(() =>
  auth.user?.roles.some((r) => ['editor', 'administrator'].includes(r)),
)
const pages = computed<JournalPage[]>(() =>
  selected.value?.pages.length
    ? selected.value.pages
    : materials.value.map((m) => ({
        template: 'feature',
        publication_ids: [m.id],
        heading: '',
        text: '',
        image_url: '',
        accent: '#c5ef58',
        image_width: 100,
        image_height: 38,
        image_position: 'full',
        text_x: 8,
        text_y: 58,
        text_width: 84,
        text_size: 38,
        continuation: false,
        one_post_per_page: false,
      })),
)
const ranked = computed(() => [...materials.value].sort((a, b) => b.score - a.score))
let version = 0
watch([() => selected.value?.id, locale], async () => {
  const request = ++version
  materials.value = []
  error.value = ''
  if (!selected.value) return
  loading.value = true
  try {
    const data = await getJournalMaterials(selected.value.id, locale.value)
    if (request === version) materials.value = data
  } catch (e) {
    if (request === version) error.value = String(e)
  } finally {
    if (request === version) loading.value = false
  }
})
onMounted(async () => {
  try {
    if (!auth.user) await auth.restore()
    const publishedRequest = listJournalIssues()
    const selectedRequest =
      typeof route.params.id === 'string' ? getJournalIssue(route.params.id) : Promise.resolve(null)
    const draftsRequest = canEdit.value ? listJournalDrafts() : Promise.resolve([])
    const [published, savedDrafts, current] = await Promise.all([
      publishedRequest,
      draftsRequest,
      selectedRequest,
    ])
    issues.value = current
      ? [current, ...published.filter((issue) => issue.id !== current.id)]
      : published
    drafts.value = savedDrafts
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => {
  version++
})
</script>
<template>
  <section class="editorial-page monthly-journal">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ION PULSE / MONTHLY</p>
        <h1>{{ reading ? selected?.title : 'Журнал' }}</h1>
        <p>Главное за месяц. На страницах, которые хочется сохранить.</p>
      </div>
      <RouterLink v-if="canEdit" class="button button-primary" to="/journal/candidates"
        >Создать журнал</RouterLink
      >
    </header>
    <p v-if="error" role="alert" class="form-error">{{ error }}</p>
    <p v-if="loading" role="status">Загружаем выпуск…</p>
    <section v-else-if="canEdit && drafts.length && !reading" class="journal-drafts">
      <div class="journal-drafts-heading">
        <div>
          <p class="eyebrow">РЕДАКЦИЯ</p>
          <h2>Черновики выпусков</h2>
        </div>
        <span>{{ drafts.length }}</span>
      </div>
      <div class="journal-draft-list">
        <RouterLink
          v-for="draft in drafts"
          :key="draft.id"
          :to="{ path: '/journal/candidates', query: { draft: draft.id } }"
          class="journal-draft-card"
        >
          <span>ЧЕРНОВИК</span>
          <strong>{{ draft.title }}</strong>
          <small>{{ draft.period_start.slice(0, 7) }} · {{ draft.pages.length }} стр.</small>
          <b>Продолжить редактирование →</b>
        </RouterLink>
      </div>
    </section>
    <p v-else-if="!selected" class="empty-state">
      {{ route.params.id ? 'Выпуск не найден.' : 'Первый выпуск ещё готовится.' }}
    </p>
    <template v-if="selected">
      <template v-if="!reading">
        <nav class="monthly-shelf" aria-label="Выпуски">
          <RouterLink
            v-for="issue in issues"
            :key="issue.id"
            :to="`/journal/${issue.id}`"
            :class="{ active: selected.id === issue.id }"
            >{{ issue.title }}</RouterLink
          >
        </nav>
        <div class="monthly-hero">
          <RouterLink
            class="monthly-book"
            :to="`/journal/${selected.id}/read`"
            aria-label="Открыть журнал"
          >
            <span class="monthly-book-back" /><span class="monthly-book-paper"
              ><b>В ЭТОМ НОМЕРЕ</b
              ><span v-for="item in ranked.slice(0, 3)" :key="item.id">{{ item.title }}</span
              ><em>Открыть выпуск →</em></span
            >
            <div class="monthly-book-cover">
              <span>НЕЗАВИСИМЫЙ ИГРОВОЙ ЖУРНАЛ</span><strong>ION<br />PULSE<span>®</span></strong>
              <div class="monthly-cover-art">✳</div>
              <h2>{{ selected.title }}</h2>
              <footer>
                {{ selected.period_start.slice(0, 7) }} <span>{{ pages.length }} СТР.</span>
              </footer>
            </div>
          </RouterLink>
          <div class="monthly-intro">
            <p class="eyebrow">НОВЫЙ ВЫПУСК · {{ selected.period_start.slice(0, 7) }}</p>
            <h2>Месяц.<br />Бумага.<br /><em>Память.</em></h2>
            <p>Новости, истории и открытия — в ритме настоящего журнала.</p>
            <RouterLink class="button button-primary" :to="`/journal/${selected.id}/read`"
              >Листать журнал ↗</RouterLink
            >
            <RouterLink
              v-if="canEdit"
              class="button button-secondary"
              :to="{ path: '/journal/candidates', query: { issue: selected.id } }"
            >
              Редактировать выпуск
            </RouterLink>
          </div>
        </div>
        <h2>В этом выпуске</h2>
        <p>Самые популярные и обсуждаемые материалы — первыми.</p>
        <ol class="monthly-contents">
          <li v-for="(item, index) in ranked" :key="item.id">
            <span>{{ String(index + 1).padStart(2, '0') }}</span
            ><RouterLink :to="`/publications/${item.id}`"
              ><small>{{ item.category_slug }}</small>
              <h3>{{ item.title }}</h3>
              <p>{{ item.summary }}</p></RouterLink
            ><small>◉ {{ item.view_count }}<br />◇ {{ item.comment_count }}</small>
          </li>
        </ol>
      </template>
      <template v-else>
        <div class="monthly-reader-bar">
          <RouterLink :to="`/journal/${selected.id}`">← К выпуску</RouterLink>
          <RouterLink
            v-if="canEdit"
            :to="{ path: '/journal/candidates', query: { issue: selected.id } }"
          >
            Редактировать выпуск
          </RouterLink>
        </div>
        <MagazineReader v-if="pages.length" :pages="pages" :materials="materials" />
      </template>
    </template>
  </section>
</template>
<style>
.journal-drafts {
  margin: 28px 0 42px;
  padding: 22px;
  border: 1px solid rgb(197 239 88 / 24%);
  border-radius: 10px;
  background: rgb(197 239 88 / 4%);
}
.journal-drafts-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.journal-drafts-heading h2,
.journal-drafts-heading p {
  margin: 0;
}
.journal-drafts-heading > span {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--lime);
  color: #11150e;
  font-weight: 800;
}
.journal-draft-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.journal-draft-card {
  display: grid;
  gap: 9px;
  padding: 18px;
  border: 1px solid #7775;
  border-radius: 7px;
  color: inherit;
  text-decoration: none;
  background: var(--surface);
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}
.journal-draft-card:hover {
  border-color: var(--lime);
  transform: translateY(-2px);
}
.journal-draft-card > span,
.journal-draft-card > b {
  color: var(--lime);
  font-size: 11px;
  letter-spacing: 0.08em;
}
.journal-draft-card > small {
  color: #92998c;
}
.monthly-shelf {
  display: flex;
  gap: 12px;
  overflow: auto;
  padding: 12px 0;
}
.monthly-shelf a {
  padding: 12px 18px;
  border: 1px solid #7775;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
}
.monthly-shelf a.active {
  border-color: #c5ef58;
}
.monthly-hero {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 110px;
  padding: 70px 30px;
  background: radial-gradient(ellipse at 35% 50%, #59613a33, transparent 65%);
  overflow: hidden;
}
.monthly-book {
  position: relative;
  display: block;
  width: 300px;
  height: 410px;
  flex-shrink: 0;
  perspective: 1800px;
  transform: rotate(-5deg);
  color: #1e251c;
  text-decoration: none;
}
.monthly-book-cover,
.monthly-book-paper,
.monthly-book-back {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 2px 9px 9px 2px;
  transition: transform 0.8s cubic-bezier(0.2, 0.6, 0.2, 1);
  box-shadow: 12px 20px 30px #0005;
}
.monthly-book-back {
  background: #2b3225;
  transform: translateZ(-12px) translateX(10px);
}
.monthly-book-paper {
  background: repeating-linear-gradient(to right, #e2dbc6 0 1px, #f7f1df 1px 3px);
  padding: 25px 24px 25px 45px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  font:
    16px Georgia,
    serif;
}
.monthly-book-paper b {
  font: 11px monospace;
}
.monthly-book-cover {
  background: #c5ef58;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  border-left: 12px solid #a7cd47;
  backface-visibility: hidden;
}
.monthly-book-cover > span {
  font: 8px monospace;
  letter-spacing: 1px;
}
.monthly-book-cover > strong {
  font: 900 64px/0.84 sans-serif;
  letter-spacing: -6px;
  margin-top: 18px;
}
.monthly-book-cover > strong span {
  font-size: 20px;
  vertical-align: top;
  letter-spacing: 0;
}
.monthly-cover-art {
  font: 140px/0.9 Georgia;
  text-align: right;
  flex: 1;
}
.monthly-book-cover h2 {
  font: 700 19px/1.1 sans-serif;
  margin: 12px 0;
}
.monthly-book-cover footer {
  display: flex;
  justify-content: space-between;
  border-top: 2px solid;
  padding-top: 10px;
  font: 10px monospace;
}
.monthly-book:hover .monthly-book-cover,
.monthly-book:focus-visible .monthly-book-cover {
  transform: rotateY(-65deg);
}
.monthly-book:hover .monthly-book-paper {
  transform: rotateY(-8deg);
}
.monthly-intro h2 {
  font:
    700 clamp(40px, 6vw, 76px)/1 Georgia,
    serif;
  margin: 20px 0;
}
.monthly-intro em {
  color: #c5ef58;
}
.monthly-intro p {
  max-width: 280px;
  line-height: 1.7;
}
.monthly-contents {
  list-style: none;
  padding: 0;
}
.monthly-contents li {
  display: flex;
  align-items: start;
  gap: 24px;
  border-top: 1px solid #7774;
  padding: 24px 0;
}
.monthly-contents li > span {
  font: 32px Georgia;
  color: #8e987e;
}
.monthly-contents a {
  flex: 1;
  color: inherit;
  text-decoration: none;
}
.monthly-contents h3 {
  margin: 8px 0;
}
.monthly-contents small {
  text-transform: uppercase;
  line-height: 1.8;
}
.monthly-reader-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0;
}
.monthly-reader-bar a {
  color: inherit;
}
@media (max-width: 700px) {
  .monthly-hero {
    gap: 45px;
    flex-direction: column;
    padding: 45px 15px;
  }
  .monthly-book {
    width: 260px;
    height: 370px;
  }
  .monthly-intro {
    text-align: center;
  }
  .monthly-intro h2 {
    font-size: 48px;
  }
  .monthly-reader-bar {
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .monthly-book-cover,
  .monthly-book-paper {
    transition: none;
  }
}
</style>
