<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
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
const { locale, t } = useI18n()
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
    message.value = error instanceof Error ? error.message : t('moderation.loadError')
  }
})

async function decide(report: ContentReport, status: 'resolved' | 'dismissed'): Promise<void> {
  const reviewNote = notes.value[report.id]?.trim()
  if (!reviewNote) {
    message.value = t('moderation.noteRequired')
    return
  }
  try {
    isSaving.value = true
    await reviewReport(report.id, { status, review_note: reviewNote })
    reports.value = reports.value.filter((item) => item.id !== report.id)
    expandedId.value = null
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('moderation.saveError')
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
    message.value = t('moderation.appealNoteRequired')
    return
  }
  try {
    await decideSanctionAppeal(appeal.id, { status, review_note: reviewNote })
    appeals.value = appeals.value.filter((item) => item.id !== appeal.id)
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('moderation.appealError')
  }
}

async function hideComment(report: ContentReport): Promise<void> {
  try {
    await updateCommentVisibility(report.target_id, true)
    message.value = t('moderation.commentHidden')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('moderation.hideError')
  }
}

async function restoreComment(comment: ModeratedComment): Promise<void> {
  try {
    await updateCommentVisibility(comment.id, false)
    hiddenComments.value = hiddenComments.value.filter((item) => item.id !== comment.id)
    message.value = t('moderation.commentRestored')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('moderation.restoreError')
  }
}

async function suspendTarget(report: ContentReport): Promise<void> {
  const expiresAt = suspensionEnds.value[report.id]
  const reason = notes.value[report.id]?.trim()
  if (!report.target_author_id || !expiresAt || !reason) {
    message.value = t('moderation.suspensionDetailsRequired')
    return
  }
  try {
    await suspendUser(report.target_author_id, {
      reason,
      expires_at: new Date(expiresAt).toISOString(),
    })
    message.value = t('moderation.suspended')
  } catch (error) {
    message.value = error instanceof Error ? error.message : t('moderation.suspensionError')
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">{{ t('moderation.eyebrow') }}</p>
        <h1>{{ t('moderation.title') }}</h1>
      </div>
      <span>{{ t('moderation.reviewCount', { count: reports.length }) }}</span>
    </header>
    <p v-if="message" class="dashboard-message">{{ message }}</p>
    <p v-if="!reports.length" class="empty-state">{{ t('moderation.emptyReports') }}</p>
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
              {{ report.target_type }} · {{ new Date(report.created_at).toLocaleString(locale) }}
            </p>
            <h2>
              {{ t('moderation.reportOn', { target: report.target_type === 'publication' ? t('moderation.publication') : t('moderation.comment') }) }}
            </h2>
            <p>{{ report.reason }}</p>
          </div>
          <span aria-hidden="true">{{ expandedId === report.id ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedId === report.id" class="queue-detail">
          <p v-if="report.target_excerpt" class="report-excerpt">{{ report.target_excerpt }}</p>
          <label
            >{{ t('moderation.decisionNote') }}<textarea
              v-model="notes[report.id]"
              :placeholder="t('moderation.decisionNotePlaceholder')"
              required
            />
          </label>
          <div class="editor-actions">
            <button
              class="button button-primary"
              :disabled="isSaving"
              @click="decide(report, 'resolved')"
            >
              {{ t('moderation.accept') }}
            </button>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="decide(report, 'dismissed')"
            >
              {{ t('moderation.dismiss') }}
            </button>
            <button
              v-if="report.target_type === 'comment'"
              class="button button-secondary"
              :disabled="isSaving"
              @click="hideComment(report)"
            >
              {{ t('moderation.hideComment') }}
            </button>
          </div>
          <div v-if="report.target_author_id" class="schedule-controls">
            <label
              >{{ t('moderation.suspendUntil') }}<input v-model="suspensionEnds[report.id]" type="datetime-local"
            /></label>
            <button
              class="button button-secondary"
              :disabled="isSaving"
              @click="suspendTarget(report)"
            >
              {{ t('moderation.suspendAuthor') }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">{{ t('moderation.appealsEyebrow') }}</p>
          <h2>{{ t('moderation.appealsTitle') }}</h2>
        </div>
        <span>{{ t('moderation.openCount', { count: appeals.length }) }}</span>
      </header>
      <p v-if="!appeals.length" class="empty-state">{{ t('moderation.emptyAppeals') }}</p>
      <article v-for="appeal in appeals" :key="appeal.id" class="queue-card expanded">
        <div class="queue-detail">
          <p>{{ appeal.reason }}</p>
          <label>{{ t('moderation.appealDecisionReason') }}<textarea v-model="appealNotes[appeal.id]" required /></label>
          <div class="editor-actions">
            <button class="button button-primary" @click="decideAppeal(appeal, 'approved')">
              {{ t('moderation.approveAppeal') }}</button
            ><button class="button button-secondary" @click="decideAppeal(appeal, 'rejected')">
              {{ t('moderation.rejectAppeal') }}
            </button>
          </div>
        </div>
      </article>
    </section>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">{{ t('moderation.hiddenEyebrow') }}</p>
          <h2>{{ t('moderation.hiddenTitle') }}</h2>
        </div>
        <span>{{ t('moderation.hiddenCount', { count: hiddenComments.length }) }}</span>
      </header>
      <p v-if="!hiddenComments.length" class="empty-state">{{ t('moderation.emptyHidden') }}</p>
      <article v-for="comment in hiddenComments" :key="comment.id" class="queue-card expanded">
        <div class="queue-detail">
          <p class="report-excerpt">{{ comment.body }}</p>
          <small>{{ t('moderation.hiddenCommentFor', { publication: comment.publication_id }) }}</small>
          <div class="editor-actions">
            <button class="button button-secondary" @click="restoreComment(comment)">
              {{ t('moderation.restoreComment') }}
            </button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
