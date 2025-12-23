import { useState, useCallback, useRef } from 'react'

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
const SDK_TIMEOUT_MS = 10000

interface UseSpotifySDKResult {
  isReady: boolean
  isLoading: boolean
  error: Error | null
  loadSDK: () => Promise<void>
}

/**
 * Hook to load and manage the Spotify Web Playback SDK script
 * Loads the SDK from Spotify's CDN and handles the ready callback
 */
export function useSpotifySDK(): UseSpotifySDKResult {
  const [isReady, setIsReady] = useState(() => !!window.Spotify)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  const loadSDK = useCallback(async (): Promise<void> => {
    // Already loaded
    if (window.Spotify) {
      setIsReady(true)
      return
    }

    // Return existing promise if already loading
    if (loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    setIsLoading(true)
    setError(null)

    loadPromiseRef.current = new Promise<void>((resolve, reject) => {
      // Set up ready callback before loading script
      window.onSpotifyWebPlaybackSDKReady = () => {
        setIsReady(true)
        setIsLoading(false)
        loadPromiseRef.current = null
        resolve()
      }

      // Check if script already exists
      const existingScript = document.querySelector(`script[src="${SDK_URL}"]`)
      if (existingScript) {
        // Script exists but SDK not ready yet, wait for callback
        return
      }

      const script = document.createElement('script')
      script.src = SDK_URL
      script.async = true

      script.onerror = () => {
        const err = new Error('Failed to load Spotify Web Playback SDK')
        setError(err)
        setIsLoading(false)
        loadPromiseRef.current = null
        reject(err)
      }

      document.body.appendChild(script)

      // Timeout fallback
      setTimeout(() => {
        if (!window.Spotify && loadPromiseRef.current) {
          const err = new Error('Spotify SDK load timeout')
          setError(err)
          setIsLoading(false)
          loadPromiseRef.current = null
          reject(err)
        }
      }, SDK_TIMEOUT_MS)
    })

    return loadPromiseRef.current
  }, [])

  return { isReady, isLoading, error, loadSDK }
}
