import { create } from 'zustand'
import {
  startAuthFlow,
  handleCallback,
  logout as authLogout,
  isAuthenticated,
  getStoredAuth,
} from '@/api/spotify/auth'

interface AuthState {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: () => Promise<void>
  logout: () => void
  checkAuth: () => void
  handleAuthCallback: (code: string) => Promise<boolean>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Login action - starts OAuth flow
  login: async (): Promise<void> => {
    set({ isLoading: true, error: null })
    try {
      await startAuthFlow()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start login'
      set({ error: errorMessage, isLoading: false })
    }
  },

  // Logout action
  logout: (): void => {
    authLogout()
    set({ isAuthenticated: false, error: null })
  },

  // Check if user is already authenticated
  checkAuth: (): void => {
    const { accessToken } = getStoredAuth()
    const authenticated = isAuthenticated() && !!accessToken
    set({ isAuthenticated: authenticated, isLoading: false })
  },

  // Handle OAuth callback
  handleAuthCallback: async (code: string): Promise<boolean> => {
    set({ isLoading: true, error: null })
    const result = await handleCallback(code)

    if (result.success) {
      set({ isAuthenticated: true, isLoading: false })
      return true
    } else {
      // Check if tokens were actually stored (handles race conditions in Strict Mode)
      const { accessToken } = getStoredAuth()
      if (accessToken) {
        set({ isAuthenticated: true, isLoading: false })
        return true
      }
      set({
        isAuthenticated: false,
        isLoading: false,
        error: result.error ?? 'Authentication failed',
      })
      return false
    }
  },

  // Clear error
  clearError: (): void => {
    set({ error: null })
  },
}))
