<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createDraft,
  listCategories,
  listEditableDigestItems,
  listGames,
  listMyDrafts,
  listPublishedPublications,
  listPublicationRevisions,
  restorePublicationRevision,
  replaceDigestItems,
  updateDraft,
  type DraftCreatePayload,
  type Category,
  type Game,
  type FeedPublication,
  type PublicationRevision,
} from '@/services/api'
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const draftId = typeof route.params.id === 'string' ? route.params.id : null
const draft = ref<DraftCreatePayload>({
  category_slug: 'reviews',
  content_type: 'article',
  game_id: null,
  review_score: null,
  source_locale: 'ru',
  title: '',
  summary: '',
  body: '',
})
const message = ref('')
const revisions = ref<PublicationRevision[]>([])
const isReadyForAutosave = ref(false)
const skipNextAutosave = ref(false)
const isPreviewVisible = ref(false)
const categories = ref<Category[]>([])
const games = ref<Game[]>([])
const digestCandidates = ref<FeedPublication[]>([])
const selectedDigestItemIds = ref<string[]>([])
let autosaveTimer: ReturnType<typeof setTimeout> | undefined

const wordCount = computed(() =>
  draft.value.body.trim() ? draft.value.body.trim().split(/\s+/).length : 0,
)
const canCreateDigest = computed(() =>
  auth.user?.roles.some((role) => ['editor', 'moderator', 'administrator'].includes(role)),
)

function applyDraft(next: DraftCreatePayload): void {
  draft.value = {
    category_slug: next.category_slug,
    content_type: next.content_type,
    game_id: next.game_id,
    review_score: next.review_score,
    source_locale: next.source_locale,
    title: next.title,
    summary: next.summary,
    body: next.body,
  }
}

onMounted(async () => {
  if (!auth.user) await auth.restore()
  try {
    ;[categories.value, games.value, digestCandidates.value] = await Promise.all([
      listCategories(draft.value.source_locale),
      listGames(),
      listPublishedPublications(draft.value.source_locale, { limit: 50 }),
    ])
  } catch {
    categories.value = []
  }
  if (!draftId) return
  try {
    const existing = (await listMyDrafts()).find((item) => item.id === draftId)
    if (!existing) {
      message.value = 'Черновик не найден или недоступен для редактирования'
      return
    }
    applyDraft(existing)
    if (existing.content_type === 'digest') {
      selectedDigestItemIds.value = (await listEditableDigestItems(draftId)).map((item) => item.id)
    }
    revisions.value = await listPublicationRevisions(draftId)
    isReadyForAutosave.value = true
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить черновик'
  }
})

watch(
  draft,
  () => {
    if (!draftId || !isReadyForAutosave.value) return
    if (skipNextAutosave.value) {
      skipNextAutosave.value = false
      return
    }
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => void saveDraft(false), 900)
  },
  { deep: true },
)

watch(
  () => draft.value.content_type,
  (contentType) => {
    if (contentType !== 'review') {
      draft.value.game_id = null
      draft.value.review_score = null
    }
  },
)

onBeforeUnmount(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
})

async function restoreRevision(revisionNumber: number): Promise<void> {
  if (!draftId) return
  try {
    const restored = await restorePublicationRevision(draftId, revisionNumber)
    skipNextAutosave.value = true
    applyDraft(restored)
    revisions.value = await listPublicationRevisions(draftId)
    message.value = `Восстановлена версия ${revisionNumber}`
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось восстановить версию'
  }
}

async function save(): Promise<void> {
  await saveDraft(true)
}

