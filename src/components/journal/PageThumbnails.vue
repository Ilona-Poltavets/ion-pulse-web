<script setup lang="ts">
import { ref } from 'vue'
import type { JournalCandidate, JournalPage } from '@/services/api'
import MagazinePage from './MagazinePage.vue'

defineProps<{ pages: JournalPage[]; materials: JournalCandidate[]; active: number }>()
const emit = defineEmits<{ select: [index: number]; reorder: [from: number, to: number] }>()
const dragging = ref(-1)
const over = ref(-1)

function start(event: DragEvent, index: number): void {
  dragging.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function drop(index: number): void {
  const from = dragging.value
  dragging.value = -1
  over.value = -1
  if (from >= 0 && from !== index) emit('reorder', from, index)
}
function key(event: KeyboardEvent, index: number): void {
  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault()
    emit('reorder', index, index - 1)
  } else if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault()
    emit('reorder', index, index + 1)
  }
}
</script>

<template>
  <ol class="page-thumbnails" aria-label="Миниатюры страниц. Alt + стрелки меняют порядок.">
    <li
      v-for="(entry, index) in pages"
      :key="index"
      class="page-thumb"
      :class="{ active: active === index, over: over === index && dragging !== index }"
      draggable="true"
      tabindex="0"
      :aria-current="active === index ? 'page' : undefined"
      @click="emit('select', index)"
      @keydown.enter="emit('select', index)"
      @keydown="key($event, index)"
      @dragstart="start($event, index)"
      @dragover.prevent="over = index"
      @dragleave="over = -1"
      @drop.prevent="drop(index)"
      @dragend="((dragging = -1), (over = -1))"
    >
      <div class="page-thumb-sheet" aria-hidden="true">
        <MagazinePage :page="entry" :materials="materials" :number="index + 1" />
      </div>
      <span class="page-thumb-number">{{ index + 1 }}</span>
    </li>
  </ol>
</template>

<style scoped>
.page-thumbnails {
  display: flex;
  gap: 10px;
  margin: 0 0 14px;
  padding: 4px 2px 10px;
  list-style: none;
  overflow-x: auto;
}
.page-thumb {
  position: relative;
  flex: 0 0 96px;
  height: 124px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 4px;
  background: #fff1;
  cursor: grab;
  content-visibility: auto;
  contain-intrinsic-size: 96px 124px;
}
.page-thumb.active {
  border-color: #c5ef58;
}
.page-thumb.over {
  border-color: #fff;
  transform: translateX(4px);
}
.page-thumb:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.page-thumb-sheet {
  width: 480px;
  transform: scale(0.2);
  transform-origin: top left;
  pointer-events: none;
}
.page-thumb-number {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #000a;
  color: #fff;
  font-size: 12px;
}
</style>
