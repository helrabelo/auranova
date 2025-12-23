import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FeatureFlagsState {
  // Debug mode - shows FPS counter, SDK status indicator
  debugMode: boolean
  // Nebula toggle - show/hide nebula effects for performance
  nebulasEnabled: boolean
  // Settings panel visibility
  showSettings: boolean
  // Artist labels - show persistent labels for top artists
  showLabels: boolean

  // Actions
  setDebugMode: (enabled: boolean) => void
  toggleDebugMode: () => void
  setNebulasEnabled: (enabled: boolean) => void
  toggleNebulas: () => void
  setShowSettings: (show: boolean) => void
  toggleSettings: () => void
  setShowLabels: (show: boolean) => void
  toggleLabels: () => void
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      // Initial state - debug off in production, nebulas disabled for performance, labels on
      debugMode: false,
      nebulasEnabled: false,
      showSettings: false,
      showLabels: true,

      // Actions
      setDebugMode: (enabled) => set({ debugMode: enabled }),
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      setNebulasEnabled: (enabled) => set({ nebulasEnabled: enabled }),
      toggleNebulas: () =>
        set((state) => ({ nebulasEnabled: !state.nebulasEnabled })),
      setShowSettings: (show) => set({ showSettings: show }),
      toggleSettings: () =>
        set((state) => ({ showSettings: !state.showSettings })),
      setShowLabels: (show) => set({ showLabels: show }),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
    }),
    {
      name: 'auranova-feature-flags',
      partialize: (state) => ({
        // Only persist these values, not UI state like showSettings
        debugMode: state.debugMode,
        nebulasEnabled: state.nebulasEnabled,
        showLabels: state.showLabels,
      }),
    }
  )
)
