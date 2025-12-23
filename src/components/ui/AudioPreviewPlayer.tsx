import { useState, useEffect, useCallback } from 'react'
import { audioManager } from '@/audio'
import type { SpotifyTrack } from '@/api/spotify/types'
import { useUIStore } from '@/stores/uiStore'

interface AudioPreviewPlayerProps {
  tracks: SpotifyTrack[]
  artistName: string
}

/**
 * Audio preview player component for playing artist track previews
 */
export function AudioPreviewPlayer({
  tracks,
  artistName,
}: AudioPreviewPlayerProps): React.JSX.Element | null {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)

  const previewingTrackId = useUIStore((state) => state.previewingTrackId)
  const setPreviewingTrack = useUIStore((state) => state.setPreviewingTrack)
  const previewVolume = useUIStore((state) => state.previewVolume)
  const setPreviewVolume = useUIStore((state) => state.setPreviewVolume)

  // Filter tracks with preview URLs
  const playableTracks = tracks.filter((track) => track.preview_url !== null)
  const currentTrack = playableTracks[currentTrackIndex]

  // Sync with audio manager state
  useEffect(() => {
    const unsubPlay = audioManager.on('play', () => {
      setIsPlaying(true)
    })
    const unsubPause = audioManager.on('pause', () => {
      setIsPlaying(false)
    })
    const unsubEnded = audioManager.on('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
      // Auto-play next track
      if (currentTrackIndex < playableTracks.length - 1) {
        setCurrentTrackIndex((prev) => prev + 1)
      }
    })
    const unsubTimeUpdate = audioManager.on(
      'timeupdate',
      (data: unknown) => {
        const timeData = data as { currentTime: number; duration: number }
        setCurrentTime(timeData.currentTime)
        setDuration(timeData.duration)
      }
    )

    return () => {
      unsubPlay()
      unsubPause()
      unsubEnded()
      unsubTimeUpdate()
    }
  }, [currentTrackIndex, playableTracks.length])

  // Update volume when store changes
  useEffect(() => {
    audioManager.setVolume(previewVolume)
  }, [previewVolume])

  // Check if current track is playing
  useEffect(() => {
    if (currentTrack && audioManager.getCurrentTrackId() === currentTrack.id) {
      setIsPlaying(audioManager.isPlaying())
    } else {
      setIsPlaying(false)
    }
  }, [currentTrack])

  const handlePlayPause = useCallback(async () => {
    if (!currentTrack?.preview_url) return

    if (isPlaying && audioManager.getCurrentTrackId() === currentTrack.id) {
      await audioManager.pause()
      setPreviewingTrack(null)
    } else {
      await audioManager.play(currentTrack.preview_url, currentTrack.id)
      setPreviewingTrack(currentTrack.id)
    }
  }, [currentTrack, isPlaying, setPreviewingTrack])

  const handlePrevious = useCallback(() => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1)
      setCurrentTime(0)
    }
  }, [currentTrackIndex])

  const handleNext = useCallback(() => {
    if (currentTrackIndex < playableTracks.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1)
      setCurrentTime(0)
    }
  }, [currentTrackIndex, playableTracks.length])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration
      audioManager.seek(newTime)
    },
    [duration]
  )

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value)
      setPreviewVolume(newVolume)
    },
    [setPreviewVolume]
  )

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // No playable tracks
  if (playableTracks.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-gray-400 text-sm">
        No preview available
      </div>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const isCurrentTrackPlaying =
    previewingTrackId === currentTrack?.id && isPlaying

  return (
    <div className="border-t border-white/10 bg-gradient-to-b from-black/0 to-black/30">
      {/* Track info */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          {/* Album art */}
          {currentTrack?.album.images[0] && (
            <img
              src={currentTrack.album.images[0].url}
              alt={currentTrack.album.name}
              className="w-10 h-10 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {currentTrack?.name}
            </p>
            <p className="text-gray-400 text-xs truncate">{artistName}</p>
          </div>
          {/* Track counter */}
          <span className="text-gray-500 text-xs">
            {currentTrackIndex + 1}/{playableTracks.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div
          className="h-1 bg-white/10 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-[#1DB954] rounded-full relative transition-all group-hover:bg-[#1ed760]"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 30)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          {/* Previous */}
          <button
            onClick={handlePrevious}
            disabled={currentTrackIndex === 0}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous track"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-3 bg-white hover:scale-105 rounded-full transition-transform"
            aria-label={isCurrentTrackPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentTrackPlaying ? (
              <svg
                className="w-5 h-5 text-black"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-black ml-0.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={currentTrackIndex >= playableTracks.length - 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next track"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewVolume(previewVolume > 0 ? 0 : 0.5)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label={previewVolume > 0 ? 'Mute' : 'Unmute'}
          >
            {previewVolume === 0 ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : previewVolume < 0.5 ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={previewVolume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  )
}
