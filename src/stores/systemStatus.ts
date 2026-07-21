import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getHealth, type HealthResponse } from '@/services/api'

type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

export const useSystemStatusStore = defineStore('system-status', () => {
  const requestStatus = ref<RequestStatus>('idle')
  const health = ref<HealthResponse | null>(null)

  const isOnline = computed(() => requestStatus.value === 'success')

  async function load(signal?: AbortSignal): Promise<void> {
    requestStatus.value = 'loading'

    try {
      health.value = await getHealth(signal)
      requestStatus.value = 'success'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        requestStatus.value = 'idle'
        return
      }

      health.value = null
      requestStatus.value = 'error'
    }
  }

  return { requestStatus, health, isOnline, load }
})