async function saveDraft(returnToProfile: boolean): Promise<void> {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  try {
    if (draftId) {
      await updateDraft(draftId, {
        category_slug: draft.value.category_slug,
        content_type: draft.value.content_type,
        game_id: draft.value.game_id,
        review_score: draft.value.review_score,
        title: draft.value.title,
        summary: draft.value.summary,
        body: draft.value.body,
      })
    } else {
      if (draft.value.content_type === 'digest' && !selectedDigestItemIds.value.length) {
        message.value = 'Добавьте хотя бы один материал в дайджест'
        return
      }
      const created = await createDraft(draft.value)
      if (created.content_type === 'digest') {
        await replaceDigestItems(created.id, selectedDigestItemIds.value)
      }
    }
    if (draftId && draft.value.content_type === 'digest') {
      await replaceDigestItems(draftId, selectedDigestItemIds.value)
    }
    if (returnToProfile) await router.push('/profile')
    else message.value = 'Черновик сохранён автоматически'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось сохранить черновик'
  }
}
</script>
<template>
  <section class="editor-page">
    <header class="editor-header">
      <div>
        <p class="eyebrow">{{ draftId ? 'EDIT DRAFT' : 'NEW PUBLICATION' }}</p>
        <h1>{{ draftId ? 'Редактирование материала' : 'Новый материал' }}</h1>
      </div>
      <div class="editor-status">
        <span></span
        >{{ message || (draftId ? 'Автосохранение включено' : 'Черновик ещё не сохранён') }}
      </div>
    </header>
    <div class="editor-layout">
      <form class="editor-form" @submit.prevent="save">
        <div class="editor-meta-fields">
          <label
            >Категория<select v-model="draft.category_slug">
              <option v-for="category in categories" :key="category.slug" :value="category.slug">
                {{ category.name }}
              </option>
            </select></label
          >
          <label
            >Язык<select v-model="draft.source_locale" :disabled="Boolean(draftId)">
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select></label
          >
          <label
            >Тип материала<select v-model="draft.content_type">
              <option value="article">Статья</option>
              <option value="review">Ревью</option>
              <option value="news">Новость</option>
              <option value="guide">Гайд</option>
              <option v-if="canCreateDigest" value="digest">Дайджест</option>
            </select></label
          >
          <template v-if="draft.content_type === 'review'">
            <label
              >Игра<select v-model="draft.game_id">
                <option :value="null">Не привязывать игру</option>
                <option v-for="game in games" :key="game.id" :value="game.id">
                  {{ game.title }}
                </option>
              </select></label
            >
            <label
              >Оценка автора (0–10)<input
                v-model.number="draft.review_score"
                type="number"
                min="0"
                max="10"
                step="0.1"
              />
            </label>
          </template>
          <fieldset v-if="draft.content_type === 'digest'" class="digest-selector">
            <legend>Материалы дайджеста</legend>
            <label v-for="candidate in digestCandidates" :key="candidate.id" class="checkbox-label">
              <input v-model="selectedDigestItemIds" type="checkbox" :value="candidate.id" />
              <span
                ><strong>{{ candidate.title }}</strong
                ><small>{{ candidate.summary }}</small></span
              >
            </label>
          </fieldset>
        </div>
        <label class="editor-title-field"
          >Заголовок<input
            v-model.trim="draft.title"
            required
            minlength="5"
            placeholder="Сильный заголовок для материала"
        /></label>
        <label
          >Анонс<textarea
            v-model.trim="draft.summary"
            required
            minlength="20"
            placeholder="Коротко объясните, о чём этот материал"
          />
        </label>
        <label class="editor-body-field"
          >Текст<textarea
            v-model.trim="draft.body"
            required
            minlength="50"
            placeholder="Начните писать…"
          />
        </label>
        <div class="editor-footer">
          <small>{{ wordCount }} слов · минимум 50 символов</small>
          <div class="editor-actions">
            <button
              class="button button-secondary"
              type="button"
              @click="isPreviewVisible = !isPreviewVisible"
            >
              {{ isPreviewVisible ? 'Скрыть предпросмотр' : 'Предпросмотр' }}
            </button>
            <button class="button button-primary">
              {{ draftId ? 'Сохранить и выйти' : 'Создать черновик' }}
            </button>
          </div>
        </div>
      </form>
      <aside
        v-if="draftId && revisions.length"
        class="revision-history editor-revisions"
        aria-label="История версий"
      >
        <p class="eyebrow">REVISION HISTORY</p>
        <h2>История версий</h2>
        <ol>
          <li v-for="revision in revisions" :key="revision.revision_number">
            <div>
              <strong>Версия {{ revision.revision_number }}</strong
              ><small>{{ new Date(revision.created_at).toLocaleString() }}</small>
            </div>
            <button
              class="button button-secondary"
              type="button"
              @click="restoreRevision(revision.revision_number)"
            >
              Восстановить
            </button>
          </li>
        </ol>
      </aside>
    </div>
    <section v-if="isPreviewVisible" class="draft-preview" aria-labelledby="preview-title">
      <div class="preview-heading">
        <p class="eyebrow">PUBLICATION PREVIEW</p>
        <button class="account-link" type="button" @click="isPreviewVisible = false">
          Закрыть
        </button>
      </div>
      <p class="publication-card-meta">
        <span>{{ draft.category_slug }}</span
        ><span>{{ draft.source_locale.toUpperCase() }}</span>
      </p>
      <h1 id="preview-title">{{ draft.title || 'Заголовок материала' }}</h1>
      <p class="publication-summary">{{ draft.summary || 'Анонс материала появится здесь.' }}</p>
      <div class="publication-body">{{ draft.body || 'Текст материала появится здесь.' }}</div>
    </section>
  </section>
</template>
