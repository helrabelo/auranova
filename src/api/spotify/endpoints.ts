import { spotifyFetch } from './client'
import type {
  SpotifyTopArtistsResponse,
  SpotifyTopTracksResponse,
  SpotifyAudioFeaturesResponse,
  SpotifyRelatedArtistsResponse,
  SpotifyArtistTopTracksResponse,
  SpotifyUserProfile,
  TimeRange,
} from './types'

// Default parameters
const DEFAULT_LIMIT = 50
const DEFAULT_TIME_RANGE: TimeRange = 'medium_term'

// Get user's top artists
export async function getTopArtists(
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0
): Promise<SpotifyTopArtistsResponse> {
  const params = new URLSearchParams({
    time_range: timeRange,
    limit: limit.toString(),
    offset: offset.toString(),
  })

  return spotifyFetch<SpotifyTopArtistsResponse>(`/me/top/artists?${params}`)
}

// Get user's top tracks
export async function getTopTracks(
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0
): Promise<SpotifyTopTracksResponse> {
  const params = new URLSearchParams({
    time_range: timeRange,
    limit: limit.toString(),
    offset: offset.toString(),
  })

  return spotifyFetch<SpotifyTopTracksResponse>(`/me/top/tracks?${params}`)
}

// Get audio features for multiple tracks
export async function getAudioFeatures(
  trackIds: string[]
): Promise<SpotifyAudioFeaturesResponse> {
  if (trackIds.length === 0) {
    return { audio_features: [] }
  }

  // Spotify API allows max 100 tracks per request
  const ids = trackIds.slice(0, 100).join(',')
  return spotifyFetch<SpotifyAudioFeaturesResponse>(
    `/audio-features?ids=${ids}`
  )
}

// Get related artists for a given artist
export async function getRelatedArtists(
  artistId: string
): Promise<SpotifyRelatedArtistsResponse> {
  return spotifyFetch<SpotifyRelatedArtistsResponse>(
    `/artists/${artistId}/related-artists`
  )
}

// Fetch all top artists (handles pagination)
export async function getAllTopArtists(
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  maxArtists: number = 100
): Promise<SpotifyTopArtistsResponse['items']> {
  const artists: SpotifyTopArtistsResponse['items'] = []
  let offset = 0
  const limit = 50

  while (artists.length < maxArtists) {
    const response = await getTopArtists(timeRange, limit, offset)
    artists.push(...response.items)

    if (!response.next || artists.length >= maxArtists) {
      break
    }

    offset += limit
  }

  return artists.slice(0, maxArtists)
}

// Fetch all top tracks (handles pagination)
export async function getAllTopTracks(
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  maxTracks: number = 100
): Promise<SpotifyTopTracksResponse['items']> {
  const tracks: SpotifyTopTracksResponse['items'] = []
  let offset = 0
  const limit = 50

  while (tracks.length < maxTracks) {
    const response = await getTopTracks(timeRange, limit, offset)
    tracks.push(...response.items)

    if (!response.next || tracks.length >= maxTracks) {
      break
    }

    offset += limit
  }

  return tracks.slice(0, maxTracks)
}

// Get artist's top tracks (for preview playback)
export async function getArtistTopTracks(
  artistId: string,
  market: string = 'US'
): Promise<SpotifyArtistTopTracksResponse> {
  return spotifyFetch<SpotifyArtistTopTracksResponse>(
    `/artists/${artistId}/top-tracks?market=${market}`
  )
}

// Get current user's profile
export async function getUserProfile(): Promise<SpotifyUserProfile> {
  return spotifyFetch<SpotifyUserProfile>('/me')
}
