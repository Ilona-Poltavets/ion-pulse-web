<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  createAuthorApplication,
  deleteMyAccount,
  exportMyData,
  getAuthorApplication,
  getPublicationAiReview,
  listAuthorSubscriptions,
  listGames,
  listGameSubscriptions,
  listMyDrafts,
  subscribeToGame,
  submitDraft,
  unsubscribeFromGame,
  unsubscribeFromAuthor,
  type AuthorApplication,
  type AuthorSubscription,
  type Draft,
  type Game,
  type GameSubscription,
  type PublicationAiReview,
} from '@/services/api'
const auth = useAuthStore()
const { locale, t } = useI18n()
const router = useRouter()
const displayName = ref('')
const message = ref('')
const application = ref<AuthorApplication | null>(null)
const motivation = ref('')
const portfolioUrl = ref('')
const drafts = ref<Draft[]>([])
const games = ref<Game[]>([])
const gameSubscriptions = ref<GameSubscription[]>([])
const authorSubscriptions = ref<AuthorSubscription[]>([])
const aiReviews = ref<Record<string, PublicationAiReview | null>>({})
const deletionPassword = ref('')
const deletionReason = ref('')

function publicationStatus(status: string): string {
  return t(`profile.publicationStatuses.${status}`, status)
}

function aiStatus(status: string | undefined): string {
  return status ? t(`profile.aiStatuses.${status}`, status) : t('profile.aiNotStarted')
}

function roleLabel(role: string): string {
  return t(`profile.roles.${role}`, role)
}

function applicationStatus(status: string): string {
  return t(`profile.applicationStatuses.${status}`, status)
}

