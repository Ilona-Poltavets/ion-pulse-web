<script setup lang="ts">
import ContentBody from '@/components/content/ContentBody.vue'
import PreviewModal from '@/components/content/PreviewModal.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'
import {
  createComment,
  getPublishedPublication,
  listAuthorSubscriptions,
  listDigestItems,
  listGames,
  listComments,
  reportComment,
  reportPublication,
  setPublicationRating,
  subscribeToAuthor,
  unsubscribeFromAuthor,
  type AuthorSubscription,
  type Comment,
  type Game,
  type DigestItem,
  type PublishedPublication,
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const auth = useAuthStore()
const publication = ref<PublishedPublication | null>(null)
const comments = ref<Comment[]>([])
const games = ref<Game[]>([])
const digestItems = ref<DigestItem[]>([])
const authorSubscriptions = ref<AuthorSubscription[]>([])
const rating = ref<number | null>(null)
const commentBody = ref('')
const mediaPicker = ref<'emoji' | 'sticker' | 'gif' | null>(null)
const selectedCommentMedia = ref<{ kind: 'gif' | 'sticker'; value: string } | null>(null)
const gifUrl = ref('')
const replyTo = ref<string | null>(null)
const reportReason = ref('')
const reportTarget = ref<{ type: 'publication' | 'comment'; id: string } | null>(null)
const error = ref('')
const loading = ref(true)
let managedHeadLinks: HTMLLinkElement[] = []
const emojis = ['😀', '😂', '😍', '🤔', '😭', '😡', '👍', '🔥', '🎮', '🏆', '👾', '💚']
const stickers = ['🎮✨', '🔥🔥🔥', '🏆😎', '👾⚡', 'GG 💚', 'WOW 🤯', 'NOPE 🙅', 'ИМБА 🚀']

const topLevelComments = computed(() =>
  comments.value.filter((comment) => comment.parent_id === null),
)
const reviewGame = computed(() =>
  publication.value?.game_id
    ? (games.value.find((game) => game.id === publication.value?.game_id) ?? null)
    : null,
)
const isSubscribedToAuthor = computed(() =>
  publication.value
    ? authorSubscriptions.value.some((item) => item.author_id === publication.value?.author_id)
    : false,
)
const canManageAuthorSubscription = computed(
  () => auth.isAuthenticated && publication.value?.author_id !== auth.user?.id,
)

function repliesFor(commentId: string): Comment[] {
  return comments.value.filter((comment) => comment.parent_id === commentId)
}

function publicationId(): string | null {
  return typeof route.params.id === 'string' ? route.params.id : null
}

function requestedLocale(): 'ru' | 'en' {
  return route.params.locale === 'en'
    ? 'en'
    : route.params.locale === 'ru'
      ? 'ru'
      : (locale.value as 'ru' | 'en')
}

function updatePublicationSeo(id: string, title: string): void {
  document.title = `${title} — Ion Pulse`
  for (const link of managedHeadLinks) link.remove()
  const paths: Array<['canonical' | 'alternate', string, 'ru' | 'en' | undefined]> = [
    ['canonical', `/${requestedLocale()}/publications/${id}`, undefined],
    ['alternate', `/ru/publications/${id}`, 'ru'],
    ['alternate', `/en/publications/${id}`, 'en'],
  ]
  managedHeadLinks = paths.map(([rel, path, hreflang]) => {
    const link = document.createElement('link')
    link.rel = rel
    link.href = new URL(path, window.location.origin).href
    if (hreflang) link.hreflang = hreflang
    document.head.append(link)
    return link
  })
}

async function load(): Promise<void> {
  const id = publicationId()
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    const [loadedPublication, loadedGames] = await Promise.all([
      getPublishedPublication(id, requestedLocale()),
      listGames(),
    ])
    publication.value = loadedPublication
    games.value = loadedGames
    try {
      comments.value = await listComments(id)
    } catch (caught) {
      comments.value = []
      error.value = caught instanceof Error ? caught.message : t('publications.loadError')
    }
    digestItems.value =
      loadedPublication.content_type === 'digest'
        ? await listDigestItems(id, requestedLocale())
        : []
    authorSubscriptions.value = auth.isAuthenticated ? await listAuthorSubscriptions() : []
    updatePublicationSeo(id, loadedPublication.title)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('publications.loadError')
  } finally {
    loading.value = false
  }
}

