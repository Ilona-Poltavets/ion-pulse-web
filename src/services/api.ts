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
  category_slug: 'reviews' | 'news' | 'guides' | 'esports'
  source_locale: 'ru' | 'en'
  title: string
  summary: string
  body: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok)
    throw new Error((await response.json().catch(() => null))?.detail ?? 'Request failed')
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

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return request('/auth/me')
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
export function createDraft(payload: DraftCreatePayload): Promise<unknown> {
  return request('/publications/drafts', {
    method: 'POST',
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
