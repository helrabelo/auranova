import { spotifyFetch } from './client'
import type { SpotifyPlaybackState, SpotifyDevicesResponse } from './types'

/**
 * Get the current playback state
 */
export async function getPlaybackState(): Promise<SpotifyPlaybackState | null> {
  try {
    return await spotifyFetch<SpotifyPlaybackState>('/me/player')
  } catch {
    return null
  }
}

/**
 * Get available devices
 */
export async function getDevices(): Promise<SpotifyDevicesResponse> {
  return spotifyFetch<SpotifyDevicesResponse>('/me/player/devices')
}

/**
 * Transfer playback to a device
 */
export async function transferPlayback(
  deviceId: string,
  play = false
): Promise<void> {
  await spotifyFetch('/me/player', {
    method: 'PUT',
    body: {
      device_ids: [deviceId],
      play,
    },
  })
}

/**
 * Start playback on a device
 */
export async function startPlayback(
  deviceId: string,
  options: {
    uris?: string[]
    context_uri?: string
    offset?: { position: number } | { uri: string }
    position_ms?: number
  }
): Promise<void> {
  await spotifyFetch(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: options,
  })
}

/**
 * Pause playback
 */
export async function pausePlayback(): Promise<void> {
  await spotifyFetch('/me/player/pause', { method: 'PUT' })
}

/**
 * Resume playback
 */
export async function resumePlayback(): Promise<void> {
  await spotifyFetch('/me/player/play', { method: 'PUT' })
}

/**
 * Seek to position
 */
export async function seekToPosition(positionMs: number): Promise<void> {
  await spotifyFetch(`/me/player/seek?position_ms=${positionMs}`, {
    method: 'PUT',
  })
}

/**
 * Set playback volume
 */
export async function setPlaybackVolume(volumePercent: number): Promise<void> {
  const volume = Math.round(Math.max(0, Math.min(100, volumePercent)))
  await spotifyFetch(`/me/player/volume?volume_percent=${volume}`, {
    method: 'PUT',
  })
}

/**
 * Skip to next track
 */
export async function skipToNext(): Promise<void> {
  await spotifyFetch('/me/player/next', { method: 'POST' })
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(): Promise<void> {
  await spotifyFetch('/me/player/previous', { method: 'POST' })
}

/**
 * Set repeat mode
 */
export async function setRepeatMode(
  state: 'track' | 'context' | 'off'
): Promise<void> {
  await spotifyFetch(`/me/player/repeat?state=${state}`, { method: 'PUT' })
}

/**
 * Toggle shuffle
 */
export async function setShuffle(state: boolean): Promise<void> {
  await spotifyFetch(`/me/player/shuffle?state=${state}`, { method: 'PUT' })
}