function canSubmit(draft: Draft): boolean {
  return draft.status === 'draft' || draft.status === 'changes_requested'
}
onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user) {
    await router.replace('/login')
    return
  }
  displayName.value = auth.user.display_name
  try {
    const [loadedApplication, loadedDrafts, loadedGames, loadedGameSubscriptions, loadedAuthors] =
      await Promise.all([
        getAuthorApplication(),
        listMyDrafts(),
        listGames(),
        listGameSubscriptions(),
        listAuthorSubscriptions(),
      ])
    application.value = loadedApplication
    drafts.value = loadedDrafts
    games.value = loadedGames
    gameSubscriptions.value = loadedGameSubscriptions
    authorSubscriptions.value = loadedAuthors
    const reviewEntries = await Promise.all(
      loadedDrafts.map(
        async (draft) => [draft.id, await getPublicationAiReview(draft.id)] as const,
      ),
    )
    aiReviews.value = Object.fromEntries(reviewEntries)
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.loadError')
  }
})
async function save(): Promise<void> {
  try {
    await auth.update({ display_name: displayName.value })
    message.value = t('profile.saved')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.actionError')
  }
}
async function exportData(): Promise<void> {
  try {
    await exportMyData()
    message.value = t('profile.exportReady')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.exportError')
  }
}
async function deleteAccount(): Promise<void> {
  if (!confirm(t('profile.deleteConfirmation'))) return
  try {
    await deleteMyAccount({
      password: deletionPassword.value,
      reason: deletionReason.value || undefined,
    })
    await auth.signOut()
    await router.replace('/')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.deleteError')
  }
}
async function toggleGameSubscription(game: Game): Promise<void> {
  try {
    const subscribed = gameSubscriptions.value.some((item) => item.id === game.id)
    if (subscribed) {
      await unsubscribeFromGame(game.id)
      gameSubscriptions.value = gameSubscriptions.value.filter((item) => item.id !== game.id)
    } else {
      await subscribeToGame(game.id)
      gameSubscriptions.value.push({ ...game, subscribed_at: new Date().toISOString() })
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.subscriptionError')
  }
}
async function unsubscribeAuthor(authorId: string): Promise<void> {
  try {
    await unsubscribeFromAuthor(authorId)
    authorSubscriptions.value = authorSubscriptions.value.filter(
      (item) => item.author_id !== authorId,
    )
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.subscriptionError')
  }
}
async function submitDraftForReview(id: string): Promise<void> {
  try {
    const updated = await submitDraft(id)
    drafts.value = drafts.value.map((draft) => (draft.id === id ? updated : draft))
    message.value = t('profile.submitted')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.submitError')
  }
}
async function submitApplication(): Promise<void> {
  try {
    application.value = await createAuthorApplication({
      motivation: motivation.value,
      portfolio_url: portfolioUrl.value || undefined,
    })
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('profile.applicationError')
  }
}
</script>
<template>
  <section v-if="auth.user" class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">ION PULSE PROFILE</p>
        <h1>{{ auth.user.display_name }}</h1>
        <p>{{ auth.user.email }}</p>
        <div class="role-list">
          <span v-for="role in auth.user.roles.length ? auth.user.roles : ['member']" :key="role">
            {{ roleLabel(role) }}
          </span>
        </div>
      </div>
      <RouterLink class="button button-primary" to="/write">{{ t('profile.newStory') }}</RouterLink>
    </header>

    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <div class="dashboard-grid">
      <aside class="dashboard-sidebar">
        <form class="dashboard-card" @submit.prevent="save">
          <p class="eyebrow">{{ t('profile.settingsEyebrow') }}</p>
          <h2>{{ t('profile.title') }}</h2>
          <label>{{ t('profile.displayName') }}<input v-model.trim="displayName" required minlength="2" /></label>
          <button class="button button-secondary">{{ t('profile.save') }}</button>
          <button class="button button-secondary" type="button" @click="exportData">
            {{ t('profile.exportData') }}
          </button>
        </form>
        <section class="dashboard-card account-deletion">
          <p class="eyebrow">{{ t('profile.deleteEyebrow') }}</p>
          <h2>{{ t('profile.deleteTitle') }}</h2>
          <label>{{ t('profile.password') }}<input v-model="deletionPassword" type="password" /></label>
          <label
            >{{ t('profile.reasonOptional') }}<textarea v-model.trim="deletionReason" maxlength="1000" />
          </label>
          <button
            class="button button-secondary"
            :disabled="!deletionPassword"
            @click="deleteAccount"
          >
            {{ t('profile.deleteAccount') }}
          </button>
        </section>
        <form
          v-if="!application && !auth.user.roles.includes('author')"
          class="dashboard-card"
          @submit.prevent="submitApplication"
        >
          <p class="eyebrow">{{ t('profile.applicationEyebrow') }}</p>
          <h2>{{ t('profile.becomeAuthor') }}</h2>
          <label
            >{{ t('profile.motivation') }}<textarea
              v-model="motivation"
              required
              minlength="50"
            />
          </label>
          <label>{{ t('profile.portfolioOptional') }}<input v-model.trim="portfolioUrl" type="url" /></label>
          <button class="button button-secondary">{{ t('profile.sendApplication') }}</button>
        </form>
        <section v-else-if="application" class="dashboard-card">
          <p class="eyebrow">{{ t('profile.applicationEyebrow') }}</p>
          <h2>{{ t('profile.applicationSent') }}</h2>
          <p class="muted-copy">{{ t('profile.status', { status: applicationStatus(application.status) }) }}</p>
        </section>
      </aside>

      <div class="dashboard-main">
        <section class="dashboard-card">
          <div class="dashboard-section-heading">
            <div>
              <p class="eyebrow">{{ t('profile.publicationsEyebrow') }}</p>
              <h2>{{ t('profile.myPublications') }}</h2>
            </div>
            <RouterLink class="text-link" to="/write">{{ t('profile.create') }}</RouterLink>
          </div>
          <p v-if="!drafts.length" class="empty-state">{{ t('profile.noDrafts') }}</p>
          <ul v-else class="publication-list">
            <li v-for="draft in drafts" :key="draft.id">
              <div class="publication-list-copy">
                <div class="publication-list-meta">
                  <span>{{ draft.category_slug }}</span
                  ><span>{{ publicationStatus(draft.status) }}</span>
                </div>
                <strong>{{ draft.title }}</strong>
                <small>{{ t('profile.aiReview', { status: aiStatus(aiReviews[draft.id]?.status) }) }}</small>
              </div>
              <div class="publication-list-actions">
                <RouterLink
                  v-if="canSubmit(draft)"
                  class="button button-secondary"
                  :to="`/write/${draft.id}`"
                  >{{ t('profile.edit') }}</RouterLink
                >
                <button
                  v-if="canSubmit(draft)"
                  class="button button-primary"
                  type="button"
                  @click="submitDraftForReview(draft.id)"
                >
                  {{ t('profile.submit') }}
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section v-if="games.length" class="dashboard-card">
          <p class="eyebrow">{{ t('profile.gamesEyebrow') }}</p>
          <h2>{{ t('profile.games') }}</h2>
          <ul class="game-list">
            <li v-for="game in games" :key="game.id">
              <div>
                <strong>{{ game.title }}</strong
                ><small>{{ game.slug }}</small>
              </div>
              <button
                class="button button-secondary"
                type="button"
                @click="toggleGameSubscription(game)"
              >
                {{
                  gameSubscriptions.some((item) => item.id === game.id)
                    ? t('profile.unsubscribe')
                    : t('profile.subscribe')
                }}
              </button>
            </li>
          </ul>
        </section>
        <section v-if="authorSubscriptions.length" class="dashboard-card">
          <p class="eyebrow">{{ t('profile.authorsEyebrow') }}</p>
          <h2>{{ t('profile.authors') }}</h2>
          <ul class="game-list">
            <li v-for="author in authorSubscriptions" :key="author.author_id">
              <div>
                <strong>{{ author.display_name }}</strong>
                <small>{{ t('profile.subscribedSince', { date: new Date(author.subscribed_at).toLocaleDateString(locale) }) }}</small>
              </div>
              <button
                class="button button-secondary"
                type="button"
                @click="unsubscribeAuthor(author.author_id)"
              >
                {{ t('profile.unsubscribe') }}
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
