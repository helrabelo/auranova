import { getAccessToken } from '@/api/spotify/auth'

type PlayerEvent =
  | 'ready'
  | 'not_ready'
  | 'state_changed'
  | 'error'
  | 'autoplay_failed'
type PlayerEventListener = (data?: unknown) => void

export interface SpotifyPlayerState {
  isConnected: boolean
  isPlaying: boolean
  deviceId: string | null
  currentTrack: Spotify.Track | null
  position: number
  duration: number
  volume: number
}

const INITIAL_STATE: SpotifyPlayerState = {
  isConnected: false,
  isPlaying: false,
  deviceId: null,
  currentTrack: null,
  position: 0,
  duration: 0,
  volume: 0.5,
}

/**
 * Singleton wrapper for Spotify Web Playback SDK Player
 * Handles player lifecycle, events, and playback control
 */
class SpotifyPlayerManager {
  private player: Spotify.Player | null = null
  private deviceId: string | null = null
  private state: SpotifyPlayerState = { ...INITIAL_STATE }
  private listeners = new Map<PlayerEvent, Set<PlayerEventListener>>()
  private stateUpdateInterval: number | null = null
  private isInitializing = false

  constructor() {
    const events: PlayerEvent[] = [
      'ready',
      'not_ready',
      'state_changed',
      'error',
      'autoplay_failed',
    ]
    events.forEach((event) => this.listeners.set(event, new Set()))
  }

  /**
   * Initialize the Spotify Player
   * Returns true if player connected successfully
   */
  async initialize(): Promise<boolean> {
    if (this.player) {
      console.log('[SpotifyPlayer] Already initialized')
      return this.state.isConnected
    }

    if (this.isInitializing) {
      console.log('[SpotifyPlayer] Already initializing')
      return false
    }

    if (!window.Spotify) {
      console.error('[SpotifyPlayer] SDK not loaded')
      return false
    }

    this.isInitializing = true

    const SpotifySDK = window.Spotify

    return new Promise((resolve) => {
      this.player = new SpotifySDK.Player({
        name: 'AuraNova Player',
        getOAuthToken: async (callback) => {
          const token = await getAccessToken()
          if (token) {
            callback(token)
          }
        },
        volume: this.state.volume,
      })

      // Error handling
      this.player.addListener('initialization_error', ({ message }) => {
        console.error('[SpotifyPlayer] Init error:', message)
        this.emit('error', { type: 'initialization', message })
        this.isInitializing = false
        resolve(false)
      })

      this.player.addListener('authentication_error', ({ message }) => {
        console.error('[SpotifyPlayer] Auth error:', message)
        this.emit('error', { type: 'authentication', message })
        this.isInitializing = false
        resolve(false)
      })

      this.player.addListener('account_error', ({ message }) => {
        console.error('[SpotifyPlayer] Account error:', message)
        this.emit('error', { type: 'account', message })
        this.isInitializing = false
        resolve(false)
      })

      this.player.addListener('playback_error', ({ message }) => {
        console.error('[SpotifyPlayer] Playback error:', message)
        this.emit('error', { type: 'playback', message })
      })

      // Ready
      this.player.addListener('ready', ({ device_id }) => {
        console.log('[SpotifyPlayer] Ready with device ID:', device_id)
        this.deviceId = device_id
        this.state.deviceId = device_id
        this.state.isConnected = true
        this.startStateUpdates()
        this.emit('ready', { device_id })
        this.isInitializing = false
        resolve(true)
      })

      // Not ready
      this.player.addListener('not_ready', ({ device_id }) => {
        console.log('[SpotifyPlayer] Not ready, device ID:', device_id)
        this.state.isConnected = false
        this.emit('not_ready', { device_id })
      })

      // State changes
      this.player.addListener('player_state_changed', (playbackState) => {
        if (!playbackState) return

        this.state = {
          ...this.state,
          isPlaying: !playbackState.paused,
          currentTrack: playbackState.track_window.current_track,
          position: playbackState.position,
          duration: playbackState.track_window.current_track?.duration_ms ?? 0,
        }

        this.emit('state_changed', this.state)
      })

      // Autoplay failed (browser policy)
      this.player.addListener('autoplay_failed', () => {
        console.log('[SpotifyPlayer] Autoplay failed - user interaction required')
        this.emit('autoplay_failed')
      })

      // Connect
      this.player.connect().then((success) => {
        if (!success) {
          console.error('[SpotifyPlayer] Failed to connect')
          this.isInitializing = false
          resolve(false)
        }
      })
    })
  }

  /**
   * Start polling for position updates during playback
   */
  private startStateUpdates(): void {
    if (this.stateUpdateInterval) return

    this.stateUpdateInterval = window.setInterval(async () => {
      if (!this.player || !this.state.isPlaying) return

      try {
        const playbackState = await this.player.getCurrentState()
        if (playbackState) {
          this.state.position = playbackState.position
          this.emit('state_changed', this.state)
        }
      } catch {
        // Ignore errors during position polling
      }
    }, 100)
  }

  /**
   * Stop position polling
   */
  private stopStateUpdates(): void {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval)
      this.stateUpdateInterval = null
    }
  }

  /**
   * Play a track by URI
   */
  async play(trackUri: string): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Player not ready')
    }

    const token = await getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to start playback')
    }
  }

  /**
   * Play a list of tracks
   */
  async playTracks(trackUris: string[], offset = 0): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Player not ready')
    }

    const token = await getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackUris,
          offset: { position: offset },
        }),
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to start playback')
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    await this.player?.pause()
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    await this.player?.resume()
  }

  /**
   * Toggle play/pause
   */
  async togglePlay(): Promise<void> {
    await this.player?.togglePlay()
  }

  /**
   * Seek to position in ms
   */
  async seek(positionMs: number): Promise<void> {
    await this.player?.seek(positionMs)
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.state.volume = clampedVolume
    await this.player?.setVolume(clampedVolume)
  }

  /**
   * Skip to previous track
   */
  async previousTrack(): Promise<void> {
    await this.player?.previousTrack()
  }

  /**
   * Skip to next track
   */
  async nextTrack(): Promise<void> {
    await this.player?.nextTrack()
  }

  /**
   * Get current player state
   */
  getState(): SpotifyPlayerState {
    return { ...this.state }
  }

  /**
   * Get the device ID
   */
  getDeviceId(): string | null {
    return this.deviceId
  }

  /**
   * Check if player is connected
   */
  isConnected(): boolean {
    return this.state.isConnected
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying
  }

  /**
   * Get current track ID
   */
  getCurrentTrackId(): string | null {
    return this.state.currentTrack?.id ?? null
  }

  /**
   * Subscribe to player events
   */
  on(event: PlayerEvent, listener: PlayerEventListener): () => void {
    this.listeners.get(event)?.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: PlayerEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(data))
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopStateUpdates()
    this.player?.disconnect()
    this.player = null
    this.deviceId = null
    this.state = { ...INITIAL_STATE }
    this.isInitializing = false
  }

  /**
   * Activate the player element (for browser autoplay policies)
   */
  async activateElement(): Promise<void> {
    await this.player?.activateElement()
  }
}

// Singleton instance
export const spotifyPlayer = new SpotifyPlayerManager()
