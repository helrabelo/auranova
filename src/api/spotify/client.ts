import { getAccessToken, refreshAccessToken, logout } from './auth'
import type { SpotifyError } from './types'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  retried?: boolean
}

export class SpotifyApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
  }
}

export async function spotifyFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, retried = false } = options

  const accessToken = await getAccessToken()

  if (!accessToken) {
    throw new SpotifyApiError(401, 'Not authenticated')
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  if (body) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, fetchOptions)

  // Handle token expiration
  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return spotifyFetch<T>(endpoint, { ...options, retried: true })
    }
    logout()
    throw new SpotifyApiError(401, 'Session expired. Please log in again.')
  }

  if (!response.ok) {
    let errorMessage = 'Unknown error'

    try {
      const errorData = (await response.json()) as SpotifyError
      errorMessage = errorData.error?.message ?? errorMessage
    } catch {
      errorMessage = response.statusText
    }

    throw new SpotifyApiError(response.status, errorMessage)
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}
