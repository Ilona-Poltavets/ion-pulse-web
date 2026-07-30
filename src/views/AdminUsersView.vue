<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAdminUsers,
  listUserRoleAudit,
  updateUserRoles,
  type AdminUser,
  type UserRoleAuditEntry,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { locale, t } = useI18n()
const users = ref<AdminUser[]>([])
const audit = ref<UserRoleAuditEntry[]>([])
const error = ref('')
const roles = ['author', 'editor', 'moderator', 'content_manager', 'administrator']

function roleLabel(role: string): string {
  return t(`adminUsers.roles.${role}`, role)
}

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user?.roles.includes('administrator')) return void router.replace('/')
  try {
    ;[users.value, audit.value] = await Promise.all([listAdminUsers(), listUserRoleAudit()])
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('adminUsers.loadError')
  }
})

async function toggleRole(user: AdminUser, role: string): Promise<void> {
  const next = user.roles.includes(role)
    ? user.roles.filter((item) => item !== role)
    : [...user.roles, role]
  try {
    const updated = await updateUserRoles(user.id, next)
    users.value = users.value.map((item) => (item.id === user.id ? updated : item))
    audit.value = await listUserRoleAudit()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('adminUsers.updateError')
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">{{ t('adminUsers.eyebrow') }}</p>
        <h1>{{ t('adminUsers.title') }}</h1>
      </div>
    </header>
    <p v-if="error" class="form-error">{{ error }}</p>
    <div class="queue-list">
      <article v-for="user in users" :key="user.id" class="queue-card">
        <div class="queue-detail">
          <strong>{{ user.display_name }}</strong
          ><small>{{ user.email }} · {{ user.is_active ? t('adminUsers.active') : t('adminUsers.inactive') }}</small>
          <div class="role-list">
            <label v-for="role in roles" :key="role"
              ><input
                :checked="user.roles.includes(role)"
                type="checkbox"
                @change="toggleRole(user, role)"
              />
              {{ roleLabel(role) }}</label
            >
          </div>
        </div>
      </article>
    </div>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">{{ t('adminUsers.auditEyebrow') }}</p>
          <h2>{{ t('adminUsers.auditTitle') }}</h2>
        </div>
      </header>
      <p v-if="!audit.length" class="empty-state">{{ t('adminUsers.auditEmpty') }}</p>
      <article
        v-for="entry in audit"
        :key="`${entry.created_at}-${entry.user_id}-${entry.role_code}`"
        class="queue-card"
      >
        <div class="queue-detail">
          <strong
            >{{ entry.action === 'granted' ? t('adminUsers.granted') : t('adminUsers.revoked') }}: {{ roleLabel(entry.role_code) }}</strong
          ><small>{{ new Date(entry.created_at).toLocaleString(locale) }}</small>
        </div>
      </article>
    </section>
  </section>
</template>
