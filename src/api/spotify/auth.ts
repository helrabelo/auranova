import CryptoJS from 'crypto-js'
import type { TokenResponse } from './types'

// Spotify OAuth configuration
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

const SCOPES = [
  'user-top-read',
  'user-read-recently-played',
  'streaming',
  'user-read-email',
  'user-read-private',
].join(' ')

// PKCE helpers
function generateRandomString(length: number): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  // Use native crypto.subtle if available (secure contexts)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return crypto.subtle.digest('SHA-256', data)
  }

  // Fallback to crypto-js for non-secure contexts
  const hash = CryptoJS.SHA256(plain)
  const hexString = hash.toString(CryptoJS.enc.Hex)

  // Convert hex string to ArrayBuffer
  const bytes = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

function base64urlencode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier)
  return base64urlencode(hashed)
}

// Storage keys
const STORAGE_KEYS = {
  CODE_VERIFIER: 'spotify_code_verifier',
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_AT: 'spotify_expires_at',
} as const

// Get configuration from environment
function getConfig(): { clientId: string; redirectUri: string } {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error(
      'Missing Spotify configuration. Please set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI in your .env file.'
    )
  }

  return { clientId, redirectUri }
}

// Start the OAuth flow
export async function startAuthFlow(): Promise<void> {
  const { clientId, redirectUri } = getConfig()

  console.log('startAuthFlow: generating PKCE challenge')
  console.log('startAuthFlow: redirect URI:', redirectUri)

  const codeVerifier = generateRandomString(64)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  console.log('startAuthFlow: code verifier length:', codeVerifier.length)
  console.log(
    'startAuthFlow: code challenge:',
    codeChallenge.substring(0, 20) + '...'
  )

  // Store the code verifier for later
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier)
  console.log('startAuthFlow: stored code verifier in localStorage')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'false',
  })

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForToken(code: string): Promise<boolean> {
  const { clientId, redirectUri } = getConfig()

  const codeVerifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER)
  if (!codeVerifier) {
    console.error('No code verifier found in localStorage')
    console.error(
      'This usually means the auth flow was started in a different browser tab/window'
    )
    return false
  }

  console.log('Exchanging code for token...')
  console.log('Redirect URI:', redirectUri)
  console.log('Code verifier length:', codeVerifier.length)

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        'Token exchange failed:',
        response.status,
        response.statusText
      )
      console.error('Error response:', errorText)
      return false
    }

    const data = (await response.json()) as TokenResponse
    console.log('Token exchange successful!')
    storeTokens(data)

    // Clean up code verifier
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER)

    return true
  } catch (error) {
    console.error('Token exchange error:', error)
    return false
  }
}

// Refresh the access token
export async function refreshAccessToken(): Promise<boolean> {
  const { clientId } = getConfig()

  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  if (!refreshToken) {
    console.error('No refresh token found')
    return false
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token refresh failed:', error)
      return false
    }

    const data = (await response.json()) as TokenResponse
    storeTokens(data)

    return true
  } catch (error) {
    console.error('Token refresh error:', error)
    return false
  }
}

// Store tokens in localStorage
function storeTokens(data: TokenResponse): void {
  const expiresAt = Date.now() + data.expires_in * 1000

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString())

  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
  }
}

// Get the current access token (refreshing if needed)
export async function getAccessToken(): Promise<string | null> {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT)

  if (!accessToken || !expiresAt) {
    return null
  }

  // Check if token is expired or will expire in the next minute
  const isExpired = Date.now() > parseInt(expiresAt, 10) - 60000

  if (isExpired) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return null
    }
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }

  return accessToken
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT)

  if (!accessToken || !expiresAt) {
    return false
  }

  // Consider authenticated if we have a token (even if expired, we might refresh it)
  return !!accessToken
}

// Get stored token info
export function getStoredAuth(): {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
} {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    expiresAt: localStorage.getItem(STORAGE_KEYS.EXPIRES_AT)
      ? parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) ?? '0', 10)
      : null,
  }
}

// Logout - clear all tokens
export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT)
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER)
}

// Handle the callback from Spotify
export async function handleCallback(code: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!code) {
    return { success: false, error: 'No authorization code received' }
  }

  const success = await exchangeCodeForToken(code)

  return { success }
}
