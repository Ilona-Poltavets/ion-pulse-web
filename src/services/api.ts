export interface HealthResponse {
  status: 'ok'
  service: string
  version: string
  environment: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
