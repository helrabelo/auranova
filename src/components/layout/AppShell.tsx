import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { AudioIndicator } from '@/components/ui/AudioIndicator'
import { ArtistSearch } from '@/components/ui/ArtistSearch'
import { TimeRangeToggle } from '@/components/ui/TimeRangeToggle'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const { isAuthenticated, logout } = useAuthStore()

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Main content */}
      {children}

      {/* Header overlay */}
      <header className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-center pointer-events-none z-10">
        <div className="pointer-events-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider">
            <span className="text-purple-400">Aura</span>nova
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400">Your Musical Universe</p>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
            <TimeRangeToggle />
            <button
              onClick={logout}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Global audio indicator */}
      {isAuthenticated && <AudioIndicator />}

      {/* Artist search */}
      {isAuthenticated && <ArtistSearch />}

      {/* Controls hint - hidden on mobile (TouchHints handles mobile) */}
      <div className="hidden sm:block absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none">
        <p>Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  )
}
