import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

const HISTORY_LIMIT = 100
const DEBOUNCE_MS = 400

/**
 * Undo/redo for a JSON-serialisable editor state. Changes are grouped by a short
 * debounce so typing a sentence is one undo step, not one per keystroke.
 */
export function useEditorHistory<T>(source: Ref<T>, debounceMs = DEBOUNCE_MS) {
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let current = JSON.stringify(source.value)
  let timer: ReturnType<typeof setTimeout> | undefined

  function record(): void {
    timer = undefined
    const snapshot = JSON.stringify(source.value)
    if (snapshot === current) return
    undoStack.value.push(current)
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
    redoStack.value = []
    current = snapshot
  }

  function flush(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      record()
    }
  }

  watch(
    source,
    () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(record, debounceMs)
    },
    { deep: true },
  )
  onBeforeUnmount(() => clearTimeout(timer))

  function restore(snapshot: string): void {
    current = snapshot
    source.value = JSON.parse(snapshot) as T
  }

  function undo(): boolean {
    flush()
    const previous = undoStack.value.pop()
    if (previous === undefined) return false
    redoStack.value.push(current)
    restore(previous)
    return true
  }

  function redo(): boolean {
    flush()
    const next = redoStack.value.pop()
    if (next === undefined) return false
    undoStack.value.push(current)
    restore(next)
    return true
  }

  /** Forget the history and treat the present state as the starting point. */
  function reset(): void {
    clearTimeout(timer)
    timer = undefined
    undoStack.value = []
    redoStack.value = []
    current = JSON.stringify(source.value)
  }

  return {
    undo,
    redo,
    reset,
    canUndo: computed(() => undoStack.value.length > 0 || JSON.stringify(source.value) !== current),
    canRedo: computed(() => redoStack.value.length > 0),
  }
}
