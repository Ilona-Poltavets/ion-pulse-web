<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import BlockEditor from '@/components/content/BlockEditor.vue'
import ContentBody from '@/components/content/ContentBody.vue'
import PreviewModal from '@/components/content/PreviewModal.vue'
import { contentText } from '@/components/content/contentFormat'
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
const { locale, t } = useI18n()
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
const isSaving = ref(false)
const validationErrors = ref<Record<string, string>>({})
const categories = ref<Category[]>([])
const games = ref<Game[]>([])
const digestCandidates = ref<FeedPublication[]>([])
const selectedDigestItemIds = ref<string[]>([])
let autosaveTimer: ReturnType<typeof setTimeout> | undefined

const wordCount = computed(() =>
  contentText(draft.value.body).trim()
    ? contentText(draft.value.body).trim().split(/\s+/).length
    : 0,
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
      message.value = t('editor.draftUnavailable')
      return
    }
    applyDraft(existing)
    if (existing.content_type === 'digest') {
      selectedDigestItemIds.value = (await listEditableDigestItems(draftId)).map((item) => item.id)
    }
    revisions.value = await listPublicationRevisions(draftId)
    isReadyForAutosave.value = true
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('editor.loadError')
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
    message.value = t('editor.revisionRestored', { number: revisionNumber })
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('editor.restoreError')
  }
}

async function save(): Promise<void> {
  await saveDraft(true)
}

