<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ContentImage } from './ContentImage'
import { imageLayout } from './imageLayout'
import ContentBody from './ContentBody.vue'
import PreviewModal from './PreviewModal.vue'
import { contentHtml, safeContentUrl, sanitizeContent, serializeContent } from './contentFormat'

const props = withDefaults(
  defineProps<{
    modelValue: string
    disabled?: boolean
    label?: string
    maxLength?: number
    externalPreview?: boolean
  }>(),
  { label: 'Содержание', maxLength: 200000 },
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; preview: [] }>()
const panel = ref<'insert' | 'outline'>('insert')
const preview = ref(false)
const revision = ref(0)
const url = ref('')
const imageInput = ref<HTMLInputElement>()
const imageOpen = ref(false)
const alt = ref('')
const error = ref('')
const showLink = ref(false)
const linkUrl = ref('')
const dragged = ref<number | null>(null)
let lastEmitted: string | undefined
const alignment = Extension.create({
  name: 'blockAlignment',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          align: {
            default: 'left',
            parseHTML: (el) => el.getAttribute('data-align') || 'left',
            renderHTML: (attrs) => ({ 'data-align': attrs.align }),
          },
        },
      },
    ]
  },
})
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
    ContentImage,
    alignment,
  ],
  content: contentHtml(props.modelValue),
  editable: !props.disabled,
  editorProps: {
    attributes: {
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': props.label,
      class: 'content-prose block-writing',
    },
    transformPastedHTML: (html) => sanitizeContent(html),
  },
  onTransaction: () => {
    revision.value++
  },
  onUpdate: ({ editor: instance }) => {
    const value = serializeContent(instance.getHTML())
    error.value =
      value.length > props.maxLength
        ? `Содержание превышает лимит ${props.maxLength} символов.`
        : ''
    lastEmitted = value
    emit('update:modelValue', value)
  },
})
const blocks = computed(() => {
  void revision.value
  const result: {
    position: number
    size: number
    type: string
    text: string
    json: JSONContent
  }[] = []
  editor.value?.state.doc.forEach((node, position) =>
    result.push({
      position,
      size: node.nodeSize,
      type: node.type.name,
      text: node.textContent,
      json: node.toJSON(),
    }),
  )
  return result
})
const selectedIndex = computed(() => {
  void revision.value
  const position = editor.value?.state.selection.from || 0
  const match = blocks.value.findIndex(
    (b) => position >= b.position && position < b.position + b.size,
  )
  return Math.max(0, match)
})
const current = computed(() => blocks.value[selectedIndex.value])
const currentImage = computed(() => imageLayout(current.value?.json.attrs || {}))
function setImageLayout(patch: Record<string, unknown>) {
  if (!editor.value || props.disabled || current.value?.type !== 'image') return
  const next = { ...currentImage.value, ...patch }
  if (patch.imageWrap === true) {
    if (next.imageAlign === 'center') next.imageAlign = 'left'
    if (next.imageWidth === 100) next.imageWidth = 50
  }
  if (patch.imageAlign === 'center') next.imageWrap = false
  editor.value.commands.updateAttributes('image', imageLayout(next))
}
function imageNumber(event: Event, name: string) {
  setImageLayout({ [name]: (event.target as HTMLInputElement).value })
}
const wordCount = computed(() => {
  void revision.value
  return editor.value?.getText().trim().split(/\s+/).filter(Boolean).length || 0
})
const types = [
  { type: 'paragraph', icon: '¶', name: 'Абзац' },
  { type: 'heading', icon: 'H', name: 'Заголовок' },
  { type: 'bulletList', icon: '•', name: 'Список' },
  { type: 'orderedList', icon: '1.', name: 'Нумерация' },
  { type: 'blockquote', icon: '❞', name: 'Цитата' },
  { type: 'image', icon: '▧', name: 'Изображение' },
  { type: 'codeBlock', icon: '</>', name: 'Код' },
  { type: 'horizontalRule', icon: '—', name: 'Разделитель' },
]
function insert(type: string) {
  if (!editor.value || props.disabled) return
  if (type === 'image') {
    panel.value = 'insert'
    imageOpen.value = true
    void nextTick(() => imageInput.value?.focus())
    return
  }
  const content: JSONContent =
    type === 'heading'
      ? { type, attrs: { level: 2 } }
      : ['bulletList', 'orderedList'].includes(type)
        ? { type, content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
        : type === 'blockquote'
          ? { type, content: [{ type: 'paragraph' }] }
          : { type }
  const position = current.value
    ? current.value.position + current.value.size
    : editor.value.state.doc.content.size
  editor.value.chain().focus().insertContentAt(position, content).run()
}
function addImage() {
  if (!editor.value || props.disabled) return
  if (!safeContentUrl(url.value, true)) {
    error.value = 'Укажите адрес изображения: https://… или /…'
    return
  }
  editor.value.chain().focus().setImage({ src: url.value, alt: alt.value }).run()
  url.value = ''
  alt.value = ''
  error.value = ''
}
function updateImage(event: Event, attribute: 'src' | 'alt') {
  const value = (event.target as HTMLInputElement).value.trim()
  if (attribute === 'src' && !safeContentUrl(value, true)) {
    error.value = 'Укажите корректный адрес изображения.'
    return
  }
  editor.value
    ?.chain()
    .focus()
    .updateAttributes('image', { [attribute]: value })
    .run()
  error.value = ''
}
function selectBlock(index: number) {
  const block = blocks.value[index]
  if (!editor.value || !block) return
  const chain = editor.value.chain().focus()
  if (['image', 'horizontalRule'].includes(block.type)) chain.setNodeSelection(block.position).run()
  else
    chain
      .setTextSelection(block.position + 1)
      .scrollIntoView()
      .run()
}
function moveBlock(from: number, to: number) {
  if (!editor.value || props.disabled || from === to || to < 0 || to >= blocks.value.length) return
  const source = blocks.value[from]!
  const target = blocks.value[to]!
  const position = to > from ? target.position + target.size - source.size : target.position
  editor.value
    .chain()
    .focus()
    .deleteRange({ from: source.position, to: source.position + source.size })
    .insertContentAt(position, source.json)
    .run()
}
function removeBlock() {
  if (editor.value && current.value && !props.disabled)
    editor.value
      .chain()
      .focus()
      .deleteRange({
        from: current.value.position,
        to: current.value.position + current.value.size,
      })
      .run()
}
function drop(index: number) {
  if (dragged.value !== null) moveBlock(dragged.value, index)
  dragged.value = null
}
function setLink() {
  if (!editor.value) return
  if (linkUrl.value && !safeContentUrl(linkUrl.value)) {
    error.value = 'Укажите корректный адрес ссылки.'
    return
  }
  const chain = editor.value.chain().focus().extendMarkRange('link')
  if (linkUrl.value) chain.setLink({ href: linkUrl.value }).run()
  else chain.unsetLink().run()
  showLink.value = false
  error.value = ''
}
function openLink() {
  linkUrl.value = editor.value?.getAttributes('link').href || ''
  showLink.value = !showLink.value
}
function align(value: string) {
  if (editor.value)
    editor.value
      .chain()
      .focus()
      .updateAttributes(editor.value.isActive('heading') ? 'heading' : 'paragraph', {
        align: value,
      })
      .run()
}
watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== lastEmitted) {
      editor.value.commands.setContent(contentHtml(value), { emitUpdate: false })
      lastEmitted = value
    }
  },
)
watch(
  () => props.disabled,
  (value) => editor.value?.setEditable(!value),
)
onBeforeUnmount(() => editor.value?.destroy())
</script>
<template>
  <section class="block-editor" :aria-label="label">
    <header class="block-editor-header">
      <div>
        <span class="block-brand">▦</span><strong>{{ label }}</strong
        ><small>Блочный редактор</small>
      </div>
      <button type="button" @click="externalPreview ? emit('preview') : (preview = true)">
        Предпросмотр ↗
      </button>
    </header>
    <fieldset :disabled="disabled" class="block-editor-fieldset">
      <div v-if="editor" class="block-formatbar" role="toolbar" aria-label="Форматирование">
        <button
          type="button"
          title="Отменить (Ctrl+Z)"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          ↶
        </button>
        <button
          type="button"
          title="Повторить (Ctrl+Shift+Z)"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          ↷
        </button>
        <span class="block-toolbar-divider" />
        <button
          type="button"
          :aria-pressed="editor.isActive('bold')"
          title="Жирный (Ctrl+B)"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          :aria-pressed="editor.isActive('italic')"
          title="Курсив (Ctrl+I)"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          :aria-pressed="editor.isActive('underline')"
          title="Подчёркнутый"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          :aria-pressed="editor.isActive('strike')"
          title="Зачёркнутый"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          :aria-pressed="editor.isActive('link')"
          title="Ссылка"
          @click="openLink"
        >
          ↗ Ссылка
        </button>
        <span class="block-toolbar-divider" />
        <button type="button" @click="editor.chain().focus().setParagraph().run()">¶</button>
        <button
          v-for="level in [2, 3, 4] as const"
          :key="level"
          type="button"
          :aria-pressed="editor.isActive('heading', { level })"
          @click="editor.chain().focus().toggleHeading({ level }).run()"
        >
          H{{ level }}
        </button>
      </div>
      <div v-if="showLink" class="block-link-form">
        <input
          v-model.trim="linkUrl"
          aria-label="Адрес ссылки"
          placeholder="https://…"
          @keydown.enter.prevent="setLink"
        /><button type="button" @click="setLink">Применить</button
        ><button type="button" @click="showLink = false">Закрыть</button>
      </div>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
      <div class="block-editor-layout">
        <aside class="block-library">
          <div class="block-tabs">
            <button type="button" :aria-pressed="panel === 'insert'" @click="panel = 'insert'">
              ＋ Блоки</button
            ><button type="button" :aria-pressed="panel === 'outline'" @click="panel = 'outline'">
              ☷ Структура
            </button>
          </div>
          <div v-if="panel === 'insert'" class="block-library-grid">
            <button v-for="item in types" :key="item.type" type="button" @click="insert(item.type)">
              <span>{{ item.icon }}</span
              >{{ item.name }}
            </button>
          </div>
          <ol v-else class="block-outline">
            <li
              v-for="(block, index) in blocks"
              :key="index"
              :draggable="!disabled"
              @dragstart="dragged = index"
              @dragend="dragged = null"
              @dragover.prevent
              @drop.prevent="drop(index)"
            >
              <button
                type="button"
                :aria-current="selectedIndex === index ? 'true' : undefined"
                @click="selectBlock(index)"
              >
                <span>⠿ {{ index + 1 }}.</span>
                {{ block.text.slice(0, 35) || types.find((t) => t.type === block.type)?.name }}
              </button>
            </li>
          </ol>
          <details
            class="block-image-settings"
            :open="imageOpen"
            @toggle="imageOpen = ($event.target as HTMLDetailsElement).open"
          >
            <summary>Изображение по ссылке</summary>
            <label
              >Адрес<input
                v-model.trim="url"
                class="block-image-url"
                ref="imageInput"
                placeholder="https://…" /></label
            ><label
              >Описание (alt)<input v-model="alt" placeholder="Что изображено на фото" /></label
            ><button type="button" @click="addImage">Вставить изображение</button
            ><small>Используйте URL из вашей медиатеки или сайта.</small>
          </details>
        </aside>
        <div class="block-canvas">
          <EditorContent :editor="editor" /><button
            type="button"
            class="block-add-paragraph"
            @click="insert('paragraph')"
          >
            ＋ Добавить абзац
          </button>
        </div>
        <aside class="block-inspector">
          <p class="block-inspector-title">НАСТРОЙКИ БЛОКА</p>
          <h3>{{ types.find((t) => t.type === current?.type)?.name || 'Абзац' }}</h3>
          <p>Выберите блок в тексте или в структуре документа.</p>
          <div class="block-position">
            <button
              type="button"
              :disabled="selectedIndex === 0"
              @click="moveBlock(selectedIndex, selectedIndex - 1)"
            >
              ↑ Выше</button
            ><button
              type="button"
              :disabled="selectedIndex === blocks.length - 1"
              @click="moveBlock(selectedIndex, selectedIndex + 1)"
            >
              ↓ Ниже
            </button>
          </div>
          <template v-if="current?.type === 'paragraph' || current?.type === 'heading'"
            ><p>Выравнивание</p>
            <div class="block-position">
              <button type="button" title="Слева" @click="align('left')">⇤</button
              ><button type="button" title="По центру" @click="align('center')">↔</button
              ><button type="button" title="Справа" @click="align('right')">⇥</button>
            </div></template
          >
          <template v-if="current?.type === 'image'">
            <div class="image-layout-controls">
              <span class="image-setting-label">Выравнивание</span>
              <div class="block-position" role="group" aria-label="Выравнивание изображения">
                <button
                  type="button"
                  title="Изображение слева"
                  :aria-pressed="currentImage.imageAlign === 'left'"
                  @click="setImageLayout({ imageAlign: 'left' })"
                >
                  ⇤
                </button>
                <button
                  type="button"
                  title="Изображение по центру"
                  :aria-pressed="currentImage.imageAlign === 'center'"
                  @click="setImageLayout({ imageAlign: 'center' })"
                >
                  ↔
                </button>
                <button
                  type="button"
                  title="Изображение справа"
                  :aria-pressed="currentImage.imageAlign === 'right'"
                  @click="setImageLayout({ imageAlign: 'right' })"
                >
                  ⇥
                </button>
              </div>
              <label
                >Размер · {{ currentImage.imageWidth }}%
                <input
                  type="range"
                  min="10"
                  max="100"
                  :value="currentImage.imageWidth"
                  aria-label="Масштаб изображения"
                  @input="imageNumber($event, 'imageWidth')"
                />
              </label>
              <div class="image-size-presets">
                <button
                  v-for="size in [25, 50, 75, 100]"
                  :key="size"
                  type="button"
                  :aria-pressed="currentImage.imageWidth === size"
                  @click="setImageLayout({ imageWidth: size })"
                >
                  {{ size }}%
                </button>
              </div>
              <label class="image-wrap-option"
                ><input
                  type="checkbox"
                  :checked="currentImage.imageWrap"
                  @change="
                    setImageLayout({ imageWrap: ($event.target as HTMLInputElement).checked })
                  "
                />Обтекание текстом</label
              >
              <small>Обтекание работает слева или справа. По центру — отдельный блок.</small>
              <label
                >Отступ от текста, px<input
                  type="number"
                  min="0"
                  max="80"
                  :value="currentImage.imageGap"
                  @change="imageNumber($event, 'imageGap')"
              /></label>
              <label
                >Пропорции<select
                  :value="currentImage.imageRatio"
                  @change="
                    setImageLayout({ imageRatio: ($event.target as HTMLSelectElement).value })
                  "
                >
                  <option value="auto">Оригинал</option>
                  <option value="16/9">16:9 · Широкий</option>
                  <option value="4/3">4:3 · Фото</option>
                  <option value="1/1">1:1 · Квадрат</option>
                  <option value="3/4">3:4 · Портрет</option>
                </select></label
              >
              <label
                >Скругление, px<input
                  type="number"
                  min="0"
                  max="80"
                  :value="currentImage.imageRadius"
                  @change="imageNumber($event, 'imageRadius')"
              /></label>
              <button
                type="button"
                @click="
                  setImageLayout({
                    imageAlign: 'center',
                    imageWidth: 100,
                    imageWrap: false,
                    imageGap: 24,
                    imageRadius: 4,
                    imageRatio: 'auto',
                  })
                "
              >
                Сбросить оформление
              </button>
            </div>
            <label
              >Адрес изображения<input
                :value="current.json.attrs?.src"
                @change="updateImage($event, 'src')"
            /></label>
            <label
              >Описание (alt)<input
                :value="current.json.attrs?.alt"
                @change="updateImage($event, 'alt')"
            /></label>
          </template>
          <button type="button" class="block-delete" @click="removeBlock">Удалить блок</button>
          <p class="block-tip">Начните строку с ## для заголовка, * для списка или > для цитаты.</p>
        </aside>
      </div>
    </fieldset>
    <footer class="block-editor-footer">
      <span>{{ blocks.length }} блоков · {{ wordCount }} слов</span
      ><span>Изменения сохраняются вместе с материалом</span>
    </footer>
    <PreviewModal v-model="preview" title="Предпросмотр">
      <ContentBody :body="modelValue" />
    </PreviewModal>
  </section>
