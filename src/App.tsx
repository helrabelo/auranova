import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useMusicStore } from '@/stores/musicStore'
import { AppShell } from '@/components/layout/AppShell'
import { Scene } from '@/components/canvas/Scene'
import { LoginButton } from '@/components/ui/LoginButton'
import { ArtistPanel } from '@/components/ui/ArtistPanel'
import { DataLoader } from '@/components/DataLoader'
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

function LoginView(): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-b from-purple-900/20 to-black/80">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">
          Explore Your Musical Universe
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Connect your Spotify account to transform your listening history into
          a navigable galaxy of artists, genres, and musical connections.
        </p>
      </div>
      <LoginButton />
    </div>
  )
}

function AuthHandler(): React.JSX.Element | null {
  const { handleAuthCallback, checkAuth, isLoading, error } = useAuthStore()
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

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <LoginButton />
        </div>
      </div>
    )
  }

  return null
}

function LoadingOverlay(): React.JSX.Element | null {
  const isLoadingMusic = useMusicStore((state) => state.isLoading)
  const musicError = useMusicStore((state) => state.error)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const galaxyData = useMusicStore((state) => state.galaxyData)

  // Only show loading after authentication, before data is ready
  if (!isAuthenticated || galaxyData) return null

  if (musicError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-25 bg-black/80 pointer-events-none">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load music data</p>
          <p className="text-gray-500 text-sm">{musicError}</p>
        </div>
      </div>
    )
  }

  if (isLoadingMusic) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-25 bg-black/80 pointer-events-none">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your musical universe...</p>
          <p className="text-gray-600 text-sm mt-2">
            Fetching top artists from Spotify
          </p>
        </div>
      </div>
    )
  }

  return null
}

function AppContent(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuthStore()

  return (
    <AppShell>
      {/* Data loader - handles fetching and transforming Spotify data */}
      <DataLoader />

      {/* Galaxy always renders in background */}
      <GalaxyView />

      {/* Auth handler overlay */}
      <AuthHandler />

      {/* Loading overlay for music data */}
      <LoadingOverlay />

      {/* Selected artist panel */}
      {isAuthenticated && <ArtistPanel />}

      {/* Login view when not authenticated */}
      {!isAuthenticated && !isLoading && <LoginView />}
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
