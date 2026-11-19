import type { JournalCandidate, JournalPage } from '@/services/api'
import { contentFirstImage, contentText } from '@/components/content/contentFormat'
import { balancedTextChunks } from './textPagination'

export const AUTO_ISSUE_PAGES = 30
const CONTENTS_LIMIT = 12
const FIRST_PAGE_LIMIT = 1400
const FIRST_PAGE_WITH_IMAGE_LIMIT = 700
const CONTINUATION_LIMIT = 1800
/** Cover, title page and contents in front, finale at the back. */
const FIXED_PAGES = 4

export type PageBuilder = (template: JournalPage['template']) => JournalPage

interface Article {
  candidate: JournalCandidate
  image: string
  chunks: string[]
}

function toArticle(candidate: JournalCandidate): Article | undefined {
  const image = contentFirstImage(candidate.body)
  const text = contentText(candidate.body).trim() || candidate.summary.trim()
  const chunks = balancedTextChunks(
    text,
    image ? FIRST_PAGE_WITH_IMAGE_LIMIT : FIRST_PAGE_LIMIT,
    CONTINUATION_LIMIT,
  )
  return chunks.length ? { candidate, image, chunks } : undefined
}

function articleTemplate(article: Article): JournalPage['template'] {
  const category = article.candidate.category_slug
  if (category === 'guides' || category === 'esports') return 'columns'
  if (category === 'news' && article.chunks.length === 1) return 'briefs'
  return 'feature'
}

function articlePages(article: Article, build: PageBuilder, opener: boolean): JournalPage[] {
  const [firstText = '', ...rest] = article.chunks
  const first: JournalPage = {
    ...build(articleTemplate(article)),
    publication_ids: [article.candidate.id],
    text: firstText,
    image_url: article.image,
  }
  const photo: JournalPage[] = opener
    ? [
        {
          ...build('photo'),
          publication_ids: [article.candidate.id],
          heading: article.candidate.title,
          image_url: article.image,
        },
      ]
    : []
  return [
    ...photo,
    first,
    ...rest.map((text) => ({
      ...first,
      heading: '',
      text,
      image_url: '',
      image_position: 'full' as const,
      continuation: true,
    })),
  ]
}

export interface ComposeOptions {
  /** Desired number of pages including cover, title, contents and finale. */
  target?: number
  /** Only these category slugs are used; empty or missing means all of them. */
  categories?: string[]
  /** Articles of this category are placed first. */
  priority?: string
  /** Put a full-page photo in front of every `openerEvery`-th article that has an image; 0 disables. */
  openerEvery?: number
}

function rank(candidates: JournalCandidate[], options: ComposeOptions): JournalCandidate[] {
  const allowed = options.categories?.length ? new Set(options.categories) : undefined
  const filtered = allowed
    ? candidates.filter((candidate) => allowed.has(candidate.category_slug))
    : candidates
  if (!options.priority) return filtered
  return [
    ...filtered.filter((candidate) => candidate.category_slug === options.priority),
    ...filtered.filter((candidate) => candidate.category_slug !== options.priority),
  ]
}

/**
 * Builds a ready-to-edit issue of roughly `target` pages from the best candidates:
 * cover, title page and contents, then whole articles in rating order, then a finale.
 * Articles are never cut in the middle, so the total may fall a little short of the target.
 */
export function composeIssue(
  candidates: JournalCandidate[],
  title: string,
  build: PageBuilder,
  options: ComposeOptions = {},
): JournalPage[] {
  const budget = Math.max(0, (options.target ?? AUTO_ISSUE_PAGES) - FIXED_PAGES)
  const openerEvery = options.openerEvery ?? 0
  const chosen: Article[] = []
  const openers = new Set<string>()
  let used = 0
  for (const candidate of rank(candidates, options)) {
    if (used >= budget) break
    const article = toArticle(candidate)
    if (!article) continue
    const opener = openerEvery > 0 && !!article.image && chosen.length % openerEvery === 0
    const cost = article.chunks.length + (opener ? 1 : 0)
    if (used + cost > budget) continue
    if (opener) openers.add(candidate.id)
    chosen.push(article)
    used += cost
  }
  if (!chosen.length) return []

  const cover: JournalPage = {
    ...build('cover'),
    heading: title,
    text: chosen
      .slice(0, 3)
      .map((article) => article.candidate.title)
      .join('\n'),
    image_url: chosen.find((article) => article.image)?.image ?? '',
  }
  const contents: JournalPage = {
    ...build('contents'),
    publication_ids: chosen.slice(0, CONTENTS_LIMIT).map((article) => article.candidate.id),
  }
  const finale: JournalPage = {
    ...build('finale'),
    text: 'Следующий номер — уже скоро.',
  }
  return [
    cover,
    build('title'),
    contents,
    ...chosen.flatMap((article) => articlePages(article, build, openers.has(article.candidate.id))),
    finale,
  ]
}
