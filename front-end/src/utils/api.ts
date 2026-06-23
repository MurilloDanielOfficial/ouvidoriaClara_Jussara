import { API_BASE_URL } from './config'

export class ApiError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!response.ok) {
    if (isJson) {
      const body = await response.json().catch(() => ({}))
      throw new ApiError(
        body.message || body.error || `Erro ${response.status}`,
        response.status,
        JSON.stringify(body)
      )
    }
    const text = await response.text().catch(() => '')
    throw new ApiError(text || `Erro ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (contentType.includes('text/plain')) {
    const text = await response.text()
    return text as T
  }

  if (isJson) {
    const body = await response.json()
    if (body && typeof body === 'object' && 'error' in body) {
      throw new ApiError(String(body.error), response.status)
    }
    return body as T
  }

  return (await response.text()) as unknown as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  return handleResponse<T>(response)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  return handleResponse<T>(response)
}
