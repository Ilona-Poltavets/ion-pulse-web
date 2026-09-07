<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
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
      <header class="content-preview-modal-header">
        <strong>{{ title }}</strong
        ><button type="button" autofocus aria-label="Закрыть предпросмотр" @click="close">
          Закрыть ×
        </button>
      </header>
      <div class="content-preview-modal-body"><slot /></div>
    </dialog>
  </Teleport>
</template>
<style>
.content-preview-modal {
  width: min(1120px, calc(100vw - 40px));
  max-width: none;
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid #d5d9da;
  border-radius: 12px;
  background: #fff;
  color: #20282d;
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
.content-preview-modal-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e6e3;
  background: #f8faf8;
  font: 14px/1.5 system-ui;
}
.content-preview-modal-header button {
  padding: 8px 12px;
  border: 1px solid #cad3cb;
  border-radius: 5px;
  cursor: pointer;
  background: #fff;
  color: #283a2d;
  font: inherit;
}
.content-preview-modal-header button:focus-visible {
  outline: 2px solid #719044;
  outline-offset: 2px;
}
.content-preview-modal-body {
  overflow: auto;
  overscroll-behavior: contain;
  padding: clamp(20px, 4vw, 56px);
  min-height: 0;
  font-size: 17px;
  line-height: 1.8;
}
@media (max-width: 600px) {
  .content-preview-modal {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
  .content-preview-modal-header {
    padding: 12px 16px;
  }
}
</style>