async function saveDraft(returnToProfile: boolean): Promise<void> {
  if (isSaving.value) {
    if (!returnToProfile) {
      if (autosaveTimer) clearTimeout(autosaveTimer)
      autosaveTimer = setTimeout(() => void saveDraft(false), 900)
    }
    return
  }
  if (autosaveTimer) clearTimeout(autosaveTimer)
  validationErrors.value = {}
  const titleLength = draft.value.title.trim().length
  const summaryLength = draft.value.summary.trim().length
  const bodyLength = contentText(draft.value.body).trim().length
  if (titleLength < 5)
    validationErrors.value.title = 'Заголовок должен содержать минимум 5 символов.'
  else if (titleLength > 240)
    validationErrors.value.title = 'Заголовок не может быть длиннее 240 символов.'
  if (summaryLength < 20)
    validationErrors.value.summary = 'Анонс должен содержать минимум 20 символов.'
  else if (summaryLength > 500)
    validationErrors.value.summary = 'Анонс не может быть длиннее 500 символов.'
  if (bodyLength < 50)
    validationErrors.value.body = 'Добавьте минимум 50 символов текста материала.'
  if (Object.keys(validationErrors.value).length) {
    message.value = 'Проверьте выделенные поля.'
    if (returnToProfile) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      )
    }
    return
  }
  isSaving.value = true
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
        message.value = t('editor.digestRequired')
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
    else message.value = t('editor.autoSaved')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('editor.saveError')
    if (error instanceof Error) {
      const field = ['title', 'summary', 'body'].find((name) =>
        error.message.toLowerCase().startsWith(`${name}:`),
      )
      if (field) validationErrors.value[field] = error.message.split(':').slice(1).join(':').trim()
    }
  } finally {
    isSaving.value = false
  }
}
</script>
<template>
  <section class="editor-page">
    <header class="editor-header">
      <div class="editor-heading">
        <p class="eyebrow">{{ draftId ? t('editor.editEyebrow') : t('editor.newEyebrow') }}</p>
        <h1 class="editor-inline-title">
          <span aria-hidden="true">{{ draft.title || t('editor.headlinePlaceholder') }} </span>
          <textarea
            v-model.trim="draft.title"
            form="publication-editor-form"
            :aria-label="t('editor.headline')"
            :placeholder="t('editor.headlinePlaceholder')"
            required
            minlength="5"
            maxlength="240"
            rows="1"
            :aria-invalid="Boolean(validationErrors.title)"
            @keydown.enter.prevent
          />
        </h1>
        <small v-if="validationErrors.title" class="editor-field-error" role="alert">{{
          validationErrors.title
        }}</small>
      </div>
      <div class="editor-status">
        <span></span
        >{{ message || (draftId ? t('editor.autosaveEnabled') : t('editor.unsavedDraft')) }}
      </div>
    </header>
    <div class="editor-layout">
      <form id="publication-editor-form" class="editor-form" @submit.prevent="save">
        <div class="editor-meta-fields">
          <label
            >{{ t('editor.category')
            }}<select v-model="draft.category_slug">
              <option v-for="category in categories" :key="category.slug" :value="category.slug">
                {{ category.name }}
              </option>
            </select></label
          >
          <label
            >{{ t('editor.language')
            }}<select v-model="draft.source_locale" :disabled="Boolean(draftId)">
              <option value="ru">{{ t('editor.russian') }}</option>
              <option value="en">English</option>
            </select></label
          >
          <label
            >{{ t('editor.contentType')
            }}<select v-model="draft.content_type">
              <option value="article">{{ t('editor.types.article') }}</option>
              <option value="review">{{ t('editor.types.review') }}</option>
              <option value="news">{{ t('editor.types.news') }}</option>
              <option value="guide">{{ t('editor.types.guide') }}</option>
              <option v-if="canCreateDigest" value="digest">{{ t('editor.types.digest') }}</option>
            </select></label
          >
          <template v-if="draft.content_type === 'review'">
            <label
              >{{ t('editor.game')
              }}<select v-model="draft.game_id">
                <option :value="null">{{ t('editor.noGame') }}</option>
                <option v-for="game in games" :key="game.id" :value="game.id">
                  {{ game.title }}
                </option>
              </select></label
            >
            <label
              >{{ t('editor.authorScore')
              }}<input
                v-model.number="draft.review_score"
                type="number"
                min="0"
                max="10"
                step="0.1"
              />
            </label>
          </template>
          <fieldset v-if="draft.content_type === 'digest'" class="digest-selector">
            <legend>{{ t('editor.digestItems') }}</legend>
            <label v-for="candidate in digestCandidates" :key="candidate.id" class="checkbox-label">
              <input v-model="selectedDigestItemIds" type="checkbox" :value="candidate.id" />
              <span
                ><strong>{{ candidate.title }}</strong
                ><small>{{ candidate.summary }}</small></span
              >
            </label>
          </fieldset>
          <div class="editor-sidebar-actions">
            <button type="button" class="button button-secondary" @click="isPreviewVisible = true">
              {{ t('editor.preview') }}
            </button>
            <button type="submit" class="button button-primary" :disabled="isSaving">
              {{ t('editor.saveAndExit') }}
            </button>
            <p v-if="message" role="status">{{ message }}</p>
          </div>
        </div>
        <label
          >{{ t('editor.summary')
          }}<textarea
            v-model.trim="draft.summary"
            required
            minlength="20"
            maxlength="500"
            :aria-invalid="Boolean(validationErrors.summary)"
            :placeholder="t('editor.summaryPlaceholder')"
          />
          <span class="editor-field-meta"
            ><small v-if="validationErrors.summary" class="editor-field-error" role="alert">{{
              validationErrors.summary
            }}</small
            ><small>{{ draft.summary.length }}/500</small></span
          >
        </label>
        <BlockEditor
          v-model="draft.body"
          :label="t('editor.body')"
          external-preview
          @preview="isPreviewVisible = true"
        />
        <small
          v-if="validationErrors.body"
          class="editor-field-error editor-body-error"
          role="alert"
          >{{ validationErrors.body }}</small
        >
        <div class="editor-footer">
          <small>{{ t('editor.wordCount', { count: wordCount }) }}</small>
          <div class="editor-actions">
            <button class="button button-secondary" type="button" @click="isPreviewVisible = true">
              {{ t('editor.preview') }}
            </button>
            <button class="button button-primary" :disabled="isSaving">
              {{ t('editor.saveAndExit') }}
            </button>
          </div>
        </div>
      </form>
      <aside
        v-if="draftId && revisions.length"
        class="revision-history editor-revisions"
        :aria-label="t('editor.revisionHistory')"
      >
        <p class="eyebrow">{{ t('editor.revisionsEyebrow') }}</p>
        <h2>{{ t('editor.revisionHistory') }}</h2>
        <ol>
          <li v-for="revision in revisions" :key="revision.revision_number">
            <div>
              <strong>{{ t('editor.version', { number: revision.revision_number }) }}</strong
              ><small>{{ new Date(revision.created_at).toLocaleString(locale) }}</small>
            </div>
            <button
              class="button button-secondary"
              type="button"
              @click="restoreRevision(revision.revision_number)"
            >
              {{ t('editor.restore') }}
            </button>
          </li>
        </ol>
      </aside>
    </div>
    <PreviewModal v-model="isPreviewVisible" :title="t('editor.preview')">
      <article class="editor-article-preview">
        <p class="publication-card-meta">
          <span>{{ draft.category_slug }}</span
          ><span>{{ draft.source_locale.toUpperCase() }}</span>
        </p>
        <h1 id="preview-title">{{ draft.title || t('editor.previewHeadline') }}</h1>
        <p class="publication-summary">{{ draft.summary || t('editor.previewSummary') }}</p>
        <ContentBody class="publication-body" :body="draft.body || t('editor.previewBody')" />
      </article>
    </PreviewModal>
  </section>
