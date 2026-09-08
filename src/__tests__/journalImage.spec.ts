import { describe, expect, it } from 'vitest'
import { journalImageUrl } from '@/components/journal/journalImage'

describe('journal image delivery', () => {
  it('requests a page-sized version of large Playground images', () => {
    expect(journalImageUrl('https://i.playground.ru/p/cover.png')).toBe(
      'https://i.playground.ru/p/cover.png?760xauto',
    )
  })

  it('keeps an explicit CDN transform and local uploads unchanged', () => {
    expect(journalImageUrl('https://i.playground.ru/p/photo.jpeg?760xauto')).toBe(
      'https://i.playground.ru/p/photo.jpeg?760xauto',
    )
    expect(journalImageUrl('/uploads/journal/cover.webp')).toBe('/uploads/journal/cover.webp')
  })
})
