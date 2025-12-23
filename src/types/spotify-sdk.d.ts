/**
 * Type declarations for Spotify Web Playback SDK
 * @see https://developer.spotify.com/documentation/web-playback-sdk
 */

declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>
    disconnect(): void
    addListener(
      event: 'ready',
      callback: (state: { device_id: string }) => void
    ): boolean
    addListener(
      event: 'not_ready',
      callback: (state: { device_id: string }) => void
    ): boolean
    addListener(
      event: 'player_state_changed',
      callback: (state: PlaybackState | null) => void
    ): boolean
    addListener(
      event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
      callback: (error: { message: string }) => void
    ): boolean
    addListener(event: 'autoplay_failed', callback: () => void): boolean
    removeListener(
      event: string,
      callback?: (...args: unknown[]) => void
    ): boolean
    getCurrentState(): Promise<PlaybackState | null>
    setName(name: string): Promise<void>
    getVolume(): Promise<number>
    setVolume(volume: number): Promise<void>
    pause(): Promise<void>
    resume(): Promise<void>
    togglePlay(): Promise<void>
    seek(position_ms: number): Promise<void>
    previousTrack(): Promise<void>
    nextTrack(): Promise<void>
    activateElement(): Promise<void>
  }

  interface PlaybackState {
    context: Context
    disallows: Disallows
    paused: boolean
    position: number
    repeat_mode: number
    shuffle: boolean
    track_window: TrackWindow
  }

  interface TrackWindow {
    current_track: Track
    previous_tracks: Track[]
    next_tracks: Track[]
  }

  interface Track {
    uri: string
    id: string | null
    type: string
    media_type: string
    name: string
    is_playable: boolean
    album: Album
    artists: Artist[]
    duration_ms: number
  }

  interface Album {
    uri: string
    name: string
    images: Image[]
  }

  interface Artist {
    uri: string
    name: string
  }

  interface Image {
    url: string
    height: number
    width: number
  }

  interface Context {
    uri: string | null
    metadata: Record<string, unknown> | null
  }

  interface Disallows {
    pausing?: boolean
    peeking_next?: boolean
    peeking_prev?: boolean
    resuming?: boolean
    seeking?: boolean
    skipping_next?: boolean
    skipping_prev?: boolean
  }

  interface PlayerInit {
    name: string
    getOAuthToken: (callback: (token: string) => void) => void
    volume?: number
  }
}

interface Window {
  Spotify?: {
    Player: new (options: Spotify.PlayerInit) => Spotify.Player
  }
  onSpotifyWebPlaybackSDKReady?: () => void
}
