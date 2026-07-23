import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getCurrentUser,
  login,
  logout,
  register,
  type AuthenticatedUser,
  type LoginPayload,
  type RegisterPayload,
} from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  async function authenticate(action: () => Promise<AuthenticatedUser>): Promise<void> {
    isLoading.value = true
    try {
      user.value = await action()
    } finally {
      isLoading.value = false
    }
  }
  async function signUp(payload: RegisterPayload): Promise<void> {
    await authenticate(() => register(payload))
  }
  async function signIn(payload: LoginPayload): Promise<void> {
    await authenticate(() => login(payload))
  }
  async function restore(): Promise<void> {
    try {
      user.value = await getCurrentUser()
    } catch {
      user.value = null
    }
  }
  async function signOut(): Promise<void> {
    await logout()
    user.value = null
  }
  return { user, isLoading, isAuthenticated, signUp, signIn, signOut, restore }
})
