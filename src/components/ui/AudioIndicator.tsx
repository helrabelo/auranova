import { useState, useEffect } from 'react'
import { audioManager } from '@/audio'
import { useUIStore } from '@/stores/uiStore'

/**
 * Global audio indicator - shows what's playing with quick controls
 * Appears at bottom of screen when audio is playing
 */
export function AudioIndicator(): React.JSX.Element | null {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const previewVolume = useUIStore((state) => state.previewVolume)
  const setPreviewVolume = useUIStore((state) => state.setPreviewVolume)

  // Subscribe to audio events
  useEffect(() => {
    const unsubPlay = audioManager.on('play', () => {
      setIsPlaying(true)
    })
    const unsubPause = audioManager.on('pause', () => {
      setIsPlaying(false)
    })
    const unsubEnded = audioManager.on('ended', () => {
      setIsPlaying(false)
    })
    const unsubTimeUpdate = audioManager.on('timeupdate', (data: unknown) => {
      const timeData = data as { currentTime: number; duration: number }
      setCurrentTime(timeData.currentTime)
      setDuration(timeData.duration)
    })

    return () => {
      unsubPlay()
      unsubPause()
      unsubEnded()
      unsubTimeUpdate()
    }
  }, [])

  // Update volume when store changes
  useEffect(() => {
    audioManager.setVolume(previewVolume)
  }, [previewVolume])

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await audioManager.pause()
    }
    // Note: Can't resume without track info, so just pause is available here
  }

  const handleToggleMute = () => {
    setPreviewVolume(previewVolume > 0 ? 0 : 0.5)
  }

  // Don't show if nothing is playing
  if (!isPlaying) {
    return null
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-lg rounded-full border border-white/10 shadow-lg">
        {/* Audio visualizer bars */}
        <div className="flex items-end gap-0.5 h-4">
          <div
            className="w-1 bg-[#1DB954] rounded-full animate-pulse"
            style={{ height: '100%', animationDelay: '0ms' }}
          />
          <div
            className="w-1 bg-[#1DB954] rounded-full animate-pulse"
            style={{ height: '60%', animationDelay: '150ms' }}
          />
          <div
            className="w-1 bg-[#1DB954] rounded-full animate-pulse"
            style={{ height: '80%', animationDelay: '300ms' }}
          />
          <div
            className="w-1 bg-[#1DB954] rounded-full animate-pulse"
            style={{ height: '40%', animationDelay: '450ms' }}
          />
        </div>

        {/* Progress bar */}
        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1DB954] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pause button */}
        <button
          onClick={handleTogglePlay}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Pause"
        >
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>

        {/* Mute button */}
        <button
          onClick={handleToggleMute}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label={previewVolume > 0 ? 'Mute' : 'Unmute'}
        >
          {previewVolume === 0 ? (
            <svg
              className="w-4 h-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
