// Domain types for the galaxy visualization

// Evolution status for artists across time ranges
export type EvolutionStatus = 'stable' | 'new' | 'fading' | 'rising' | 'falling'

export interface GalaxyArtist {
  id: string
  name: string
  genres: string[]
  popularity: number
  imageUrl: string | null
  spotifyUrl: string
  followers: number
  // Position in 3D space (calculated by simulation)
  position: [number, number, number]
  // Visual properties
  size: number // Based on popularity/listen count
  color: string // Based on primary genre
  brightness: number // Based on energy/valence
  // Evolution tracking (for time range transitions)
  evolutionStatus?: EvolutionStatus
  rankChange?: number // Positive = moved up, negative = moved down
}

export interface GalaxyGenre {
  id: string
  name: string
  color: string
  // Centroid position for the genre cluster
  position: [number, number, number]
  artistCount: number
  avgEnergy: number
  avgValence: number
}

export interface ArtistConnection {
  source: string // Artist ID
  target: string // Artist ID
  strength: number // 0-1, based on shared genres or related artists
}

export interface AudioProfile {
  energy: number
  valence: number
  danceability: number
  acousticness: number
  tempo: number
}

export interface GalaxyData {
  artists: GalaxyArtist[]
  genres: GalaxyGenre[]
  connections: ArtistConnection[]
  audioProfile: AudioProfile // Overall profile
}

// UI State types
export interface CameraTarget {
  position: [number, number, number]
  lookAt: [number, number, number]
}

export interface Selection {
  artistId: string | null
  genreId: string | null
}

// Time range for Spotify data
export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: 'Last 4 weeks',
  medium_term: 'Last 6 months',
  long_term: 'All time',
}
