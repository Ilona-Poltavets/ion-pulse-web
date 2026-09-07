<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
const props = defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const slots = useSlots()
const dialog = ref<HTMLDialogElement>()
let previousFocus: HTMLElement | null = null
let previousOverflow: string | undefined
function release() {
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow
    previousOverflow = undefined
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    previousFocus = null
  }
}
function sync() {
  if (!dialog.value) return
  if (props.modelValue && !dialog.value.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value.showModal()
  } else if (!props.modelValue && dialog.value.open) {
    dialog.value.close()
    release()
  }
}
function close() {
  emit('update:modelValue', false)
}
function onClose() {
  release()
  close()
}
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    close()
}
watch(() => props.modelValue, sync, { flush: 'post' })
onMounted(sync)
onBeforeUnmount(() => {
  dialog.value?.close()
  release()
})
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="content-preview-modal"
      :aria-label="title"
      @cancel.prevent="close"
      @close="onClose"
      @click="backdrop"
    >
      <button
        class="content-preview-modal-close"
        type="button"
        autofocus
        aria-label="Закрыть"
        @click="close"
      >
        ×
      </button>
      <div class="content-preview-modal-layout" :class="{ 'has-aside': Boolean(slots.aside) }">
        <div class="content-preview-modal-body"><slot /></div>
        <div v-if="slots.aside" class="content-preview-modal-aside"><slot name="aside" /></div>
      </div>
    </dialog>
  </Teleport>
</template>
<style>
.content-preview-modal {
  width: min(1440px, calc(100vw - 40px));
  max-width: none;
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--background);
  color: var(--text);
  box-shadow: 0 32px 100px #0008;
  overflow: hidden;
}
.content-preview-modal[open] {
  display: flex;
  flex-direction: column;
}
.content-preview-modal::backdrop {
  background: #080b13c9;
  backdrop-filter: blur(5px);
}
.content-preview-modal-layout {
  display: grid;
  flex: 1;
  min-height: 0;
}
.content-preview-modal-layout.has-aside {
  grid-template-columns: minmax(0, 1fr) 320px;
}
.content-preview-modal-close {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 16px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  padding: 0 0 3px;
  border: 1px solid var(--line);
  border-radius: 50%;
  cursor: pointer;
  background: rgb(23 25 37 / 92%);
  color: var(--text);
  font: 26px/1 system-ui;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}
.content-preview-modal-close:hover {
  color: var(--lime);
  border-color: rgb(199 255 94 / 55%);
  transform: rotate(6deg);
}
.content-preview-modal-close:focus-visible {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
}
.content-preview-modal-body {
  overflow: auto;
  overscroll-behavior: contain;
  padding: clamp(56px, 5vw, 76px) clamp(20px, 4vw, 64px);
  min-height: 0;
  font-size: 17px;
  line-height: 1.8;
}
.content-preview-modal-aside {
  min-width: 0;
  padding: 68px 20px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--surface);
  border-left: 1px solid var(--line);
}
@media (max-width: 600px) {
  .content-preview-modal {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
  .content-preview-modal-layout.has-aside {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .content-preview-modal-layout.has-aside .content-preview-modal-body,
  .content-preview-modal-layout.has-aside .content-preview-modal-aside {
    overflow: visible;
  }
  .content-preview-modal-aside {
    padding-top: 24px;
    border-top: 1px solid var(--line);
    border-left: 0;
  }
}
</style>
