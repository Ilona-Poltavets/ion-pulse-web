import DOMPurify from 'dompurify'
import { imageLayoutAttributes, imageLayoutHtml, readImageLayout } from './imageLayout'

export const BLOCK_MARKER = '<!-- ion-pulse:blocks -->'
export function safeContentUrl(value: string, image = false): boolean {
  if (/^\/(?!\/)/.test(value)) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) || (!image && url.protocol === 'mailto:')
  } catch {
    return false
  }
}
export function sanitizeContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'h2',
      'h3',
      'h4',
      'strong',
      'em',
      'u',
      's',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'hr',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'data-align', 'start', ...imageLayoutAttributes],
    ALLOW_DATA_ATTR: false,
  })
  const container = document.createElement('div')
  container.innerHTML = clean
  container.querySelectorAll('a').forEach((link) => {
    if (!safeContentUrl(link.getAttribute('href') || '')) link.removeAttribute('href')
    link.setAttribute('rel', 'noopener noreferrer')
  })
  container.querySelectorAll('img').forEach((img) => {
    if (!safeContentUrl(img.getAttribute('src') || '', true)) {
      img.remove()
      return
    }
    if (imageLayoutAttributes.some((attribute) => img.hasAttribute(attribute))) {
      for (const [attribute, value] of Object.entries(imageLayoutHtml(readImageLayout(img))))
        img.setAttribute(attribute, value)
    }
  })
  container.querySelectorAll('[data-align]').forEach((node) => {
    if (!['left', 'center', 'right'].includes(node.getAttribute('data-align') || ''))
      node.removeAttribute('data-align')
  })
  return container.innerHTML
}
export function contentHtml(body: string): string {
  if (body.startsWith(BLOCK_MARKER)) return sanitizeContent(body.slice(BLOCK_MARKER.length))
  return body
    .split(/\n\s*\n/)
    .map((text) => {
      const paragraph = document.createElement('p')
      paragraph.textContent = text
      return paragraph.outerHTML.replace(/\n/g, '<br>')
    })
    .join('')
}
export function serializeContent(html: string): string {
  const clean = sanitizeContent(html)
  const element = document.createElement('div')
  element.innerHTML = clean
  return element.textContent?.trim() || element.querySelector('img,hr') ? BLOCK_MARKER + clean : ''
}
export function contentText(body: string): string {
  if (!body.startsWith(BLOCK_MARKER)) return body
  const element = document.createElement('div')
  element.innerHTML = contentHtml(body)
  element.querySelectorAll('p,h2,h3,h4,li,blockquote,pre,br').forEach((node) => node.append(' '))
  return element.textContent || ''
}

export function contentFirstImage(body: string): string {
  if (!body.startsWith(BLOCK_MARKER)) return ''
  const element = document.createElement('div')
  element.innerHTML = contentHtml(body)
  return element.querySelector('img')?.getAttribute('src') || ''
}
