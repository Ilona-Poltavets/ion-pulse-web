<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PreviewModal from '@/components/content/PreviewModal.vue'
import MagazinePage from '@/components/journal/MagazinePage.vue'
import type { JournalCandidate, JournalLayoutBlock, JournalPage } from '@/services/api'

const props = defineProps<{
  modelValue: boolean
  page: JournalPage
  materials: JournalCandidate[]
  number: number
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [page: JournalPage]
}>()
function clonePage(page: JournalPage): JournalPage {
  return JSON.parse(JSON.stringify(page)) as JournalPage
}
const draft = ref<JournalPage>(prepareDraft(props.page))
const selectedId = ref<JournalLayoutBlock['id']>(draft.value.layout_blocks?.[0]?.id || 'heading')
const selected = computed(() =>
  draft.value.layout_blocks?.find((block) => block.id === selectedId.value),
)
const availableBlocks: Array<{ id: JournalLayoutBlock['id']; label: string }> = [
  { id: 'heading', label: 'Заголовок' },
  { id: 'deck', label: 'Анонс' },
  { id: 'image', label: 'Изображение' },
  { id: 'body', label: 'Основной текст' },
]

function defaultLayout(): JournalLayoutBlock[] {
  if (draft.value.continuation)
    return [{ id: 'body', x: 3, y: 3, width: 94, height: 94, font_size: 14 }]
  const hasImage = Boolean(draft.value.image_url)
  return [
    { id: 'heading', x: 3, y: 3, width: hasImage ? 52 : 94, height: 24, font_size: 38 },
    { id: 'deck', x: 3, y: 29, width: hasImage ? 52 : 94, height: 16, font_size: 18 },
    ...(hasImage
      ? [{ id: 'image' as const, x: 59, y: 3, width: 38, height: 38, font_size: 14 }]
      : []),
    { id: 'body', x: 3, y: 48, width: 94, height: 49, font_size: 14 },
  ]
}
function defaultBlock(id: JournalLayoutBlock['id']): JournalLayoutBlock {
  const preset = defaultLayout().find((block) => block.id === id)
  if (preset) return preset
  if (id === 'heading') return { id, x: 3, y: 3, width: 94, height: 16, font_size: 32 }
  if (id === 'deck') return { id, x: 3, y: 20, width: 94, height: 14, font_size: 18 }
  if (id === 'image') return { id, x: 55, y: 3, width: 42, height: 36, font_size: 14 }
  return { id, x: 3, y: 3, width: 94, height: 94, font_size: 14 }
}
function prepareDraft(page: JournalPage): JournalPage {
  const prepared = clonePage(page)
  if (!prepared.continuation) return prepared

  const previousBlocks = prepared.layout_blocks || []
  const body = previousBlocks.find((block) => block.id === 'body')
  const heading = prepared.heading
    ? previousBlocks.find((block) => block.id === 'heading')
    : undefined
  prepared.layout_blocks = [
    ...(heading ? [heading] : []),
    body
      ? {
          ...body,
          x: 3,
          y: heading ? Math.max(20, body.y) : 3,
          width: 94,
          height: heading ? 76 : 94,
        }
      : {
          id: 'body',
          x: 3,
          y: heading ? 20 : 3,
          width: 94,
          height: heading ? 76 : 94,
          font_size: 14,
        },
  ]
  return prepared
}
function resetLayout(): void {
  draft.value.layout_blocks = defaultLayout()
  selectedId.value = draft.value.layout_blocks[0]?.id || 'body'
}
function toggleBlock(id: JournalLayoutBlock['id']): void {
  const blocks = draft.value.layout_blocks || []
  const index = blocks.findIndex((block) => block.id === id)
  if (index >= 0) blocks.splice(index, 1)
  else blocks.push(defaultBlock(id))
  draft.value.layout_blocks = blocks
  selectedId.value = id
}
function moveBlock({ id, x, y }: { id: JournalLayoutBlock['id']; x: number; y: number }): void {
  const block = draft.value.layout_blocks?.find((item) => item.id === id)
  if (!block) return
  block.x = Math.min(x, 100 - block.width)
  block.y = Math.min(y, 100 - block.height)
}
function save(): void {
  emit('save', clonePage(draft.value))
  emit('update:modelValue', false)
}
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    draft.value = prepareDraft(props.page)
    if (!draft.value.layout_blocks?.length) resetLayout()
    selectedId.value = draft.value.layout_blocks?.[0]?.id || 'heading'
  },
)
</script>

<template>
  <PreviewModal
    :model-value="modelValue"
    title="Визуальный редактор страницы журнала"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="page-layout-canvas">
      <MagazinePage
        :page="draft"
        :materials="materials"
        :number="number"
        editable
        @layout-block-position="moveBlock"
        @layout-block-select="selectedId = $event"
      />
    </div>
    <template #aside>
      <div class="page-layout-controls">
        <p class="eyebrow">БЛОКИ СТРАНИЦЫ</p>
        <div class="page-layout-block-list">
          <button
            v-for="item in availableBlocks"
            :key="item.id"
            type="button"
            :class="{
              active: selectedId === item.id,
              disabled: !draft.layout_blocks?.some((block) => block.id === item.id),
            }"
            @click="selectedId = item.id"
          >
            {{ item.label }}
          </button>
        </div>
        <template v-if="selected">
          <p class="page-layout-hint">Перетащите блок на странице или задайте значения точно.</p>
          <label
            >X · {{ selected.x }}%<input v-model.number="selected.x" type="range" min="0" max="90"
          /></label>
          <label
            >Y · {{ selected.y }}%<input v-model.number="selected.y" type="range" min="0" max="90"
          /></label>
          <label
            >Ширина · {{ selected.width }}%<input
              v-model.number="selected.width"
              type="range"
              min="10"
              max="100"
          /></label>
          <label
            >Высота · {{ selected.height }}%<input
              v-model.number="selected.height"
              type="range"
              min="8"
              max="100"
          /></label>
          <label v-if="selected.id !== 'image'"
            >Шрифт · {{ selected.font_size }} px<input
              v-model.number="selected.font_size"
              type="range"
              min="10"
              max="72"
          /></label>
          <button class="text-action" type="button" @click="toggleBlock(selected.id)">
            Убрать блок
          </button>
        </template>
        <button
          v-else
          class="button button-secondary"
          type="button"
          @click="toggleBlock(selectedId)"
        >
          Добавить блок
        </button>
        <div class="page-layout-footer">
          <button class="button button-secondary" type="button" @click="resetLayout">
            Сбросить
          </button>
          <button class="button button-primary" type="button" @click="save">Применить</button>
        </div>
      </div>
    </template>
  </PreviewModal>
</template>

<style>
.page-layout-canvas {
  width: min(660px, 100%);
  aspect-ratio: 66 / 85;
  max-height: calc(100dvh - 150px);
  margin: 0 auto;
  box-shadow: 0 18px 70px #0008;
}
.page-layout-controls {
  display: grid;
  gap: 16px;
}
.page-layout-block-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.page-layout-block-list button {
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  cursor: pointer;
}
.page-layout-block-list button.active {
  border-color: var(--lime);
  color: var(--lime);
}
.page-layout-block-list button.disabled {
  opacity: 0.45;
  text-decoration: line-through;
}
.page-layout-controls label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
}
.page-layout-controls input {
  width: 100%;
  accent-color: var(--lime);
}
.page-layout-hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.page-layout-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
</style>
