<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import {
  listOpenReports,
  listHiddenComments,
  listSanctionAppeals,
  decideSanctionAppeal,
  reviewReport,
  suspendUser,
  updateCommentVisibility,
  type ContentReport,
  type ModeratedComment,
  type SanctionAppeal,
} from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const reports = ref<ContentReport[]>([])
const notes = ref<Record<string, string>>({})
const suspensionEnds = ref<Record<string, string>>({})
const message = ref('')
const expandedId = ref<string | null>(null)
const isSaving = ref(false)
const appeals = ref<SanctionAppeal[]>([])
const appealNotes = ref<Record<string, string>>({})
const hiddenComments = ref<ModeratedComment[]>([])

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (
    !auth.user ||
    !auth.user.roles.some((role) => role === 'moderator' || role === 'administrator')
  ) {
    await router.replace('/')
    return
  }
  try {
    ;[reports.value, appeals.value, hiddenComments.value] = await Promise.all([
      listOpenReports(),
      listSanctionAppeals(),
      listHiddenComments(),
    ])
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось загрузить жалобы'
  }
})

async function decide(report: ContentReport, status: 'resolved' | 'dismissed'): Promise<void> {
  const reviewNote = notes.value[report.id]?.trim()
  if (!reviewNote) {
    message.value = 'Добавьте комментарий к решению'
    return
  }
  try {
    isSaving.value = true
    await reviewReport(report.id, { status, review_note: reviewNote })
    reports.value = reports.value.filter((item) => item.id !== report.id)
    expandedId.value = null
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось сохранить решение'
  } finally {
    isSaving.value = false
  }
}

async function decideAppeal(
  appeal: SanctionAppeal,
  status: 'approved' | 'rejected',
): Promise<void> {
  const reviewNote = appealNotes.value[appeal.id]?.trim()
  if (!reviewNote) {
    message.value = 'Добавьте причину решения по обращению'
    return
  }
  try {
    await decideSanctionAppeal(appeal.id, { status, review_note: reviewNote })
    appeals.value = appeals.value.filter((item) => item.id !== appeal.id)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось рассмотреть обращение'
  }
}

async function hideComment(report: ContentReport): Promise<void> {
  try {
    await updateCommentVisibility(report.target_id, true)
    message.value = 'Комментарий скрыт'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось скрыть комментарий'
  }
}

async function restoreComment(comment: ModeratedComment): Promise<void> {
  try {
    await updateCommentVisibility(comment.id, false)
    hiddenComments.value = hiddenComments.value.filter((item) => item.id !== comment.id)
    message.value = 'Комментарий восстановлен'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось восстановить комментарий'
  }
}

async function suspendTarget(report: ContentReport): Promise<void> {
  const expiresAt = suspensionEnds.value[report.id]
  const reason = notes.value[report.id]?.trim()
  if (!report.target_author_id || !expiresAt || !reason) {
    message.value = 'Укажите комментарий к решению и срок блокировки'
    return
  }
  try {
    await suspendUser(report.target_author_id, {
      reason,
      expires_at: new Date(expiresAt).toISOString(),
    })
    message.value = 'Участник временно заблокирован, его сессии отозваны'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Не удалось применить санкцию'
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">MODERATION QUEUE</p>
        <h1>Жалобы</h1>
      </div>
      <span>{{ reports.length }} требуют разбора</span>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="!reports.length" class="empty-state">Открытых жалоб нет.</p>
    <div v-else class="queue-list">
      <article
        v-for="report in reports"
        :key="report.id"
        class="queue-card"
        :class="{ expanded: expandedId === report.id }"
      >
        <button
          class="queue-summary"
          type="button"
          @click="expandedId = expandedId === report.id ? null : report.id"
        >
          <div>
            <p class="eyebrow">
              {{ report.target_type }} · {{ new Date(report.created_at).toLocaleString() }}
            </p>
            <h2>
              Жалоба на {{ report.target_type === 'publication' ? 'материал' : 'комментарий' }}
            </h2>
            <p>{{ report.reason }}</p>
          </div>
          <span aria-hidden="true">{{ expandedId === report.id ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedId === report.id" class="queue-detail">
          <p v-if="report.target_excerpt" class="report-excerpt">{{ report.target_excerpt }}</p>
          <label
            >Комментарий к решению<textarea
              v-model="notes[report.id]"
              placeholder="Объясните принятое решение"
              required
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(report, 'resolved')"
            >
              Принять
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(report, 'dismissed')"
            >
              Отклонить
            </button>
            <button
              v-if="report.target_type === 'comment'"
              class="button button-secondary"
              :disabled="isSaving"
              @click="hideComment(report)"
            >
              Скрыть комментарий
            </button>
          </div>
          <div v-if="report.target_author_id" class="schedule-controls">
            <label
              >Заблокировать до<input v-model="suspensionEnds[report.id]" type="datetime-local"
            /></label>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="suspendTarget(report)"
            >
              Временно заблокировать автора
            </button>
          </div>
        </div>
      </article>
    </div>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">SANCTION APPEALS</p>
          <h2>Обжалования</h2>
        </div>
        <span>{{ appeals.length }} открытых</span>
      </header>
      <p v-if="!appeals.length" class="empty-state">Открытых обращений нет.</p>
      <article v-for="appeal in appeals" :key="appeal.id" class="queue-card expanded">
        <div class="queue-detail">
          <p>{{ appeal.reason }}</p>
          <label>Причина решения<textarea v-model="appealNotes[appeal.id]" required /></label>
          <div class="editor-actions">
            <button class="button button-primary" @click="decideAppeal(appeal, 'approved')">
              Одобрить и снять блокировку</button
            ><button class="button button-secondary" @click="decideAppeal(appeal, 'rejected')">
              Отклонить
            </button>
          </div>
        </div>
      </article>
    </section>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">HIDDEN COMMENTS</p>
          <h2>Скрытые комментарии</h2>
        </div>
        <span>{{ hiddenComments.length }} скрыты</span>
      </header>
      <p v-if="!hiddenComments.length" class="empty-state">Скрытых комментариев нет.</p>
      <article v-for="comment in hiddenComments" :key="comment.id" class="queue-card expanded">
        <div class="queue-detail">
          <p class="report-excerpt">{{ comment.body }}</p>
          <small>Скрыт комментарий к материалу {{ comment.publication_id }}</small>
          <div class="editor-actions">
            <button class="button button-secondary" @click="restoreComment(comment)">
              Восстановить комментарий
            </button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
