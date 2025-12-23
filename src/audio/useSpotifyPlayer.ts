import { useEffect, useCallback, useRef } from 'react'
import { useSpotifySDK } from '@/api/hooks/useSpotifySDK'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import { spotifyPlayer, type SpotifyPlayerState } from './SpotifyPlayer'
import type { PlaybackError } from '@/api/spotify/types'

interface UseSpotifyPlayerResult {
  isReady: boolean
  isLoading: boolean
  error: PlaybackError | null
  initialize: () => Promise<void>
}

/**
 * Hook to initialize and manage the Spotify Web Playback SDK player
 * Automatically loads SDK when authenticated and sets up event listeners
 */
export function useSpotifyPlayer(): UseSpotifyPlayerResult {
  const {
    isReady: sdkReady,
    isLoading: sdkLoading,
    loadSDK,
  } = useSpotifySDK()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const {
    sdkReady: playerReady,
    sdkLoading: playerLoading,
    sdkError,
    setSdkReady,
    setSdkLoading,
    setSdkError,
    setPlayerState,
    setMode,
  } = usePlaybackStore()

  const isInitializingRef = useRef(false)

  // Load SDK when authenticated
  useEffect(() => {
    if (isAuthenticated && !sdkReady && !sdkLoading) {
      loadSDK().catch((err: unknown) => {
        console.error('[useSpotifyPlayer] Failed to load SDK:', err)
      })
    }
  }, [isAuthenticated, sdkReady, sdkLoading, loadSDK])

  // Initialize player when SDK is ready
  useEffect(() => {
    if (!sdkReady || !isAuthenticated || isInitializingRef.current) return
    if (spotifyPlayer.isConnected()) return

    isInitializingRef.current = true
    setSdkLoading(true)

    spotifyPlayer.initialize().then((success) => {
      setSdkLoading(false)
      isInitializingRef.current = false

      if (success) {
        setSdkReady(true)
        setMode('sdk')
      }
    })

    // Set up state change listener
    const unsubStateChange = spotifyPlayer.on(
      'state_changed',
      (state) => {
        setPlayerState(state as SpotifyPlayerState)
      }
    )

    // Handle errors
    const unsubError = spotifyPlayer.on('error', (error) => {
      const err = error as { type: string; message: string }
      const playbackError: PlaybackError = {
        type: err.type as PlaybackError['type'],
        message: err.message,
      }
      setSdkError(playbackError)

      // Fall back to preview mode on account error (non-Premium)
      if (err.type === 'account') {
        console.log(
          '[useSpotifyPlayer] Account error - falling back to preview mode'
        )
        setMode('preview')
      }
    })

    // Handle autoplay blocked
    const unsubAutoplay = spotifyPlayer.on('autoplay_failed', () => {
      console.log('[useSpotifyPlayer] Autoplay blocked by browser')
    })

    return () => {
      unsubStateChange()
      unsubError()
      unsubAutoplay()
    }
  }, [
    sdkReady,
    isAuthenticated,
    setSdkReady,
    setSdkLoading,
    setSdkError,
    setPlayerState,
    setMode,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount - keep player alive for background playback
    }
  }, [])

  const initialize = useCallback(async () => {
    if (!sdkReady) {
      await loadSDK()
    }
  }, [sdkReady, loadSDK])

  return {
    isReady: playerReady,
    isLoading: playerLoading || sdkLoading,
    error: sdkError,
    initialize,
  }
}

/**
 * Hook to activate the player element (for browser autoplay policies)
 * Call this on user interaction if autoplay was blocked
 */
export function useActivatePlayer(): () => Promise<void> {
  return useCallback(async () => {
    await spotifyPlayer.activateElement()
  }, [])
}
