// Spotify API response types

export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  popularity: number
  images: SpotifyImage[]
  followers: {
    total: number
  }
  external_urls: {
    spotify: string
  }
  uri: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  images: SpotifyImage[]
  release_date: string
  album_type: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  popularity: number
  preview_url: string | null
  external_urls: {
    spotify: string
  }
  uri: string
}

export interface SpotifyAudioFeatures {
  id: string
  danceability: number
  energy: number
  key: number
  loudness: number
  mode: number
  speechiness: number
  acousticness: number
  instrumentalness: number
  liveness: number
  valence: number
  tempo: number
  duration_ms: number
  time_signature: number
}

export interface SpotifyPagingObject<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  href: string
  next: string | null
  previous: string | null
}

export interface SpotifyTopArtistsResponse {
  items: SpotifyArtist[]
  total: number
  limit: number
  offset: number
  href: string
  next: string | null
  previous: string | null
}

export interface SpotifyTopTracksResponse {
  items: SpotifyTrack[]
  total: number
  limit: number
  offset: number
  href: string
  next: string | null
  previous: string | null
}

export interface SpotifyAudioFeaturesResponse {
  audio_features: (SpotifyAudioFeatures | null)[]
}

export interface SpotifyRelatedArtistsResponse {
  artists: SpotifyArtist[]
}

export interface SpotifyArtistTopTracksResponse {
  tracks: SpotifyTrack[]
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface SpotifyError {
  error: {
    status: number
    message: string
  }
}

// Playback types for Web Playback SDK integration

export interface SpotifyDevice {
  id: string | null
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number | null
  supports_volume: boolean
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice
  repeat_state: 'off' | 'track' | 'context'
  shuffle_state: boolean
  context: {
    type: string
    href: string
    external_urls: { spotify: string }
    uri: string
  } | null
  timestamp: number
  progress_ms: number | null
  is_playing: boolean
  item: SpotifyTrack | null
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown'
  actions: {
    disallows: {
      resuming?: boolean
      pausing?: boolean
      seeking?: boolean
      skipping_prev?: boolean
      skipping_next?: boolean
    }
  }
}

export interface SpotifyDevicesResponse {
  devices: SpotifyDevice[]
}

export interface PlaybackError {
  type: 'initialization' | 'authentication' | 'account' | 'playback'
  message: string
}

// User profile
export interface SpotifyUserProfile {
  id: string
  display_name: string | null
  email?: string
  images: SpotifyImage[]
  followers: {
    total: number
  }
  country?: string
  product?: 'free' | 'premium' | 'open'
  external_urls: {
    spotify: string
  }
  uri: string
}
