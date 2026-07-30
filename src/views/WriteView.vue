<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
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
  }
}
</script>
<template>
  <section class="editor-page">
    <header class="editor-header">
      <div>
        <p class="eyebrow">{{ draftId ? t('editor.editEyebrow') : t('editor.newEyebrow') }}</p>
        <h1>{{ draftId ? t('editor.editTitle') : t('editor.newTitle') }}</h1>
      </div>
      <div class="editor-status">
        <span></span
        >{{ message || (draftId ? t('editor.autosaveEnabled') : t('editor.unsavedDraft')) }}
      </div>
    </header>
    <div class="editor-layout">
      <form class="editor-form" @submit.prevent="save">
        <div class="editor-meta-fields">
          <label
            >{{ t('editor.category') }}<select v-model="draft.category_slug">
              <option v-for="category in categories" :key="category.slug" :value="category.slug">
                {{ category.name }}
              </option>
            </select></label
          >
          <label
            >{{ t('editor.language') }}<select v-model="draft.source_locale" :disabled="Boolean(draftId)">
              <option value="ru">{{ t('editor.russian') }}</option>
              <option value="en">English</option>
            </select></label
          >
          <label
            >{{ t('editor.contentType') }}<select v-model="draft.content_type">
              <option value="article">{{ t('editor.types.article') }}</option>
              <option value="review">{{ t('editor.types.review') }}</option>
              <option value="news">{{ t('editor.types.news') }}</option>
              <option value="guide">{{ t('editor.types.guide') }}</option>
              <option v-if="canCreateDigest" value="digest">{{ t('editor.types.digest') }}</option>
            </select></label
          >
          <template v-if="draft.content_type === 'review'">
            <label
              >{{ t('editor.game') }}<select v-model="draft.game_id">
                <option :value="null">{{ t('editor.noGame') }}</option>
                <option v-for="game in games" :key="game.id" :value="game.id">
                  {{ game.title }}
                </option>
              </select></label
            >
            <label
              >{{ t('editor.authorScore') }}<input
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
        </div>
        <label class="editor-title-field"
          >{{ t('editor.headline') }}<input
            v-model.trim="draft.title"
            required
            minlength="5"
            :placeholder="t('editor.headlinePlaceholder')"
        /></label>
        <label
          >{{ t('editor.summary') }}<textarea
            v-model.trim="draft.summary"
            required
            minlength="20"
            :placeholder="t('editor.summaryPlaceholder')"
          />
        </label>
        <label class="editor-body-field"
          >{{ t('editor.body') }}<textarea
            v-model.trim="draft.body"
            required
            minlength="50"
            :placeholder="t('editor.bodyPlaceholder')"
          />
        </label>
        <div class="editor-footer">
          <small>{{ t('editor.wordCount', { count: wordCount }) }}</small>
          <div class="editor-actions">
            <button
              class="button button-secondary"
              type="button"
              @click="isPreviewVisible = !isPreviewVisible"
            >
              {{ isPreviewVisible ? t('editor.hidePreview') : t('editor.preview') }}
            </button>
            <button class="button button-primary">
              {{ draftId ? t('editor.saveAndExit') : t('editor.createDraft') }}
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
    <section v-if="isPreviewVisible" class="draft-preview" aria-labelledby="preview-title">
      <div class="preview-heading">
        <p class="eyebrow">{{ t('editor.previewEyebrow') }}</p>
        <button class="account-link" type="button" @click="isPreviewVisible = false">
          {{ t('editor.close') }}
        </button>
      </div>
      <p class="publication-card-meta">
        <span>{{ draft.category_slug }}</span
        ><span>{{ draft.source_locale.toUpperCase() }}</span>
      </p>
      <h1 id="preview-title">{{ draft.title || t('editor.previewHeadline') }}</h1>
      <p class="publication-summary">{{ draft.summary || t('editor.previewSummary') }}</p>
      <div class="publication-body">{{ draft.body || t('editor.previewBody') }}</div>
    </section>
  </section>
</template>
