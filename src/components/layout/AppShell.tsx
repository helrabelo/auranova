import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { AudioIndicator } from '@/components/ui/AudioIndicator'

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
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-none z-10">
        <div className="pointer-events-auto">
          <h1 className="text-2xl font-bold text-white tracking-wider">
            <span className="text-purple-400">Aura</span>nova
          </h1>
          <p className="text-xs text-gray-400">Your Musical Universe</p>
        </div>

        {isAuthenticated && (
          <button
            onClick={logout}
            className="pointer-events-auto px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Logout
          </button>
        )}
      </header>

      {/* Global audio indicator */}
      {isAuthenticated && <AudioIndicator />}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none">
        <p>Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  )
}