async function toggleAuthorSubscription(): Promise<void> {
  if (!publication.value) return
  if (!auth.isAuthenticated) {
    await router.push('/login')
    return
  }
  try {
    if (isSubscribedToAuthor.value) {
      await unsubscribeFromAuthor(publication.value.author_id)
      authorSubscriptions.value = authorSubscriptions.value.filter(
        (item) => item.author_id !== publication.value?.author_id,
      )
    } else {
      await subscribeToAuthor(publication.value.author_id)
      authorSubscriptions.value.push({
        author_id: publication.value.author_id,
        display_name: publication.value.author_name,
        subscribed_at: new Date().toISOString(),
      })
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('publications.subscriptionError')
  }
}

async function leaveRating(value: number): Promise<void> {
  const id = publicationId()
  if (!id) return
  if (!auth.isAuthenticated) {
    await router.push('/login')
    return
  }
  try {
    rating.value = (await setPublicationRating(id, value)).value
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('publications.ratingError')
  }
}

async function submitComment(): Promise<void> {
  const id = publicationId()
  if (!id) return
  if (!auth.isAuthenticated) {
    await router.push('/login')
    return
  }
  if (!commentBody.value.trim() && !selectedCommentMedia.value) {
    error.value = t('publications.commentContentRequired')
    return
  }
  try {
    const comment = await createComment(id, {
      body: commentBody.value,
      parent_id: replyTo.value ?? undefined,
      media_kind: selectedCommentMedia.value?.kind,
      media_value: selectedCommentMedia.value?.value,
    })
    comments.value.push(comment)
    commentBody.value = ''
    selectedCommentMedia.value = null
    gifUrl.value = ''
    mediaPicker.value = null
    replyTo.value = null
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('publications.commentError')
  }
}

function insertEmoji(emoji: string): void {
  commentBody.value += emoji
}

function selectSticker(sticker: string): void {
  selectedCommentMedia.value = { kind: 'sticker', value: sticker }
  mediaPicker.value = null
}

function attachGif(): void {
  const value = gifUrl.value.trim()
  if (!/^https?:\/\//i.test(value)) {
    error.value = t('publications.gifUrlInvalid')
    return
  }
  selectedCommentMedia.value = { kind: 'gif', value }
  mediaPicker.value = null
}

async function submitReport(): Promise<void> {
  if (!reportTarget.value) return
  if (!auth.isAuthenticated) {
    await router.push('/login')
    return
  }
  try {
    if (reportTarget.value.type === 'publication') {
      await reportPublication(reportTarget.value.id, reportReason.value)
    } else {
      await reportComment(reportTarget.value.id, reportReason.value)
    }
    reportReason.value = ''
    reportTarget.value = null
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('publications.reportError')
  }
}

onMounted(() => {
  if (route.params.locale === 'ru' || route.params.locale === 'en')
    locale.value = route.params.locale
  void load()
})
onUnmounted(() => managedHeadLinks.forEach((link) => link.remove()))
watch(locale, () => {
  if (!route.params.locale) void load()
})
watch(
  () => [route.params.id, route.params.locale],
  () => {
    if (route.params.locale === 'ru' || route.params.locale === 'en')
      locale.value = route.params.locale
    void load()
  },
)
</script>

<template>
  <section class="publication-page">
    <p v-if="loading" class="empty-state">{{ t('publications.loading') }}</p>
    <p v-else-if="error && !publication" class="form-error">{{ error }}</p>
    <article v-else-if="publication" class="publication-article">
      <RouterLink class="back-link" to="/">{{ t('publications.back') }}</RouterLink>
      <div class="publication-card-meta">
        <span>{{ publication.category_slug }}</span>
        <span>{{ publication.content_type }}</span>
        <span>{{ new Date(publication.published_at).toLocaleDateString(locale) }}</span>
      </div>
      <div class="publication-author">
        <span>{{ t('publications.author', { name: publication.author_name }) }}</span>
        <button
          v-if="canManageAuthorSubscription && !isSubscribedToAuthor"
          class="author-subscribe-action"
          type="button"
          @click="toggleAuthorSubscription"
        >
          {{ t('publications.subscribeAuthor') }}
        </button>
        <span v-else-if="canManageAuthorSubscription" class="author-subscribed-label">{{
          t('publications.subscribedAuthor')
        }}</span>
      </div>
      <p v-if="reviewGame || publication.review_score !== null" class="publication-review-meta">
        <span v-if="reviewGame">{{ t('publications.game', { title: reviewGame.title }) }}</span>
        <span v-if="publication.review_score !== null">{{
          t('publications.authorScore', { score: publication.review_score })
        }}</span>
      </p>
      <h1>{{ publication.title }}</h1>
      <p class="publication-summary">{{ publication.summary }}</p>
      <p v-if="!publication.translation_available" class="translation-notice">
        {{ t('publications.translationFallback', { locale: publication.locale.toUpperCase() }) }}
      </p>
      <ContentBody class="publication-body" :body="publication.body" />
      <section
        v-if="digestItems.length"
        class="digest-items"
        :aria-label="t('publications.weeklyStories')"
      >
        <h2>{{ t('publications.weeklyStories') }}</h2>
        <RouterLink v-for="item in digestItems" :key="item.id" :to="`/publications/${item.id}`">
          <small>{{ item.category_slug }}</small
          ><strong>{{ item.title }}</strong
          ><span>{{ item.summary }}</span>
        </RouterLink>
      </section>
      <RouterLink
        v-if="
          publication.locale !== publication.source_locale &&
          (auth.user?.roles.includes('editor') || auth.user?.roles.includes('administrator'))
        "
        class="text-link localization-link"
        :to="`/editorial/localizations/${publication.id}/${publication.locale}`"
      >
        {{ t('publications.editTranslation') }}
      </RouterLink>
      <button
        class="report-button"
        type="button"
        @click="reportTarget = { type: 'publication', id: publication.id }"
      >
        {{ t('publications.reportStory') }}
      </button>

      <section class="rating-panel" :aria-label="t('publications.ratingLabel')">
        <strong>{{ t('publications.rate') }}</strong>
        <div class="rating-buttons">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            :class="{ active: rating === value }"
            :aria-label="t('publications.rateLabel', { value })"
            @click="leaveRating(value)"
          >
            {{ value }}
          </button>
        </div>
      </section>

      <section class="comments-panel" aria-labelledby="comments-title">
        <h2 id="comments-title">{{ t('publications.comments') }}</h2>
        <form class="comment-form" @submit.prevent="submitComment">
          <p v-if="replyTo" class="reply-indicator">
            {{ t('publications.replyToComment') }}
            <button type="button" @click="replyTo = null">{{ t('publications.cancel') }}</button>
          </p>
          <textarea
            v-model.trim="commentBody"
            maxlength="5000"
            :placeholder="t('publications.commentPlaceholder')"
          />
          <div class="comment-media-toolbar">
            <button
              type="button"
              :class="{ active: mediaPicker === 'emoji' }"
              @click="mediaPicker = mediaPicker === 'emoji' ? null : 'emoji'"
            >
              ☺ <span>{{ t('publications.emoji') }}</span>
            </button>
            <button
              type="button"
              :class="{ active: mediaPicker === 'sticker' }"
              @click="mediaPicker = mediaPicker === 'sticker' ? null : 'sticker'"
            >
              ◇ <span>{{ t('publications.stickers') }}</span>
            </button>
            <button
              type="button"
              :class="{ active: mediaPicker === 'gif' }"
              @click="mediaPicker = mediaPicker === 'gif' ? null : 'gif'"
            >
              GIF
            </button>
          </div>
          <div v-if="mediaPicker" class="comment-media-picker">
            <div v-if="mediaPicker === 'emoji'" class="emoji-grid">
              <button
                v-for="emoji in emojis"
                :key="emoji"
                type="button"
                @click="insertEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
            <div v-else-if="mediaPicker === 'sticker'" class="sticker-grid">
              <button
                v-for="sticker in stickers"
                :key="sticker"
                type="button"
                @click="selectSticker(sticker)"
              >
                {{ sticker }}
              </button>
            </div>
            <div v-else class="gif-picker">
              <input
                v-model.trim="gifUrl"
                type="url"
                :placeholder="t('publications.gifUrlPlaceholder')"
                @keydown.enter.prevent="attachGif"
              />
              <button class="button button-secondary" type="button" @click="attachGif">
                {{ t('publications.attachGif') }}
              </button>
            </div>
          </div>
          <div v-if="selectedCommentMedia" class="selected-comment-media">
            <img
              v-if="selectedCommentMedia.kind === 'gif'"
              :src="selectedCommentMedia.value"
              alt=""
            />
            <span v-else>{{ selectedCommentMedia.value }}</span>
            <button
              type="button"
              :aria-label="t('publications.removeMedia')"
              @click="selectedCommentMedia = null"
            >
              ×
            </button>
          </div>
          <button class="button button-primary">{{ t('publications.send') }}</button>
        </form>
        <p v-if="!comments.length" class="empty-state">{{ t('publications.noComments') }}</p>
        <ol v-else class="comment-list">
          <li v-for="comment in topLevelComments" :key="comment.id">
            <small>{{ new Date(comment.created_at).toLocaleString(locale) }}</small>
            <p v-if="comment.body">{{ comment.body }}</p>
            <img
              v-if="comment.media_kind === 'gif' && comment.media_value"
              class="comment-gif"
              :src="comment.media_value"
              alt="GIF"
              loading="lazy"
            />
            <div v-else-if="comment.media_kind === 'sticker'" class="comment-sticker">
              {{ comment.media_value }}
            </div>
            <button class="reply-button" type="button" @click="replyTo = comment.id">
              {{ t('publications.reply') }}
            </button>
            <button
              class="report-button"
              type="button"
              @click="reportTarget = { type: 'comment', id: comment.id }"
            >
              {{ t('publications.report') }}
            </button>
            <ol v-if="repliesFor(comment.id).length" class="reply-list">
              <li v-for="reply in repliesFor(comment.id)" :key="reply.id">
                <small>{{ new Date(reply.created_at).toLocaleString(locale) }}</small>
                <p v-if="reply.body">{{ reply.body }}</p>
                <img
                  v-if="reply.media_kind === 'gif' && reply.media_value"
                  class="comment-gif"
                  :src="reply.media_value"
                  alt="GIF"
                  loading="lazy"
                />
                <div v-else-if="reply.media_kind === 'sticker'" class="comment-sticker">
                  {{ reply.media_value }}
                </div>
                <button
                  class="report-button"
                  type="button"
                  @click="reportTarget = { type: 'comment', id: reply.id }"
                >
                  {{ t('publications.report') }}
                </button>
              </li>
            </ol>
          </li>
        </ol>
      </section>
      <form v-if="reportTarget" class="report-form" @submit.prevent="submitReport">
        <strong>{{ t('publications.reportTitle') }}</strong>
        <textarea
          v-model.trim="reportReason"
          required
          minlength="10"
          maxlength="1000"
          :placeholder="t('publications.reportReason')"
        />
        <div class="editor-actions">
          <button class="button button-primary">{{ t('publications.send') }}</button>
          <button class="button button-secondary" type="button" @click="reportTarget = null">
            {{ t('publications.cancel') }}
          </button>
        </div>
      </form>
    </article>
    <PreviewModal
      :model-value="Boolean(error && publication)"
      :title="t('publications.actionErrorTitle')"
      @update:model-value="
        (value) => {
          if (!value) error = ''
        }
      "
    >
      <div class="publication-error-modal" role="alert">
        <span aria-hidden="true">!</span>
        <h2>{{ t('publications.actionErrorTitle') }}</h2>
        <p>{{ error }}</p>
      </div>
    </PreviewModal>
  </section>
</template>

<style scoped>
.publication-error-modal {
  width: min(100%, 520px);
  margin: auto;
  padding: clamp(24px, 5vw, 48px);
  text-align: center;
  background: var(--surface);
  border: 1px solid rgb(255 123 123 / 35%);
  border-radius: 12px;
}
.publication-error-modal > span {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  margin: 0 auto 18px;
  color: #ff9292;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-weight: 700;
}
.publication-error-modal h2 {
  margin: 0 0 10px;
  font-size: 1.35rem;
}
.publication-error-modal p {
  margin: 0;
  color: #ff9292;
  overflow-wrap: anywhere;
}
</style>
