import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useSpotifyPlayer } from '@/audio/useSpotifyPlayer'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import { AppShell } from '@/components/layout/AppShell'
import { Scene } from '@/components/canvas/Scene'
import { ArtistPanel } from '@/components/ui/ArtistPanel'
import { NowPlayingBar } from '@/components/ui/NowPlayingBar'
import { GenreLegend } from '@/components/ui/GenreLegend'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { OnboardingOverlay } from '@/components/ui/OnboardingOverlay'
import { DataLoader } from '@/components/DataLoader'
import { TouchHints } from '@/components/canvas/TouchControls'
import './App.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function GalaxyView(): React.JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 60 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: '#000' }}
    >
      <color attach="background" args={['#030014']} />
      <fog attach="fog" args={['#030014', 50, 200]} />
      <Scene />
    </Canvas>
  )
}


function AuthHandler(): React.JSX.Element | null {
  const { handleAuthCallback, checkAuth } = useAuthStore()
  const callbackHandledRef = useRef(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const authError = urlParams.get('error')

    // Clear URL immediately to prevent re-reads
    if (code || authError) {
      window.history.replaceState({}, document.title, '/')
    }

    if (authError) {
      console.error('Spotify auth error:', authError)
      return
    }

    if (code) {
      // Prevent double execution (React 18 Strict Mode)
      if (callbackHandledRef.current) {
        console.log('AuthHandler: callback already handled, skipping')
        return
      }
      callbackHandledRef.current = true

      handleAuthCallback(code).then((success) => {
        console.log('AuthHandler: callback result:', success)
        if (!success) {
          callbackHandledRef.current = false // Reset on failure
        }
      })
    } else {
      checkAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  return null
}


/**
 * Initializes Spotify Web Playback SDK when user is authenticated.
 * Shows SDK status for debugging (only visible in debug mode).
 */
function SpotifyPlayerProvider(): React.JSX.Element | null {
  const { isReady, isLoading, error } = useSpotifyPlayer()
  const mode = usePlaybackStore((state) => state.mode)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const debugMode = useFeatureFlagsStore((state) => state.debugMode)

  // Only show status when authenticated and in debug mode
  if (!isAuthenticated || !debugMode) return null

  // Show SDK status indicator (top left, only in debug mode)
  return (
    <div className="fixed top-16 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-xs">
      {isLoading ? (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-400">Connecting player...</span>
        </>
      ) : error ? (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400">
            {error.type === 'account' ? 'Premium required for full playback' : error.message}
          </span>
        </>
      ) : isReady ? (
        <>
          <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
          <span className="text-[#1DB954]">
            {mode === 'sdk' ? 'Full playback ready' : 'Player ready'}
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-gray-400">Preview mode</span>
        </>
      )}
    </div>
  )
}

function AppContent(): React.JSX.Element {
  const { isAuthenticated, login } = useAuthStore()

  return (
    <AppShell>
      {/* Data loader - handles fetching and transforming Spotify data */}
      <DataLoader />

      {/* Spotify SDK player initialization and debug indicator */}
      <SpotifyPlayerProvider />

      {/* Galaxy always renders in background */}
      <GalaxyView />

      {/* Auth handler - processes OAuth callback */}
      <AuthHandler />

      {/* Unified onboarding overlay - handles welcome, connecting, success, and loading states */}
      <OnboardingOverlay onStartLogin={login} />

      {/* Settings panel with feature flags */}
      {isAuthenticated && <SettingsPanel />}

      {/* Genre legend overlay */}
      {isAuthenticated && <GenreLegend />}

      {/* Mobile touch hints */}
      {isAuthenticated && <TouchHints />}

      {/* Selected artist panel */}
      {isAuthenticated && <ArtistPanel />}

      {/* Persistent now playing bar */}
      {isAuthenticated && <NowPlayingBar />}
    </AppShell>
  )
}

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
