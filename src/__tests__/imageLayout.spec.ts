import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ContentImage } from '@/components/content/ContentImage'
import { BLOCK_MARKER, contentHtml, serializeContent } from '@/components/content/contentFormat'

const editors: Editor[] = []
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()))
function editor(content: string) {
  const instance = new Editor({ extensions: [StarterKit, ContentImage], content })
  editors.push(instance)
  return instance
}
describe('image layout persistence', () => {
  it('preserves scaling, wrapping, cropping and spacing through saving and reopening', () => {
    const original = editor('<img src="/photo.jpg"><p>Text alongside the photograph.</p>')
    original.commands.setNodeSelection(0)
    original.commands.updateAttributes('image', {
      imageAlign: 'right',
      imageWidth: 45,
      imageWrap: true,
      imageGap: 16,
      imageRadius: 12,
      imageRatio: '4/3',
    })
    const stored = serializeContent(original.getHTML())
    const restored = editor(contentHtml(stored))
    expect(restored.state.doc.firstChild?.attrs).toMatchObject({
      imageAlign: 'right',
      imageWidth: 45,
      imageWrap: true,
      imageGap: 16,
      imageRadius: 12,
      imageRatio: '4/3',
    })
    const html = contentHtml(stored)
    expect(html).toContain('width: 45%')
    expect(html).toContain('data-image-wrap="true"')
    expect(contentHtml(serializeContent(html))).toBe(html)
  })
  it('does not accept arbitrary CSS through image settings', () => {
    const html = contentHtml(
      BLOCK_MARKER +
        '<img src="/photo.jpg" style="position:fixed;inset:0" data-image-width="0;position:fixed" data-image-gap="-999" data-image-radius="99999" data-image-ratio="url(evil)" data-image-align="left" data-image-wrap="true">',
    )
    expect(html).not.toContain('position')
    expect(html).not.toContain('url(evil)')
    expect(html).toContain('width: 100%')
    expect(html).toContain('--image-gap: 0px')
    expect(html).toContain('border-radius: 80px')
  })
  it('keeps existing images readable with default layout', () => {
    const instance = editor('<img src="/photo.jpg" alt="Old image">')
    expect(instance.state.doc.firstChild?.attrs).toMatchObject({
      src: '/photo.jpg',
      alt: 'Old image',
      imageAlign: 'center',
      imageWidth: 100,
      imageWrap: false,
      imageRatio: 'auto',
    })
  })
})
