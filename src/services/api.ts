export interface HealthResponse {
  status: 'ok'
  service: string
  version: string
  environment: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  display_name: string
  roles: string[]
}
export interface AdminUser extends AuthenticatedUser {
  is_active: boolean
}
export interface UserRoleAuditEntry {
  user_id: string
  actor_id: string
  role_code: string
  action: string
  created_at: string
}

export interface RegisterPayload {
  email: string
  display_name: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}
export interface ProfileUpdatePayload {
  display_name: string
}
export interface AuthorApplication {
  id: string
  motivation: string
  portfolio_url: string | null
  status: string
  created_at: string
}
export interface DraftCreatePayload {
  category_slug: string
  content_type: 'article' | 'review' | 'news' | 'guide' | 'digest'
  game_id: string | null
  review_score: number | null
  source_locale: 'ru' | 'en'
  title: string
  summary: string
  body: string
}
export interface Draft extends DraftCreatePayload {
  id: string
  status: string
  scheduled_at: string | null
  created_at: string
}
export interface PublicationRevision {
  revision_number: number
  category_slug: DraftCreatePayload['category_slug']
  content_type: DraftCreatePayload['content_type']
  game_id: string | null
  review_score: number | null
  title: string
  summary: string
  body: string
  created_at: string
}
export interface PublishedPublication {
  id: string
  author_id: string
  author_name: string
  category_slug: string
  content_type: DraftCreatePayload['content_type']
  game_id: string | null
  review_score: number | null
  source_locale: 'ru' | 'en'
  locale: 'ru' | 'en'
  translation_available: boolean
  title: string
  summary: string
  body: string
  published_at: string
}
export interface FeedPublication extends Omit<PublishedPublication, 'body'> {
  author_name: string
}
export interface DigestItem {
  id: string
  category_slug: string
  title: string
  summary: string
}
export interface JournalCandidate extends DigestItem {
  body: string
  view_count: number
  published_at: string
  average_rating: number
  comment_count: number
  score: number
}
export interface JournalPage {
  template: 'feature' | 'columns' | 'interview' | 'briefs' | 'poster'
  publication_ids: string[]
  heading: string
  text: string
  image_url: string
  accent: string
}
export interface JournalIssue {
  pages: JournalPage[]
  id: string
  title: string
  period_start: string
  period_end: string
  status: string
  published_at: string | null
}
export interface PublicationRating {
  value: number
}
export interface Comment {
  id: string
  author_id: string
  parent_id: string | null
  body: string
  media_kind: 'gif' | 'sticker' | null
  media_value: string | null
  created_at: string
}
export interface ModeratedComment extends Comment {
  publication_id: string
  is_hidden: boolean
}
export interface Game {
  id: string
  slug: string
  title: string
}
export interface Category {
  slug: string
  name: string
  description: string
  color: string
  sort_order: number
}
export interface ManagedCategory {
  slug: string
  name_ru: string
  name_en: string
  description_ru: string
  description_en: string
  color: string
  sort_order: number
  is_visible: boolean
}
export type CategoryUpdatePayload = Omit<ManagedCategory, 'slug'>
export interface GameSubscription extends Game {
  subscribed_at: string
}
export interface AuthorSubscription {
  author_id: string
  display_name: string
  subscribed_at: string
}
export interface ContentReport {
  id: string
  target_type: 'publication' | 'comment'
  target_id: string
  reason: string
  status: string
  review_note: string | null
  created_at: string
  reviewed_at: string | null
  target_author_id: string | null
  target_excerpt: string | null
}
export interface SanctionAppeal {
  id: string
  sanction_id: string
  user_id: string
  reason: string
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
}
export interface PublicationAiReview {
  id: string
  source_revision: number
  status: string
  decision: string | null
  risk_categories: string[] | null
  reasons: string[] | null
  confidence: number | null
  age_rating: number | null
  provider: string | null
  model: string | null
  rules_version: string | null
  created_at: string
  completed_at: string | null
}
export interface PublicationLocalization {
  locale: 'ru' | 'en'
  origin: string
  translation_status: string
  source_revision: number
  title: string
  summary: string
  body: string
}

const apiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    const detail: unknown = (await response.json().catch(() => null))?.detail
    const messages = Array.isArray(detail)
      ? detail.flatMap((entry: unknown) => {
          if (
            !entry ||
            typeof entry !== 'object' ||
            !('msg' in entry) ||
            typeof entry.msg !== 'string'
          )
            return []
          const field =
            'loc' in entry && Array.isArray(entry.loc)
              ? entry.loc
                  .filter(
                    (part: unknown) =>
                      (typeof part === 'string' && part !== 'body') || typeof part === 'number',
                  )
                  .join('.')
              : ''
          return [field ? `${field}: ${entry.msg}` : entry.msg]
        })
      : []
    throw new Error(
      typeof detail === 'string'
        ? detail
        : messages.join('; ') || `Request failed (${response.status})`,
    )
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiUrl}/api/v1/health`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}

export function register(payload: RegisterPayload): Promise<AuthenticatedUser> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function login(payload: LoginPayload): Promise<AuthenticatedUser> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function requestPasswordReset(email: string): Promise<void> {
  return request<undefined>('/auth/password-reset-requests', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function resetPassword(payload: { token: string; password: string }): Promise<void> {
  return request<undefined>('/auth/password-resets', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function submitCurrentSanctionAppeal(payload: {
  email: string
  password: string
  reason: string
}): Promise<SanctionAppeal> {
  return request('/moderation/sanctions/appeals/current', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return request('/auth/me')
}
export function listAdminUsers(): Promise<AdminUser[]> {
  return request('/admin/users')
}
export function updateUserRoles(id: string, roles: string[]): Promise<AdminUser> {
  return request(`/admin/users/${id}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listUserRoleAudit(): Promise<UserRoleAuditEntry[]> {
  return request('/admin/role-audit')
}
export function updateProfile(payload: ProfileUpdatePayload): Promise<AuthenticatedUser> {
  return request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function getAuthorApplication(): Promise<AuthorApplication | null> {
  return request('/author-applications/me')
}
export function createAuthorApplication(payload: {
  motivation: string
  portfolio_url?: string
}): Promise<AuthorApplication> {
  return request('/author-applications', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listAuthorApplications(): Promise<AuthorApplication[]> {
  return request('/author-applications')
}
export function decideAuthorApplication(
  id: string,
  payload: { status: 'approved' | 'rejected'; review_note?: string },
): Promise<AuthorApplication> {
  return request(`/author-applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function createDraft(payload: DraftCreatePayload): Promise<Draft> {
  return request('/publications/drafts', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listMyDrafts(): Promise<Draft[]> {
  return request('/publications/mine')
}
export function submitDraft(id: string): Promise<Draft> {
  return request(`/publications/${id}/submit`, { method: 'POST' })
}
export function updateDraft(
  id: string,
  payload: Omit<DraftCreatePayload, 'source_locale'>,
): Promise<Draft> {
  return request(`/publications/${id}/draft`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listPublicationRevisions(id: string): Promise<PublicationRevision[]> {
  return request(`/publications/${id}/revisions`)
}
export function restorePublicationRevision(id: string, revisionNumber: number): Promise<Draft> {
  return request(`/publications/${id}/revisions/${revisionNumber}/restore`, { method: 'POST' })
}
export function getPublicationAiReview(id: string): Promise<PublicationAiReview | null> {
  return request(`/publications/${id}/ai-review`)
}
export function getPublicationLocalization(
  id: string,
  locale: 'ru' | 'en',
): Promise<PublicationLocalization> {
  return request(`/publications/${id}/localizations/${locale}`)
}
export function updatePublicationLocalization(
  id: string,
  locale: 'ru' | 'en',
  payload: Pick<PublicationLocalization, 'title' | 'summary' | 'body'>,
): Promise<PublicationLocalization> {
  return request(`/publications/${id}/localizations/${locale}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listEditorialQueue(): Promise<Draft[]> {
  return request('/publications/editorial-queue')
}
export function decidePublication(
  id: string,
  payload: {
    decision: 'schedule' | 'publish' | 'reject' | 'request_changes'
    note: string
    scheduled_at?: string
  },
): Promise<Draft> {
  return request(`/publications/${id}/editorial-decision`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listPublishedPublications(
  locale: 'ru' | 'en',
  options: { category_slug?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<FeedPublication[]> {
  const parameters = new URLSearchParams({ locale })
  if (options.category_slug) parameters.set('category_slug', options.category_slug)
  if (options.search) parameters.set('search', options.search)
  if (options.limit) parameters.set('limit', String(options.limit))
  if (options.offset) parameters.set('offset', String(options.offset))
  return request(`/publications/feed?${parameters}`)
}
export function listCategories(locale: 'ru' | 'en'): Promise<Category[]> {
  return request(`/categories?locale=${locale}`)
}
export function listManageableCategories(): Promise<ManagedCategory[]> {
  return request('/categories/manage')
}
export function updateCategory(
  slug: string,
  payload: CategoryUpdatePayload,
): Promise<ManagedCategory> {
  return request(`/categories/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listDigestItems(id: string, locale: 'ru' | 'en'): Promise<DigestItem[]> {
  return request(`/publications/published/${id}/digest-items?locale=${locale}`)
}
export function listJournalCandidates(
  locale: 'ru' | 'en',
  month?: string,
): Promise<JournalCandidate[]> {
  return request(
    `/publications/journal-candidates?locale=${locale}${month ? `&month=${month}` : ''}`,
  )
}
export function createJournalIssue(payload: {
  title: string
  period_start: string
  period_end: string
}): Promise<JournalIssue> {
  return request('/journal/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export async function replaceJournalIssuePublications(
  id: string,
  publicationIds: string[],
): Promise<void> {
  await request<undefined>(`/journal/issues/${id}/publications`, {
    method: 'PUT',
    body: JSON.stringify({ publication_ids: publicationIds }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function publishJournalIssue(id: string): Promise<JournalIssue> {
  return request(`/journal/issues/${id}/publish`, { method: 'POST' })
}
export function listJournalIssues(): Promise<JournalIssue[]> {
  return request('/journal/issues')
}
export function listJournalIssuePublications(
  id: string,
  locale: 'ru' | 'en',
): Promise<DigestItem[]> {
  return request(`/journal/issues/${id}/publications?locale=${locale}`)
}
export function listEditableDigestItems(id: string): Promise<DigestItem[]> {
  return request(`/publications/${id}/digest-items`)
}
export function replaceDigestItems(id: string, publicationIds: string[]): Promise<DigestItem[]> {
  return request(`/publications/${id}/digest-items`, {
    method: 'PUT',
    body: JSON.stringify({ publication_ids: publicationIds }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function getPublishedPublication(
  id: string,
  locale: 'ru' | 'en',
): Promise<PublishedPublication> {
  return request(`/publications/published/${id}?locale=${locale}`)
}
export function listComments(publicationId: string): Promise<Comment[]> {
  return request(`/publications/${publicationId}/comments`)
}
export function createComment(
  publicationId: string,
  payload: {
    body: string
    parent_id?: string
    media_kind?: 'gif' | 'sticker'
    media_value?: string
  },
): Promise<Comment> {
  return request(`/publications/${publicationId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function setPublicationRating(
  publicationId: string,
  value: number,
): Promise<PublicationRating> {
  return request(`/publications/${publicationId}/rating`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listGames(): Promise<Game[]> {
  return request('/subscriptions/games/catalog')
}
export function listGameSubscriptions(): Promise<GameSubscription[]> {
  return request('/subscriptions/games')
}
export async function subscribeToGame(gameId: string): Promise<void> {
  await request<undefined>(`/subscriptions/games/${gameId}`, { method: 'POST' })
}
export async function unsubscribeFromGame(gameId: string): Promise<void> {
  await request<undefined>(`/subscriptions/games/${gameId}`, { method: 'DELETE' })
}
export function listAuthorSubscriptions(): Promise<AuthorSubscription[]> {
  return request('/subscriptions/authors')
}
export async function subscribeToAuthor(authorId: string): Promise<void> {
  await request<undefined>(`/subscriptions/authors/${authorId}`, { method: 'POST' })
}
export async function unsubscribeFromAuthor(authorId: string): Promise<void> {
  await request<undefined>(`/subscriptions/authors/${authorId}`, { method: 'DELETE' })
}
export function reportPublication(id: string, reason: string): Promise<ContentReport> {
  return request(`/publications/${id}/reports`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function reportComment(id: string, reason: string): Promise<ContentReport> {
  return request(`/comments/${id}/reports`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listOpenReports(): Promise<ContentReport[]> {
  return request('/reports')
}
export function reviewReport(
  id: string,
  payload: { status: 'resolved' | 'dismissed'; review_note: string },
): Promise<ContentReport> {
  return request(`/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function updateCommentVisibility(id: string, isHidden: boolean): Promise<Comment> {
  return request(`/publications/comments/${id}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ is_hidden: isHidden }),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listHiddenComments(): Promise<ModeratedComment[]> {
  return request('/moderation/comments/hidden')
}
export function suspendUser(
  userId: string,
  payload: { reason: string; expires_at: string },
): Promise<void> {
  return request(`/moderation/users/${userId}/suspensions`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
export function listSanctionAppeals(): Promise<SanctionAppeal[]> {
  return request('/moderation/appeals')
}
export function decideSanctionAppeal(
  id: string,
  payload: { status: 'approved' | 'rejected'; review_note: string },
): Promise<SanctionAppeal> {
  return request(`/moderation/appeals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function logout(): Promise<void> {
  const response = await fetch(`${apiUrl}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Logout failed')
}

export async function exportMyData(): Promise<void> {
  const response = await fetch(`${apiUrl}/api/v1/auth/me/export`, { credentials: 'include' })
  if (!response.ok) throw new Error('Could not export data')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'ion-pulse-data.json'
  link.click()
  URL.revokeObjectURL(url)
}

export async function deleteMyAccount(payload: {
  password: string
  reason?: string
}): Promise<void> {
  await request<undefined>('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function listJournalDrafts(): Promise<JournalIssue[]> {
  return request('/journal/drafts')
}
export function saveJournalIssue(
  id: string,
  payload: Pick<JournalIssue, 'title' | 'period_start' | 'period_end' | 'pages'>,
): Promise<JournalIssue> {
  return request(`/journal/issues/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}
export function getJournalMaterials(id: string, locale: string): Promise<JournalCandidate[]> {
  return request(`/journal/issues/${id}/materials?locale=${locale}`)
}
