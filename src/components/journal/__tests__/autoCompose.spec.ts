import { describe, expect, it } from 'vitest'
import type { JournalCandidate, JournalPage } from '@/services/api'
import { AUTO_ISSUE_PAGES, composeIssue } from '../autoCompose'

const build = (template: JournalPage['template']): JournalPage => ({
  template,
  publication_ids: [],
  heading: '',
  text: '',
  image_url: '',
  accent: '#c5ef58',
  image_width: 100,
  image_height: 38,
  image_position: 'full',
  text_x: 8,
  text_y: 8,
  text_width: 84,
  text_size: 38,
  continuation: false,
  one_post_per_page: false,
})

function candidate(index: number, words: number, category = 'reviews'): JournalCandidate {
  return {
    id: `id-${index}`,
    category_slug: category,
    title: `Material ${index}`,
    summary: 'Summary',
    body: Array.from({ length: words }, (_, word) => `слово${word}`).join(' '),
    view_count: 0,
    published_at: '2026-11-01T00:00:00Z',
    average_rating: 0,
    comment_count: 0,
    score: 0,
  }
}

describe('composeIssue', () => {
  it('returns nothing without materials', () => {
    expect(composeIssue([], 'Issue', build)).toEqual([])
  })

  it('builds cover, title, contents, articles and finale in order', () => {
    const pages = composeIssue([candidate(1, 400)], 'Issue', build)
    expect(pages.map((page) => page.template)).toEqual([
      'cover',
      'title',
      'contents',
      ...pages.slice(3, -1).map((page) => page.template),
      'finale',
    ])
    expect(pages[0]?.heading).toBe('Issue')
    expect(pages[2]?.publication_ids).toEqual(['id-1'])
  })

  it('marks overflow pages as continuations of the same material', () => {
    const pages = composeIssue([candidate(1, 700)], 'Issue', build)
    const body = pages.slice(3, -1)
    expect(body.length).toBeGreaterThan(1)
    expect(body[0]?.continuation).toBe(false)
    expect(body.slice(1).every((page) => page.continuation)).toBe(true)
    expect(body.every((page) => page.publication_ids[0] === 'id-1')).toBe(true)
  })

  it('filters categories and puts the priority category first', () => {
    const items = [
      candidate(1, 300, 'reviews'),
      candidate(2, 300, 'guides'),
      candidate(3, 300, 'esports'),
    ]
    const guidesOnly = composeIssue(items, 'Issue', build, { categories: ['guides'] })
    expect(new Set(guidesOnly.flatMap((page) => page.publication_ids))).toEqual(new Set(['id-2']))
    const prioritised = composeIssue(items, 'Issue', build, { priority: 'esports' })
    expect(prioritised[2]?.publication_ids[0]).toBe('id-3')
  })

  it('adds photo openers and respects the target', () => {
    const items = Array.from({ length: 20 }, (_, index) => ({
      ...candidate(index, 500),
      body:
        '<!-- ion-pulse:blocks --><img src="/a.png" alt=""><p>' +
        candidate(index, 500).body +
        '</p>',
    }))
    const pages = composeIssue(items, 'Issue', build, { target: 20, openerEvery: 2 })
    expect(pages.some((page) => page.template === 'photo')).toBe(true)
    expect(pages.length).toBeLessThanOrEqual(20)
  })

  it('stays within the page target', () => {
    const many = Array.from({ length: 40 }, (_, index) => candidate(index, 600))
    const pages = composeIssue(many, 'Issue', build)
    expect(pages.length).toBeLessThanOrEqual(AUTO_ISSUE_PAGES)
    expect(pages.length).toBeGreaterThan(AUTO_ISSUE_PAGES - 6)
  })
})
