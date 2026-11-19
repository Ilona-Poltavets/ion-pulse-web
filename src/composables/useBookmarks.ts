import { ref } from 'vue'
import { addBookmark, listBookmarkIds, removeBookmark } from '@/services/api'

/** Shared bookmark state so every card shows the same star. */
const ids = ref<Set<string>>(new Set())
let loaded = false

export function useBookmarks() {
  async function load(force = false): Promise<void> {
    if (loaded && !force) return
    try {
      ids.value = new Set(await listBookmarkIds())
      loaded = true
    } catch {
      ids.value = new Set()
    }
  }

  async function toggle(id: string): Promise<void> {
    const next = new Set(ids.value)
    if (next.has(id)) {
      next.delete(id)
      ids.value = next
      await removeBookmark(id).catch(() => load(true))
    } else {
      next.add(id)
      ids.value = next
      await addBookmark(id).catch(() => load(true))
    }
  }

  return { ids, load, toggle, has: (id: string) => ids.value.has(id) }
}

export function resetBookmarks(): void {
  ids.value = new Set()
  loaded = false
}
