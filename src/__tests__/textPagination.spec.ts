import { describe, expect, it } from 'vitest'
import { balancedTextChunks } from '@/components/journal/textPagination'

describe('balancedTextChunks', () => {
  it('keeps short copy on one page', () => {
    expect(balancedTextChunks('Короткий журнальный текст', 100)).toEqual([
      'Короткий журнальный текст',
    ])
  })

  it('preserves all words and balances continuation pages', () => {
    const text = Array.from({ length: 520 }, (_, index) => `слово${index}`).join(' ')
    const chunks = balancedTextChunks(text, 700, 1200)

    expect(chunks.join(' ')).toBe(text)
    expect(chunks.length).toBeGreaterThan(2)
    const continuationLengths = chunks.slice(1).map((chunk) => chunk.length)
    expect(Math.min(...continuationLengths) / Math.max(...continuationLengths)).toBeGreaterThan(0.9)
  })

  it('does not leave a tiny final page just above the first-page capacity', () => {
    const text = Array.from({ length: 150 }, () => 'журнал').join(' ')
    const [first = '', last = ''] = balancedTextChunks(text, 700, 1200)

    expect(last.length).toBeGreaterThan(first.length)
    expect(last.length).toBeGreaterThan(600)
  })
})
