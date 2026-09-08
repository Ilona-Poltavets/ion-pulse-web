import { describe, expect, it } from 'vitest'
import {
  canTurnReader,
  normalizeDesktopReaderIndex,
  readerRange,
  readerStep,
} from '@/components/journal/readerPagination'

describe('journal reader pagination', () => {
  it('shows the cover alone and then opens two-page spreads', () => {
    expect(readerRange(0, 8, false)).toEqual([1, 1])
    expect(readerStep(0, 1, false)).toBe(1)
    expect(readerRange(1, 8, false)).toEqual([2, 3])
    expect(readerStep(1, 1, false)).toBe(2)
    expect(readerRange(3, 8, false)).toEqual([4, 5])
  })

  it('returns from the first spread directly to the cover', () => {
    expect(readerStep(1, -1, false)).toBe(1)
    expect(canTurnReader(1, -1, 8, false)).toBe(true)
    expect(normalizeDesktopReaderIndex(2)).toBe(1)
  })

  it('keeps one-page navigation on mobile', () => {
    expect(readerStep(0, 1, true)).toBe(1)
    expect(readerRange(1, 8, true)).toEqual([2, 2])
  })
})
