import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * Onboarding transition states
 */
type OnboardingState =
  | 'welcome'        // Initial unauthenticated state
  | 'connecting'     // User clicked connect, pre-redirect
  | 'authenticating' // Returned from Spotify, processing
  | 'success'        // Auth successful, brief celebration
  | 'loading'        // Fetching music data with progressive messages
  | 'hidden'         // Galaxy revealed, overlay hidden

const LOADING_MESSAGES = [
  { text: 'Connecting to Spotify...', duration: 800 },
  { text: 'Fetching your top artists...', duration: 1200 },
  { text: 'Mapping your music universe...', duration: 1000 },
  { text: 'Calculating artist relationships...', duration: 1000 },
  { text: 'Positioning your galaxy...', duration: 800 },
]

interface OnboardingOverlayProps {
  onStartLogin: () => void
}

const SKIP_HINT_DELAY = 2000 // Show skip hint after 2 seconds of reveal

export function OnboardingOverlay({ onStartLogin }: OnboardingOverlayProps): React.JSX.Element | null {
  const { isAuthenticated, isLoading: authLoading, error: authError } = useAuthStore()
  const { isLoading: musicLoading, galaxyData } = useMusicStore()

  // Galaxy phase from store for skip functionality
  const galaxyPhase = useUIStore((state) => state.galaxyPhase)
  const triggerSkipReveal = useUIStore((state) => state.triggerSkipReveal)

  const [state, setState] = useState<OnboardingState>('welcome')
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showSkipHint, setShowSkipHint] = useState(false)
  const previousAuthRef = useRef(isAuthenticated)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle skip action (keyboard/touch)
  const handleSkip = useCallback(() => {
    if (galaxyPhase === 'revealing') {
      triggerSkipReveal()
      setShowSkipHint(false)
    }
  }, [galaxyPhase, triggerSkipReveal])

  // Show skip hint after 2 seconds of reveal
  useEffect(() => {
    if (galaxyPhase === 'revealing') {
      skipHintTimerRef.current = setTimeout(() => {
        setShowSkipHint(true)
      }, SKIP_HINT_DELAY)

      return () => {
        if (skipHintTimerRef.current) {
          clearTimeout(skipHintTimerRef.current)
        }
      }
    } else {
      setShowSkipHint(false)
    }
    return undefined
  }, [galaxyPhase])

  // Keyboard/touch listener for skip
  useEffect(() => {
    if (!showSkipHint) return undefined

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ignore modifier keys and specific navigation keys
      if (event.metaKey || event.ctrlKey || event.altKey) return
      handleSkip()
    }

    const handleTouchStart = (): void => {
      handleSkip()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [showSkipHint, handleSkip])

  // Handle state transitions based on auth/music state
  useEffect(() => {
    // Detect successful auth (transition from false to true)
    if (isAuthenticated && !previousAuthRef.current) {
      setState('success')
      // Brief success celebration before loading
      const timer = setTimeout(() => {
        setState('loading')
        setLoadingMessageIndex(0)
      }, 1000)
      previousAuthRef.current = isAuthenticated
      return () => clearTimeout(timer)
    }
    previousAuthRef.current = isAuthenticated

    // Already authenticated with data
    if (isAuthenticated && galaxyData) {
      setState('hidden')
    }
    // Authenticated, loading music data
    else if (isAuthenticated && musicLoading) {
      setState('loading')
    }
    // Not authenticated
    else if (!isAuthenticated && !authLoading) {
      setState('welcome')
      setIsConnecting(false)
    }
    return undefined
  }, [isAuthenticated, musicLoading, galaxyData, authLoading])

  // Cycle through loading messages
  useEffect(() => {
    if (state !== 'loading') return undefined

    const currentMessage = LOADING_MESSAGES[loadingMessageIndex]
    if (!currentMessage) return undefined

    messageTimerRef.current = setTimeout(() => {
      if (loadingMessageIndex < LOADING_MESSAGES.length - 1) {
        setLoadingMessageIndex(prev => prev + 1)
      }
    }, currentMessage.duration)

    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
      }
    }
  }, [state, loadingMessageIndex])

  // Handle galaxy data ready
  useEffect(() => {
    if (galaxyData && state === 'loading') {
      // Brief delay before hiding to let the reveal animation start
      const timer = setTimeout(() => {
        setState('hidden')
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [galaxyData, state])

  const handleConnect = () => {
    setIsConnecting(true)
    setState('connecting')

    // Store camera state before redirect (for future use)
    sessionStorage.setItem('auranova-pre-auth-state', JSON.stringify({
      timestamp: Date.now(),
    }))

    // Brief animation before redirect
    setTimeout(() => {
      onStartLogin()
    }, 600)
  }

  // Hidden state - only render skip hint during revealing phase
  if (state === 'hidden' && galaxyPhase !== 'revealing') {
    return null
  }

  // During reveal, show minimal overlay with just skip hint
  const isRevealPhase = state === 'hidden' && galaxyPhase === 'revealing'

  return (
    <div
      className={`
        absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-500
        ${isRevealPhase ? 'pointer-events-none' : ''}
      `}
      style={{
        background: isRevealPhase
          ? 'transparent'
          : state === 'welcome'
            ? 'linear-gradient(to bottom, rgba(88, 28, 135, 0.2), rgba(0, 0, 0, 0.8))'
            : 'rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Skip hint during reveal phase */}
      {showSkipHint && isRevealPhase && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
          onClick={handleSkip}
        >
          <div className="px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-xl cursor-pointer hover:bg-black/70 transition-colors">
            <p className="text-white/80 text-sm font-medium">
              Press any key to explore
            </p>
          </div>
        </div>
      )}
      {/* Welcome State */}
      {state === 'welcome' && (
        <div className="text-center animate-in fade-in duration-500">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Explore Your Musical Universe
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8 px-4">
            Connect your Spotify account to transform your listening history into
            a navigable galaxy of artists, genres, and musical connections.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`
              px-6 py-3
              bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105
              disabled:bg-[#1DB954]/50 disabled:scale-100
              text-white font-semibold
              rounded-full
              transition-all duration-300
              flex items-center gap-2 mx-auto
              shadow-lg shadow-[#1DB954]/20
            `}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Connect with Spotify
          </button>
        </div>
      )}

      {/* Connecting State (Pre-redirect) */}
      {state === 'connecting' && (
        <div className="text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-[#1DB954]/30 animate-ping" />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#1DB954] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
          </div>
          <p className="text-white text-lg font-medium">Taking you to Spotify...</p>
          <p className="text-gray-500 text-sm mt-2">You'll return here after connecting</p>
        </div>
      )}

      {/* Success State (Post-redirect celebration) */}
      {state === 'success' && (
        <div className="text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            {/* Success checkmark with animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#1DB954] flex items-center justify-center animate-in zoom-in duration-300">
                <svg className="w-10 h-10 text-white animate-in fade-in delay-150 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-white text-xl font-semibold">Connected!</p>
          <p className="text-[#1DB954] text-sm mt-2">Preparing your universe...</p>
        </div>
      )}

      {/* Loading State (Fetching music data) */}
      {state === 'loading' && (
        <div className="text-center">
          {/* Animated loader */}
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          </div>

          {/* Progressive loading message */}
          <div className="h-12 flex flex-col items-center justify-center">
            <p
              key={loadingMessageIndex}
              className="text-white font-medium animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {LOADING_MESSAGES[loadingMessageIndex]?.text || 'Almost ready...'}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {LOADING_MESSAGES.map((_, index) => (
              <div
                key={index}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index <= loadingMessageIndex ? 'bg-purple-500' : 'bg-white/20'}
                  ${index === loadingMessageIndex ? 'scale-125' : 'scale-100'}
                `}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auth Error State */}
      {authError && (
        <div className="text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 font-medium mb-2">Connection failed</p>
          <p className="text-gray-500 text-sm mb-4 max-w-xs">{authError}</p>
          <button
            onClick={handleConnect}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
