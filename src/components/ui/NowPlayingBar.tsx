import { useCallback, useEffect, useRef } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useUIStore } from '@/stores/uiStore'
import { audioManager } from '@/audio'
import { spotifyPlayer } from '@/audio/SpotifyPlayer'

/**
 * Persistent mini-player bar that shows at the bottom of the screen
 * when a track is playing or paused. Allows control without reopening the artist panel.
 */
export function NowPlayingBar(): React.JSX.Element | null {
  const currentTrack = usePlaybackStore((state) => state.currentTrack)
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentPosition = usePlaybackStore((state) => state.currentPosition)
  const isDismissed = usePlaybackStore((state) => state.isDismissed)
  const setIsPlaying = usePlaybackStore((state) => state.setIsPlaying)
  const setCurrentPosition = usePlaybackStore((state) => state.setCurrentPosition)
  const setCurrentTrack = usePlaybackStore((state) => state.setCurrentTrack)
  const dismissPlayer = usePlaybackStore((state) => state.dismissPlayer)
  const mode = usePlaybackStore((state) => state.mode)
  const sdkReady = usePlaybackStore((state) => state.sdkReady)
  const playerState = usePlaybackStore((state) => state.playerState)

  const previewVolume = useUIStore((state) => state.previewVolume)
  const setPreviewVolume = useUIStore((state) => state.setPreviewVolume)

  const progressRef = useRef<HTMLDivElement>(null)

  // Sync with SDK player state
  useEffect(() => {
    if (mode !== 'sdk' || !sdkReady || !playerState) return

    // Don't sync if user dismissed the player
    if (isDismissed) return

    setIsPlaying(playerState.isPlaying)
    setCurrentPosition(playerState.position / 1000)

    // Update current track from SDK state if different
    const sdkTrack = playerState.currentTrack
    const trackId = sdkTrack?.id
    if (sdkTrack && trackId && trackId !== currentTrack?.id) {
      setCurrentTrack({
        id: trackId,
        name: sdkTrack.name,
        artistName: sdkTrack.artists.map((a) => a.name).join(', '),
        albumName: sdkTrack.album.name,
        albumImageUrl: sdkTrack.album.images[0]?.url ?? null,
        durationMs: sdkTrack.duration_ms,
        uri: sdkTrack.uri,
        previewUrl: null,
      })
    }
  }, [mode, sdkReady, playerState, currentTrack?.id, isDismissed, setIsPlaying, setCurrentPosition, setCurrentTrack])

  // Sync with audio manager (preview mode)
  useEffect(() => {
    if (mode === 'sdk' && sdkReady) return

    const unsubPlay = audioManager.on('play', () => setIsPlaying(true))
    const unsubPause = audioManager.on('pause', () => setIsPlaying(false))
    const unsubEnded = audioManager.on('ended', () => {
      setIsPlaying(false)
      setCurrentPosition(0)
    })
    const unsubTime = audioManager.on('timeupdate', (data: unknown) => {
      const timeData = data as { currentTime: number }
      setCurrentPosition(timeData.currentTime)
    })

    return () => {
      unsubPlay()
      unsubPause()
      unsubEnded()
      unsubTime()
    }
  }, [mode, sdkReady, setIsPlaying, setCurrentPosition])

  const handlePlayPause = useCallback(async () => {
    if (!currentTrack) return

    const effectiveMode = sdkReady && mode === 'sdk' ? 'sdk' : 'preview'

    if (effectiveMode === 'sdk') {
      if (isPlaying) {
        await spotifyPlayer.pause()
      } else {
        await spotifyPlayer.resume()
      }
    } else {
      if (isPlaying) {
        await audioManager.pause()
      } else if (currentTrack.previewUrl) {
        await audioManager.play(currentTrack.previewUrl, currentTrack.id)
      }
    }
  }, [currentTrack, mode, sdkReady, isPlaying])

  const handleSeek = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!currentTrack || !progressRef.current) return

      const rect = progressRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const durationSecs = currentTrack.durationMs / 1000
      const newTime = percentage * durationSecs

      const effectiveMode = sdkReady && mode === 'sdk' ? 'sdk' : 'preview'

      if (effectiveMode === 'sdk') {
        await spotifyPlayer.seek(newTime * 1000)
      } else {
        audioManager.seek(newTime)
      }
    },
    [currentTrack, mode, sdkReady]
  )

  const handleClose = useCallback(() => {
    // Stop playback and dismiss the player
    const effectiveMode = sdkReady && mode === 'sdk' ? 'sdk' : 'preview'

    if (effectiveMode === 'sdk') {
      spotifyPlayer.pause()
    } else {
      audioManager.pause()
    }

    dismissPlayer()
  }, [mode, sdkReady, dismissPlayer])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Don't show if no track
  if (!currentTrack) return null

  const durationSecs = currentTrack.durationMs / 1000
  const progress = durationSecs > 0 ? (currentPosition / durationSecs) * 100 : 0
  const effectiveMode = sdkReady && mode === 'sdk' ? 'sdk' : 'preview'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/95 to-black/90 backdrop-blur-lg border-t border-white/10">
      {/* Progress bar (clickable) */}
      <div
        ref={progressRef}
        className="h-1 bg-white/10 cursor-pointer group"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-[#1DB954] relative transition-all group-hover:bg-[#1ed760]"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-3">
        {/* Album art */}
        {currentTrack.albumImageUrl ? (
          <img
            src={currentTrack.albumImageUrl}
            alt={currentTrack.albumName}
            className="w-12 h-12 rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-medium truncate">{currentTrack.name}</p>
            {effectiveMode === 'sdk' && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-[#1DB954]/20 text-[#1DB954] rounded">
                FULL
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs truncate">{currentTrack.artistName}</p>
        </div>

        {/* Time */}
        <div className="text-gray-500 text-xs shrink-0 hidden sm:block">
          {formatTime(currentPosition)} / {formatTime(effectiveMode === 'preview' ? 30 : durationSecs)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-2 bg-white hover:scale-105 rounded-full transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-black ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Volume (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <button
              onClick={() => setPreviewVolume(previewVolume > 0 ? 0 : 0.5)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label={previewVolume > 0 ? 'Mute' : 'Unmute'}
            >
              {previewVolume === 0 ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
              onChange={(e) => setPreviewVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              aria-label="Volume"
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors ml-1"
            aria-label="Close player"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
