import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useEditorHistory } from '../useEditorHistory'

function setup() {
  vi.useFakeTimers()
  const state = ref<{ items: string[] }>({ items: ['a'] })
  const scope = effectScope()
  const history = scope.run(() => useEditorHistory(state, 100))!
  return { state, history }
}

async function change(state: { value: { items: string[] } }, value: string) {
  state.value.items.push(value)
  await nextTick()
  vi.advanceTimersByTime(150)
}

describe('useEditorHistory', () => {
  it('undoes and redoes grouped changes', async () => {
    const { state, history } = setup()
    await change(state, 'b')
    await change(state, 'c')
    expect(history.canUndo.value).toBe(true)
    history.undo()
    expect(state.value.items).toEqual(['a', 'b'])
    history.undo()
    expect(state.value.items).toEqual(['a'])
    expect(history.undo()).toBe(false)
    history.redo()
    expect(state.value.items).toEqual(['a', 'b'])
    expect(history.canRedo.value).toBe(true)
  })

  it('drops redo steps after a new change', async () => {
    const { state, history } = setup()
    await change(state, 'b')
    history.undo()
    await nextTick()
    vi.advanceTimersByTime(150)
    await change(state, 'x')
    expect(history.canRedo.value).toBe(false)
  })

  it('reset forgets history', async () => {
    const { state, history } = setup()
    await change(state, 'b')
    history.reset()
    expect(history.canUndo.value).toBe(false)
    expect(history.undo()).toBe(false)
  })
})