</template>
<style>
.block-editor {
  border: 1px solid #d6dadd;
  border-radius: 10px;
  background: #fff;
  color: #20282d;
  overflow: hidden;
  container-type: inline-size;
  text-align: left;
  font:
    14px/1.5 system-ui,
    sans-serif;
  min-width: 0;
}
.block-editor-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid #e1e5e7;
}
.block-editor-header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.block-editor-header small {
  color: #6b747a;
}
.block-brand {
  background: #202b26;
  color: #c5ef58;
  padding: 4px 9px;
  border-radius: 4px;
  font-size: 20px;
}
.block-editor button {
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: #26342d;
  border-radius: 4px;
  padding: 8px 10px;
  font: inherit;
  line-height: 1.4;
}
.block-editor button:hover {
  background: #eaf0eb;
}
.block-editor button[aria-pressed='true'],
.block-editor button[aria-current='true'] {
  background: #e6eed8;
  color: #273916;
  border-color: #b6c99d;
}
.block-editor button:disabled {
  opacity: 0.35;
  cursor: default;
}
.block-editor button:focus-visible {
  outline: 2px solid #647f3b;
  outline-offset: 2px;
}
.block-editor-fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.block-formatbar {
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-bottom: 1px solid #e3e6e8;
  background: #fafbfb;
}
.block-toolbar-divider {
  height: 20px;
  width: 1px;
  background: #dce0e1;
  margin: 0 5px;
}
.block-editor-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 170px;
  min-height: 480px;
}
.block-library,
.block-inspector {
  padding: 14px;
  background: #fafbfb;
}
.block-library {
  border-right: 1px solid #e5e8e8;
}
.block-inspector {
  border-left: 1px solid #e5e8e8;
  font-size: 12px;
}
.block-inspector h3 {
  font-size: 18px;
  margin: 10px 0;
}
.block-inspector p {
  color: #71797e;
}
.block-inspector-title {
  letter-spacing: 1px;
  font-size: 10px;
}
.block-tabs {
  display: flex;
  gap: 3px;
}
.block-tabs button {
  font-size: 11px;
  padding: 8px 4px;
}
.block-library-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 16px 0;
}
.block-library-grid button {
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 12px 2px;
}
.block-library-grid button > span {
  font-size: 23px;
  height: 30px;
}
.block-canvas {
  padding: 34px 32px;
  background: #fff;
  min-width: 0;
}
.block-writing {
  outline: none;
  min-height: 340px;
  font:
    17px/1.8 Georgia,
    serif;
  color: #20282d;
}
.block-writing > p:first-child:only-child:empty:before {
  content: 'Начните писать или добавьте блок…';
  color: #959c9e;
  pointer-events: none;
  float: left;
  height: 0;
}
.block-writing .ProseMirror-selectednode {
  outline: 2px solid #718d45;
}
.block-writing:focus {
  outline: none;
}
.block-editor .block-add-paragraph {
  width: 100%;
  border: 1px dashed #d4dcd5;
  color: #778575;
  margin-top: 20px;
}
.block-position {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.block-position button {
  border: 1px solid #dce2df;
  padding: 7px;
  font-size: 12px;
}
.block-editor .block-delete {
  margin-top: 24px;
  color: #a33434;
}
.block-tip {
  border-top: 1px solid #dce1dd;
  margin-top: 24px;
  padding-top: 15px;
}
.block-outline {
  list-style: none;
  padding: 0;
}
.block-outline li {
  cursor: grab;
}
.block-outline button {
  width: 100%;
  text-align: left;
  overflow-wrap: anywhere;
  font-size: 12px;
}
.block-outline span {
  color: #87917d;
}
.block-image-settings {
  margin-top: 18px;
  border-top: 1px solid #dce2df;
  padding-top: 14px;
  font-size: 12px;
}
.block-image-settings summary {
  cursor: pointer;
}
.block-editor label {
  display: grid;
  gap: 6px;
  font: 12px/1.4 system-ui;
  margin: 12px 0;
  color: #44514a;
}
.block-editor input {
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid #cfd7d1;
  border-radius: 4px;
  background: #fff;
  color: #20282d;
  font: 13px system-ui;
}
.block-image-settings small {
  display: block;
  color: #7b827e;
  margin-top: 12px;
}
.block-preview {
  padding: 40px;
  min-height: 440px;
  font:
    17px/1.8 Georgia,
    serif;
}
.block-editor-footer {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  border-top: 1px solid #e1e5e7;
  padding: 12px 20px;
  font-size: 11px;
  color: #7b837d;
}
.block-link-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f4f7f1;
}
.block-editor .form-error {
  padding: 0 20px;
}
@container (max-width:800px) {
  .block-editor-layout {
    grid-template-columns: 145px minmax(0, 1fr);
  }
  .block-inspector {
    grid-column: 1/-1;
    border-left: 0;
    border-top: 1px solid #e5e8e8;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .block-inspector > p:not(.block-inspector-title),
  .block-tip {
    display: none;
  }
  .block-editor .block-delete {
    margin: 0;
  }
  .block-canvas {
    padding: 24px 20px;
  }
  .block-editor-header small {
    display: none;
  }
}
@container (max-width:480px) {
  .block-editor-layout {
    grid-template-columns: 1fr;
  }
  .block-library {
    border-right: 0;
    border-bottom: 1px solid #e5e8e8;
  }
  .block-library-grid {
    grid-template-columns: repeat(4, 1fr);
    margin: 5px 0;
  }
  .block-image-settings {
    margin-top: 5px;
  }
  .block-canvas {
    padding: 20px 16px;
  }
  .block-editor-footer {
    flex-direction: column;
    gap: 4px;
  }
  .block-editor-header {
    padding: 12px;
  }
}
</style>

<style>
.image-layout-controls {
  width: 100%;
  min-width: 0;
  border-bottom: 1px solid #dce2df;
  padding-bottom: 16px;
  margin-bottom: 16px;
}
.image-setting-label {
  display: block;
  margin: 12px 0 8px;
  font-size: 12px;
}
.block-editor .image-layout-controls input,
.block-editor .image-layout-controls select {
  background: #fff;
  color: #20282d;
  border: 1px solid #cfd7d1;
  padding: 8px;
  width: 100%;
  font: 13px system-ui;
  border-radius: 4px;
}
.block-editor .image-layout-controls input[type='range'] {
  padding: 0;
  accent-color: #688b3c;
  border: 0;
  height: 24px;
  cursor: ew-resize;
}
.block-editor .image-wrap-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.block-editor .image-wrap-option input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #688b3c;
}
.image-layout-controls small {
  display: block;
  color: #788276;
  font-size: 11px;
  line-height: 1.5;
}
.image-size-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}
.image-size-presets button {
  font-size: 11px;
  padding: 5px;
  border: 1px solid #dce2df;
}
</style>
