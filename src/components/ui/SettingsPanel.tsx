import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

export function SettingsPanel(): React.JSX.Element | null {
  const showSettings = useFeatureFlagsStore((state) => state.showSettings)
  const toggleSettings = useFeatureFlagsStore((state) => state.toggleSettings)
  const debugMode = useFeatureFlagsStore((state) => state.debugMode)
  const toggleDebugMode = useFeatureFlagsStore((state) => state.toggleDebugMode)
  const nebulasEnabled = useFeatureFlagsStore((state) => state.nebulasEnabled)
  const toggleNebulas = useFeatureFlagsStore((state) => state.toggleNebulas)
  const showLabels = useFeatureFlagsStore((state) => state.showLabels)
  const toggleLabels = useFeatureFlagsStore((state) => state.toggleLabels)

  return (
    <>
      {/* Settings gear button - bottom right */}
      <button
        onClick={toggleSettings}
        className="fixed bottom-20 right-4 z-50 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
        aria-label="Toggle settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-gray-400"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {/* Settings dropdown - opens upward from bottom right */}
      {showSettings && (
        <div className="fixed bottom-32 right-4 z-50 w-64 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-xl">
          <h3 className="text-white font-medium mb-4">Settings</h3>

          <div className="space-y-4">
            {/* Debug Mode Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-gray-300">Debug Mode</span>
                <p className="text-xs text-gray-500">Show FPS & SDK status</p>
              </div>
              <button
                onClick={toggleDebugMode}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  debugMode ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    debugMode ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>

            {/* Nebula Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-gray-300">Nebula Effects</span>
                <p className="text-xs text-gray-500">Toggle for performance</p>
              </div>
              <button
                onClick={toggleNebulas}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  nebulasEnabled ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    nebulasEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>

            {/* Artist Labels Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-gray-300">Artist Labels</span>
                <p className="text-xs text-gray-500">Show names on top stars</p>
              </div>
              <button
                onClick={toggleLabels}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showLabels ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    showLabels ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      )}
    </>
  )
}
