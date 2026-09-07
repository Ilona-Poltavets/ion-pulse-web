<script setup lang="ts">
import { computed } from 'vue'
import { contentHtml } from './contentFormat'
const props = defineProps<{ body: string }>()
const html = computed(() => contentHtml(props.body))
</script>
<template>
  <!-- All rich content passes through the shared allowlist sanitizer. -->
  <div class="content-prose" v-html="html" />
</template>
<style>
.content-prose,
.publication-body.content-prose {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.75;
}
.content-prose p {
  margin: 0 0 1em;
}
.content-prose h2 {
  font-size: 1.8em;
  line-height: 1.2;
  margin: 1.4em 0 0.6em;
}
.content-prose h3 {
  font-size: 1.4em;
  line-height: 1.3;
  margin: 1.2em 0 0.6em;
}
.content-prose h4 {
  font-size: 1.15em;
  margin: 1em 0 0.5em;
}
.content-prose ul,
.content-prose ol {
  padding-left: 1.6em;
  margin: 1em 0;
}
.content-prose li {
  margin: 0.35em 0;
}
.content-prose li p {
  margin: 0;
}
.content-prose blockquote {
  margin: 1.5em 0;
  padding: 0.6em 1.2em;
  border-left: 4px solid #a8c94e;
  font-style: italic;
  background: #9cab7510;
}
.content-prose pre {
  white-space: pre-wrap;
  padding: 18px;
  background: #151a20;
  color: #e8eadd;
  border-radius: 6px;
  overflow: auto;
  font: 14px/1.6 monospace;
}
.content-prose code {
  font-family: monospace;
  background: #8882;
  padding: 0.15em 0.3em;
}
.content-prose pre code {
  padding: 0;
  background: none;
}
.content-prose img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 1.2em auto;
}
.content-prose hr {
  border: 0;
  border-top: 1px solid #8886;
  margin: 2em 0;
}
.content-prose a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.content-prose [data-align='left'] {
  text-align: left;
}
.content-prose [data-align='center'] {
  text-align: center;
}
.content-prose [data-align='right'] {
  text-align: right;
}

/* The same rules style Tiptap, previews, publications, and magazine pages. */
.content-prose::after {
  content: '';
  display: block;
  clear: both;
}
.content-prose img[data-image-align] {
  float: none;
  clear: both;
  object-fit: cover;
  margin-top: var(--image-gap, 24px);
  margin-bottom: var(--image-gap, 24px);
}
.content-prose img[data-image-align='left'] {
  margin-left: 0;
  margin-right: auto;
}
.content-prose img[data-image-align='center'] {
  margin-left: auto;
  margin-right: auto;
}
.content-prose img[data-image-align='right'] {
  margin-left: auto;
  margin-right: 0;
}
.content-prose img[data-image-wrap='true'][data-image-align='left'] {
  float: left;
  clear: none;
  margin: 0 var(--image-gap, 24px) var(--image-gap, 24px) 0;
}
.content-prose img[data-image-wrap='true'][data-image-align='right'] {
  float: right;
  clear: none;
  margin: 0 0 var(--image-gap, 24px) var(--image-gap, 24px);
}
.content-prose h2,
.content-prose h3,
.content-prose h4,
.content-prose hr,
.content-prose pre {
  clear: both;
}
@media (max-width: 560px) {
  .content-prose img[data-image-wrap='true'][data-image-align='left'],
  .content-prose img[data-image-wrap='true'][data-image-align='right'] {
    float: none;
    clear: both;
    max-width: 100%;
    margin: var(--image-gap, 24px) auto;
  }
}
</style>