</template>

<style scoped>
.editor-heading {
  flex: 0 0 100%;
  width: 100%;
  min-width: 0;
}
.editor-field-error {
  display: block;
  margin-top: 10px;
  color: #ff7b7b;
  font-size: 13px;
  line-height: 1.45;
}
.editor-field-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-weight: 500;
}
.editor-field-meta .editor-field-error {
  margin: 0;
}
.editor-body-error {
  grid-column: 1;
  grid-row: 3;
  margin-top: -14px;
}
.editor-header .editor-inline-title {
  display: grid;
  width: 100%;
  max-width: none;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  line-height: 1.12;
}
.editor-inline-title > span,
.editor-inline-title > textarea {
  grid-area: 1 / 1;
  padding: 4px 0;
  border: 0;
  margin: 0;
  font: inherit;
  letter-spacing: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.editor-inline-title > span {
  visibility: hidden;
  pointer-events: none;
}
.editor-inline-title > textarea {
  width: 100%;
  min-width: 0;
  height: 100%;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: var(--text);
  border-radius: 3px;
}
.editor-inline-title > textarea::placeholder {
  color: var(--muted);
}
.editor-inline-title > textarea:focus-visible {
  outline: 1px solid var(--lime);
  outline-offset: 5px;
}

.editor-layout {
  display: block;
}
.editor-form {
  grid-template-columns: minmax(0, 1fr) 250px;
  align-items: start;
  padding: 0;
  border: 0;
  background: none;
}
.editor-meta-fields {
  position: sticky;
  top: calc(var(--header-height, 78px) + 16px);
  align-self: start;
  max-height: calc(100dvh - var(--header-height, 78px) - 32px);
  overflow-y: auto;
  grid-column: 2;
  grid-row: 1 / span 3;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  gap: 20px;
}
.editor-form > label {
  grid-column: 1;
  grid-row: 1;
}
.editor-form > .block-editor {
  grid-column: 1;
  grid-row: 2;
}
.editor-footer {
  grid-column: 1;
  grid-row: 4;
}
.editor-revisions {
  margin-top: 24px;
}
@media (max-width: 900px) {
  .editor-form {
    grid-template-columns: 1fr;
  }
  .editor-meta-fields {
    position: static;
    max-height: none;
    overflow: visible;
    grid-column: 1;
    grid-row: auto;
  }
  .editor-form > label,
  .editor-form > .block-editor,
  .editor-footer {
    grid-column: 1;
    grid-row: auto;
  }
}
.editor-sidebar-actions {
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--line);
  padding-top: 20px;
  margin-top: 4px;
}
.editor-sidebar-actions .button {
  width: 100%;
  font-size: 12px;
  padding: 12px 10px;
}
.editor-sidebar-actions p {
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.editor-article-preview h1 {
  max-width: none;
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1.15;
  color: var(--text);
  overflow-wrap: anywhere;
}
.editor-article-preview .publication-summary {
  color: var(--muted);
}
.editor-article-preview .publication-card-meta {
  color: var(--lime);
}
</style>
