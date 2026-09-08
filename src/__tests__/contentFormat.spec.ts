import { describe, expect, it } from 'vitest'
import {
  BLOCK_MARKER,
  contentFirstImage,
  contentHtml,
  contentText,
  serializeContent,
} from '@/components/content/contentFormat'

describe('shared editor and publication content', () => {
  it('keeps old text literal and preserves paragraph breaks', () => {
    const html = contentHtml(
      'Use <strong>literally</strong> & keep it\nnext line\n\nNext paragraph',
    )
    expect(html).toContain('&lt;strong&gt;literally&lt;/strong&gt;')
    expect(html).toContain('<br>next line')
    expect(html).toContain('<p>Next paragraph</p>')
  })
  it('round-trips headings, inline styles, lists, image descriptions and alignment', () => {
    const html =
      '<h2 data-align="center">Heading</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li><p>One</p></li></ul><img src="https://example.com/a.png" alt="A landscape">'
    expect(contentHtml(serializeContent(html))).toBe(html)
    expect(contentText(serializeContent(html))).toMatch(/Heading\s+Bold and italic\s+One/)
    expect(contentFirstImage(serializeContent(html))).toBe('https://example.com/a.png')
  })
  it('removes executable markup even in marked content from the API', () => {
    const html = contentHtml(
      BLOCK_MARKER +
        '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Link</a><p style="background:url(x)" onclick="alert(1)">Safe</p><iframe src="https://x.com"></iframe>',
    )
    expect(html).not.toMatch(/script|onerror|onclick|style=|iframe|javascript/)
    expect(html).toContain('Safe')
  })
  it('rejects unsafe and embedded image sources', () => {
    expect(
      contentHtml(
        BLOCK_MARKER +
          '<img src="data:image/svg+xml,test"><img src="//evil.example/x"><img src="/media/good.png" alt="Good">',
      ),
    ).toBe('<img src="/media/good.png" alt="Good">')
    expect(
      contentFirstImage(
        BLOCK_MARKER + '<img src="javascript:alert(1)"><img src="/media/good.png" alt="Good">',
      ),
    ).toBe('/media/good.png')
  })
  it('keeps an empty editor empty so journals can use the original article', () => {
    expect(serializeContent('<p></p>')).toBe('')
    expect(serializeContent('<p><br></p>')).toBe('')
  })
})
