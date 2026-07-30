<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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

const publicationStatusLabels: Record<string, string> = {
  draft: 'Черновик',
  changes_requested: 'Нужна доработка',
  editorial_review: 'На проверке редактора',
  scheduled: 'Запланирован',
  published: 'Опубликован',
  archived: 'В архиве',
  rejected: 'Отклонён',
}

const aiStatusLabels: Record<string, string> = {
  pending: 'ожидает',
  reviewing: 'проверяется',
  completed: 'готово',
  failed: 'недоступно',
}

function publicationStatus(status: string): string {
  return publicationStatusLabels[status] ?? status
}

function aiStatus(status: string | undefined): string {
  return status ? (aiStatusLabels[status] ?? status) : 'не запущена'
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
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить профиль'
  }
})
async function save(): Promise<void> {
  try {
    await auth.update({ display_name: displayName.value })
    message.value = 'Профиль сохранён'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Ошибка'
  }
}
async function exportData(): Promise<void> {
  try {
    await exportMyData()
    message.value = 'Экспорт подготовлен'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось экспортировать данные'
  }
}
async function deleteAccount(): Promise<void> {
  if (!confirm('Удалить аккаунт? Профиль будет обезличен, а вход отключён.')) return
  try {
    await deleteMyAccount({
      password: deletionPassword.value,
      reason: deletionReason.value || undefined,
    })
    await auth.signOut()
    await router.replace('/')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось удалить аккаунт'
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
    message.value = error instanceof Error ? error.message : 'Не удалось обновить подписку'
  }
}
async function unsubscribeAuthor(authorId: string): Promise<void> {
  try {
    await unsubscribeFromAuthor(authorId)
    authorSubscriptions.value = authorSubscriptions.value.filter(
      (item) => item.author_id !== authorId,
    )
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось обновить подписку'
  }
}
async function submitDraftForReview(id: string): Promise<void> {
  try {
    const updated = await submitDraft(id)
    drafts.value = drafts.value.map((draft) => (draft.id === id ? updated : draft))
    message.value = 'Материал отправлен редактору'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось отправить материал'
  }
}
async function submitApplication(): Promise<void> {
  try {
    application.value = await createAuthorApplication({
      motivation: motivation.value,
      portfolio_url: portfolioUrl.value || undefined,
    })
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось отправить заявку'
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
            {{ role === 'member' ? 'Участник' : role }}
          </span>
        </div>
      </div>
      <RouterLink class="button button-primary" to="/write">Новый материал</RouterLink>
    </header>

    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <div class="dashboard-grid">
      <aside class="dashboard-sidebar">
        <form class="dashboard-card" @submit.prevent="save">
          <p class="eyebrow">SETTINGS</p>
          <h2>Профиль</h2>
          <label>Имя пользователя<input v-model.trim="displayName" required minlength="2" /></label>
          <button class="button button-secondary">Сохранить</button>
          <button class="button button-secondary" type="button" @click="exportData">
            Экспортировать данные
          </button>
        </form>
        <section class="dashboard-card account-deletion">
          <p class="eyebrow">DELETE ACCOUNT</p>
          <h2>Удалить аккаунт</h2>
          <label>Пароль<input v-model="deletionPassword" type="password" /></label>
          <label
            >Причина (необязательно)<textarea v-model.trim="deletionReason" maxlength="1000" />
          </label>
          <button
            class="button button-secondary"
            :disabled="!deletionPassword"
            @click="deleteAccount"
          >
            Удалить аккаунт
          </button>
        </section>
        <form
          v-if="!application && !auth.user.roles.includes('author')"
          class="dashboard-card"
          @submit.prevent="submitApplication"
        >
          <p class="eyebrow">AUTHOR APPLICATION</p>
          <h2>Стать автором</h2>
          <label
            >Почему вы хотите писать для Ion Pulse?<textarea
              v-model="motivation"
              required
              minlength="50"
            />
          </label>
          <label>Портфолио (необязательно)<input v-model.trim="portfolioUrl" type="url" /></label>
          <button class="button button-secondary">Отправить заявку</button>
        </form>
        <section v-else-if="application" class="dashboard-card">
          <p class="eyebrow">AUTHOR APPLICATION</p>
          <h2>Заявка отправлена</h2>
          <p class="muted-copy">Статус: {{ application.status }}</p>
        </section>
      </aside>

      <div class="dashboard-main">
        <section class="dashboard-card">
          <div class="dashboard-section-heading">
            <div>
              <p class="eyebrow">MY PUBLICATIONS</p>
              <h2>Мои материалы</h2>
            </div>
            <RouterLink class="text-link" to="/write">Создать →</RouterLink>
          </div>
          <p v-if="!drafts.length" class="empty-state">Материалов пока нет. Начните с черновика.</p>
          <ul v-else class="publication-list">
            <li v-for="draft in drafts" :key="draft.id">
              <div class="publication-list-copy">
                <div class="publication-list-meta">
                  <span>{{ draft.category_slug }}</span
                  ><span>{{ publicationStatus(draft.status) }}</span>
                </div>
                <strong>{{ draft.title }}</strong>
                <small>ИИ-проверка: {{ aiStatus(aiReviews[draft.id]?.status) }}</small>
              </div>
              <div class="publication-list-actions">
                <RouterLink
                  v-if="canSubmit(draft)"
                  class="button button-secondary"
                  :to="`/write/${draft.id}`"
                  >Редактировать</RouterLink
                >
                <button
                  v-if="canSubmit(draft)"
                  class="button button-primary"
                  type="button"
                  @click="submitDraftForReview(draft.id)"
                >
                  Отправить
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section v-if="games.length" class="dashboard-card">
          <p class="eyebrow">GAME SUBSCRIPTIONS</p>
          <h2>Игры</h2>
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
                    ? 'Отписаться'
                    : 'Подписаться'
                }}
              </button>
            </li>
          </ul>
        </section>
        <section v-if="authorSubscriptions.length" class="dashboard-card">
          <p class="eyebrow">AUTHOR SUBSCRIPTIONS</p>
          <h2>Авторы</h2>
          <ul class="game-list">
            <li v-for="author in authorSubscriptions" :key="author.author_id">
              <div>
                <strong>{{ author.display_name }}</strong>
                <small>Подписка с {{ new Date(author.subscribed_at).toLocaleDateString() }}</small>
              </div>
              <button
                class="button button-secondary"
                type="button"
                @click="unsubscribeAuthor(author.author_id)"
              >
                Отписаться
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
