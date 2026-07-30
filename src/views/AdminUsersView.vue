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

const auth = useAuthStore()
const router = useRouter()
const users = ref<AdminUser[]>([])
const audit = ref<UserRoleAuditEntry[]>([])
const error = ref('')
const roles = ['author', 'editor', 'moderator', 'content_manager', 'administrator']

onMounted(async () => {
  if (!auth.user) await auth.restore()
  if (!auth.user?.roles.includes('administrator')) return void router.replace('/')
  try {
    ;[users.value, audit.value] = await Promise.all([listAdminUsers(), listUserRoleAudit()])
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Не удалось загрузить пользователей'
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
    error.value = caught instanceof Error ? caught.message : 'Не удалось обновить роли'
  }
}
</script>

<template>
  <section class="editorial-page">
    <header class="queue-header">
      <div>
        <p class="eyebrow">ACCESS CONTROL</p>
        <h1>Пользователи и роли</h1>
      </div>
    </header>
    <p v-if="error" class="form-error">{{ error }}</p>
    <div class="queue-list">
      <article v-for="user in users" :key="user.id" class="queue-card">
        <div class="queue-detail">
          <strong>{{ user.display_name }}</strong
          ><small>{{ user.email }} · {{ user.is_active ? 'активен' : 'деактивирован' }}</small>
          <div class="role-list">
            <label v-for="role in roles" :key="role"
              ><input
                :checked="user.roles.includes(role)"
                type="checkbox"
                @change="toggleRole(user, role)"
              />
              {{ role }}</label
            >
          </div>
        </div>
      </article>
    </div>
    <section class="queue-list">
      <header class="queue-header">
        <div>
          <p class="eyebrow">ROLE AUDIT</p>
          <h2>История ролей</h2>
        </div>
      </header>
      <p v-if="!audit.length" class="empty-state">Изменений ролей пока нет.</p>
      <article
        v-for="entry in audit"
        :key="`${entry.created_at}-${entry.user_id}-${entry.role_code}`"
        class="queue-card"
      >
        <div class="queue-detail">
          <strong
            >{{ entry.action === 'granted' ? 'Выдана' : 'Отозвана' }}: {{ entry.role_code }}</strong
          ><small>{{ new Date(entry.created_at).toLocaleString() }}</small>
        </div>
      </article>
    </section>
  </section>
</template>
