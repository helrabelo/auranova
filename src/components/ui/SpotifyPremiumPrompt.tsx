interface SpotifyPremiumPromptProps {
  onDismiss: () => void
  onUsePreviews: () => void
}

/**
 * Modal prompt shown when SDK fails due to non-Premium account
 * Offers options to use previews or upgrade to Premium
 */
export function SpotifyPremiumPrompt({
  onDismiss,
  onUsePreviews,
}: SpotifyPremiumPromptProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4 border border-white/10 shadow-2xl">
        {/* Spotify Logo */}
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-6 h-6 text-[#1DB954]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span className="text-white font-semibold">Spotify Premium Required</span>
        </div>

        {/* Message */}
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
          Full track playback requires a Spotify Premium subscription. You can
          still explore your musical universe using 30-second previews, or
          upgrade to Premium for the complete experience.
        </p>

        {/* Features comparison */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-500 mb-2">Preview Mode</div>
            <ul className="space-y-1 text-gray-400">
              <li className="flex items-center gap-1">
                <span className="text-green-500">+</span> 30s track previews
              </li>
              <li className="flex items-center gap-1">
                <span className="text-green-500">+</span> Full visualization
              </li>
              <li className="flex items-center gap-1">
                <span className="text-yellow-500">~</span> Limited playback
              </li>
            </ul>
          </div>
          <div className="bg-[#1DB954]/10 rounded-lg p-3 border border-[#1DB954]/20">
            <div className="text-[#1DB954] mb-2">Premium</div>
            <ul className="space-y-1 text-gray-300">
              <li className="flex items-center gap-1">
                <span className="text-green-500">+</span> Full tracks
              </li>
              <li className="flex items-center gap-1">
                <span className="text-green-500">+</span> Full visualization
              </li>
              <li className="flex items-center gap-1">
                <span className="text-green-500">+</span> Seamless playback
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onUsePreviews}
            className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Use Previews
          </button>
          <a
            href="https://www.spotify.com/premium/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg text-center transition-colors text-sm font-medium"
            onClick={onDismiss}
          >
            Get Premium
          </a>
        </div>
      </div>
    </div>
  )
}
