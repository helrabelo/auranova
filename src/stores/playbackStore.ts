import { create } from 'zustand'
import { spotifyPlayer, type SpotifyPlayerState } from '@/audio/SpotifyPlayer'
import type { PlaybackError, SpotifyTrack } from '@/api/spotify/types'

export type PlaybackMode = 'sdk' | 'preview' | 'none'

// Simplified track info for the now playing bar
export interface NowPlayingTrack {
  id: string
  name: string
  artistName: string
  albumName: string
  albumImageUrl: string | null
  durationMs: number
  uri: string
  previewUrl: string | null
}

interface PlaybackStore {
  // Mode
  mode: PlaybackMode

  // SDK State
  sdkReady: boolean
  sdkLoading: boolean
  sdkError: PlaybackError | null
  isPremium: boolean

  // Player State (from SDK)
  playerState: SpotifyPlayerState | null

  // Current track (for NowPlayingBar - works in both modes)
  currentTrack: NowPlayingTrack | null
  isPlaying: boolean
  currentPosition: number // in seconds
  isDismissed: boolean // User closed the now playing bar

  // State setters
  setMode: (mode: PlaybackMode) => void
  setSdkReady: (ready: boolean) => void
  setSdkLoading: (loading: boolean) => void
  setSdkError: (error: PlaybackError | null) => void
  setIsPremium: (premium: boolean) => void
  setPlayerState: (state: SpotifyPlayerState) => void

  // Current track setters
  setCurrentTrack: (track: NowPlayingTrack | null) => void
  setCurrentTrackFromSpotify: (track: SpotifyTrack, artistName?: string) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentPosition: (position: number) => void
  setDismissed: (dismissed: boolean) => void
  dismissPlayer: () => void

  // Playback controls (delegate to spotifyPlayer)
  play: (trackUri: string) => Promise<void>
  playTracks: (trackUris: string[], offset?: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  nextTrack: () => Promise<void>
  previousTrack: () => Promise<void>

  // Reset
  reset: () => void
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Initial state
  mode: 'none',
  sdkReady: false,
  sdkLoading: false,
  sdkError: null,
  isPremium: false,
  playerState: null,
  currentTrack: null,
  isPlaying: false,
  currentPosition: 0,
  isDismissed: false,

  // State setters
  setMode: (mode) => set({ mode }),
  setSdkReady: (ready) => set({ sdkReady: ready }),
  setSdkLoading: (loading) => set({ sdkLoading: loading }),
  setSdkError: (error) => set({ sdkError: error }),
  setIsPremium: (premium) => set({ isPremium: premium }),
  setPlayerState: (state) => set({ playerState: state }),

  // Current track setters
  setCurrentTrack: (track) => set({ currentTrack: track, isDismissed: track === null ? get().isDismissed : false }),
  setCurrentTrackFromSpotify: (track, artistName) =>
    set({
      currentTrack: {
        id: track.id,
        name: track.name,
        artistName: artistName ?? track.artists.map((a) => a.name).join(', '),
        albumName: track.album.name,
        albumImageUrl: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms,
        uri: track.uri,
        previewUrl: track.preview_url,
      },
      isDismissed: false,
    }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentPosition: (position) => set({ currentPosition: position }),
  setDismissed: (dismissed) => set({ isDismissed: dismissed }),
  dismissPlayer: () => set({ currentTrack: null, isPlaying: false, currentPosition: 0, isDismissed: true }),

  // Playback controls
  play: async (trackUri) => {
    const { mode } = get()
    if (mode !== 'sdk') {
      throw new Error('SDK mode not active')
    }
    await spotifyPlayer.play(trackUri)
  },

  playTracks: async (trackUris, offset = 0) => {
    const { mode } = get()
    if (mode !== 'sdk') {
      throw new Error('SDK mode not active')
    }
    await spotifyPlayer.playTracks(trackUris, offset)
  },

  pause: async () => {
    await spotifyPlayer.pause()
  },

  resume: async () => {
    await spotifyPlayer.resume()
  },

  togglePlay: async () => {
    await spotifyPlayer.togglePlay()
  },

  seek: async (positionMs) => {
    await spotifyPlayer.seek(positionMs)
  },

  setVolume: async (volume) => {
    await spotifyPlayer.setVolume(volume)
  },

  nextTrack: async () => {
    await spotifyPlayer.nextTrack()
  },

  previousTrack: async () => {
    await spotifyPlayer.previousTrack()
  },

  reset: () =>
    set({
      mode: 'none',
      sdkReady: false,
      sdkLoading: false,
      sdkError: null,
      isPremium: false,
      playerState: null,
      currentTrack: null,
      isPlaying: false,
      currentPosition: 0,
      isDismissed: false,
    }),
}))
