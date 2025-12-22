import type {
  SpotifyArtist,
  SpotifyTrack,
  SpotifyAudioFeatures,
} from '@/api/spotify/types'
import type {
  GalaxyArtist,
  GalaxyGenre,
  GalaxyData,
  ArtistConnection,
  AudioProfile,
} from '@/types/domain'
import { dominantGenreColor } from '@/utils/colorFromGenre'
import {
  runSimulation,
  nodesToPositions,
  type SimulationNode,
  type SimulationLink,
} from './forceSimulation'
import { getCachedPositions, setCachedPositions } from './positionCache'
import type { TimeRange } from '@/types/domain'

/**
 * Map of artist ID to their aggregated audio features
 */
export interface ArtistAudioFeatures {
  energy: number
  valence: number
  danceability: number
  acousticness: number
  tempo: number
  trackCount: number
}

/**
 * Build a map of artist ID -> aggregated audio features from tracks
 */
export function buildArtistAudioMap(
  tracks: SpotifyTrack[],
  audioFeatures: SpotifyAudioFeatures[]
): Map<string, ArtistAudioFeatures> {
  const artistMap = new Map<string, ArtistAudioFeatures>()

  // Create a map of track ID to audio features for quick lookup
  const featureMap = new Map<string, SpotifyAudioFeatures>()
  audioFeatures.forEach((feature) => {
    featureMap.set(feature.id, feature)
  })

  // Iterate through tracks and aggregate features by artist
  tracks.forEach((track) => {
    const features = featureMap.get(track.id)
    if (!features) return

    // Each track can have multiple artists - attribute to all of them
    track.artists.forEach((artist) => {
      const existing = artistMap.get(artist.id)
      if (existing) {
        existing.energy += features.energy
        existing.valence += features.valence
        existing.danceability += features.danceability
        existing.acousticness += features.acousticness
        existing.tempo += features.tempo
        existing.trackCount += 1
      } else {
        artistMap.set(artist.id, {
          energy: features.energy,
          valence: features.valence,
          danceability: features.danceability,
          acousticness: features.acousticness,
          tempo: features.tempo,
          trackCount: 1,
        })
      }
    })
  })

  // Calculate averages
  artistMap.forEach((features) => {
    if (features.trackCount > 0) {
      features.energy /= features.trackCount
      features.valence /= features.trackCount
      features.danceability /= features.trackCount
      features.acousticness /= features.trackCount
      features.tempo /= features.trackCount
    }
  })

  return artistMap
}

/**
 * Calculate overall audio profile from all audio features
 */
export function calculateAudioProfile(
  audioFeatures: SpotifyAudioFeatures[]
): AudioProfile {
  if (audioFeatures.length === 0) {
    return {
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      tempo: 120,
    }
  }

  const totals = audioFeatures.reduce(
    (acc, f) => ({
      energy: acc.energy + f.energy,
      valence: acc.valence + f.valence,
      danceability: acc.danceability + f.danceability,
      acousticness: acc.acousticness + f.acousticness,
      tempo: acc.tempo + f.tempo,
    }),
    { energy: 0, valence: 0, danceability: 0, acousticness: 0, tempo: 0 }
  )

  const count = audioFeatures.length
  return {
    energy: totals.energy / count,
    valence: totals.valence / count,
    danceability: totals.danceability / count,
    acousticness: totals.acousticness / count,
    tempo: totals.tempo / count,
  }
}

/**
 * Transform Spotify popularity (0-100) to star size (0.5-3.0)
 */
function popularityToSize(popularity: number): number {
  const minSize = 0.5
  const maxSize = 3.0
  return minSize + (popularity / 100) * (maxSize - minSize)
}

/**
 * Transform Spotify popularity to brightness (0.4-1.0)
 */
function popularityToBrightness(popularity: number): number {
  const minBrightness = 0.4
  const maxBrightness = 1.0
  return minBrightness + (popularity / 100) * (maxBrightness - minBrightness)
}

/**
 * Create simulation nodes from Spotify artists
 */
function createSimulationNodes(artists: SpotifyArtist[]): SimulationNode[] {
  return artists.map((artist) => ({
    id: artist.id,
    genres: artist.genres,
    popularity: artist.popularity,
    cluster: 0, // Will be assigned by simulation
  }))
}

/**
 * Create simulation links from artist connections
 */
function createSimulationLinks(artists: SpotifyArtist[]): {
  links: SimulationLink[]
  connections: ArtistConnection[]
} {
  const connections: ArtistConnection[] = []
  const links: SimulationLink[] = []

  for (let i = 0; i < artists.length; i++) {
    for (let j = i + 1; j < artists.length; j++) {
      const artist1 = artists[i]
      const artist2 = artists[j]

      // Count shared genres
      const sharedGenres = artist1.genres.filter((g) =>
        artist2.genres.includes(g)
      )

      if (sharedGenres.length > 0) {
        // Calculate connection strength based on shared genres ratio
        const totalGenres = new Set([...artist1.genres, ...artist2.genres]).size
        const strength = sharedGenres.length / totalGenres

        // Only include meaningful connections (>15% overlap for more connections)
        if (strength > 0.15) {
          connections.push({
            source: artist1.id,
            target: artist2.id,
            strength,
          })

          links.push({
            source: artist1.id,
            target: artist2.id,
            strength,
          })
        }
      }
    }
  }

  return { links, connections }
}

/**
 * Get the best image URL from Spotify images array
 */
function getBestImageUrl(images: SpotifyArtist['images']): string | null {
  if (images.length === 0) return null
  // Prefer medium-sized images (around 300px)
  const sorted = [...images].sort((a, b) => {
    const aSize = a.width ?? 0
    const bSize = b.width ?? 0
    return Math.abs(aSize - 300) - Math.abs(bSize - 300)
  })
  return sorted[0]?.url ?? null
}

/**
 * Transform a single SpotifyArtist to GalaxyArtist
 */
export function transformArtist(
  artist: SpotifyArtist,
  position: [number, number, number] = [0, 0, 0]
): GalaxyArtist {
  return {
    id: artist.id,
    name: artist.name,
    genres: artist.genres,
    popularity: artist.popularity,
    imageUrl: getBestImageUrl(artist.images),
    spotifyUrl: artist.external_urls.spotify,
    followers: artist.followers.total,
    position,
    size: popularityToSize(artist.popularity),
    color: dominantGenreColor(artist.genres),
    brightness: popularityToBrightness(artist.popularity),
  }
}

/**
 * Transform SpotifyArtist[] to GalaxyArtist[] with simulated positions
 */
export function transformArtists(
  artists: SpotifyArtist[],
  positionMap: Map<string, [number, number, number]>
): GalaxyArtist[] {
  return artists.map((artist) => {
    const position = positionMap.get(artist.id) ?? [0, 0, 0]
    return transformArtist(artist, position)
  })
}

/**
 * Extract and aggregate genres from artists
 */
export function extractGenres(
  artists: GalaxyArtist[],
  artistAudioMap?: Map<string, ArtistAudioFeatures>
): GalaxyGenre[] {
  const genreMap = new Map<string, { artists: GalaxyArtist[]; color: string }>()

  // Group artists by genre
  artists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      const existing = genreMap.get(genre)
      if (existing) {
        existing.artists.push(artist)
      } else {
        genreMap.set(genre, {
          artists: [artist],
          color: dominantGenreColor([genre]),
        })
      }
    })
  })

  // Transform to GalaxyGenre array
  return Array.from(genreMap.entries()).map(([name, data]) => {
    // Calculate centroid position
    const positions = data.artists.map((a) => a.position)
    const centroid: [number, number, number] = [
      positions.reduce((sum, p) => sum + p[0], 0) / positions.length,
      positions.reduce((sum, p) => sum + p[1], 0) / positions.length,
      positions.reduce((sum, p) => sum + p[2], 0) / positions.length,
    ]

    // Calculate average energy and valence from artist audio features
    let avgEnergy = 0.5
    let avgValence = 0.5

    if (artistAudioMap && artistAudioMap.size > 0) {
      const artistsWithAudio = data.artists
        .map((a) => artistAudioMap.get(a.id))
        .filter((f): f is ArtistAudioFeatures => f !== undefined)

      if (artistsWithAudio.length > 0) {
        avgEnergy =
          artistsWithAudio.reduce((sum, f) => sum + f.energy, 0) /
          artistsWithAudio.length
        avgValence =
          artistsWithAudio.reduce((sum, f) => sum + f.valence, 0) /
          artistsWithAudio.length
      }
    }

    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      color: data.color,
      position: centroid,
      artistCount: data.artists.length,
      avgEnergy,
      avgValence,
    }
  })
}

/**
 * Options for transformToGalaxyData
 */
export interface TransformOptions {
  tracks?: SpotifyTrack[]
  audioFeatures?: SpotifyAudioFeatures[]
  /** Current time range for caching */
  timeRange?: TimeRange
  /** Radius of the galaxy (default: 35) */
  galaxyRadius?: number
  /** Number of simulation iterations (default: 300) */
  simulationIterations?: number
  /** Whether to use cached positions if available (default: true) */
  useCache?: boolean
}

/**
 * Full transformation pipeline: SpotifyArtist[] -> GalaxyData
 * Uses D3 force simulation for artist positioning with caching
 */
export function transformToGalaxyData(
  spotifyArtists: SpotifyArtist[],
  options: TransformOptions = {}
): GalaxyData {
  const {
    tracks = [],
    audioFeatures = [],
    timeRange = 'medium_term',
    galaxyRadius = 35,
    simulationIterations = 300,
    useCache = true,
  } = options

  // Build artist -> audio features map from tracks
  const artistAudioMap =
    tracks.length > 0 && audioFeatures.length > 0
      ? buildArtistAudioMap(tracks, audioFeatures)
      : undefined

  // Get artist IDs for cache lookup
  const artistIds = spotifyArtists.map((a) => a.id)

  // Try to get cached positions
  let positionMap: Map<string, [number, number, number]> | null = null

  if (useCache) {
    positionMap = getCachedPositions(timeRange, artistIds)
  }

  // Run simulation if no cache hit
  if (!positionMap) {
    // Create simulation nodes and links
    const nodes = createSimulationNodes(spotifyArtists)
    const { links } = createSimulationLinks(spotifyArtists)

    // Run the D3 force simulation
    const simulatedNodes = runSimulation(nodes, links, {
      radius: galaxyRadius,
      iterations: simulationIterations,
      use3D: true,
    })

    // Convert simulation results to position map
    positionMap = nodesToPositions(simulatedNodes)

    // Cache the positions
    if (useCache) {
      setCachedPositions(timeRange, artistIds, positionMap)
    }
  }

  // Generate connections (always needed, not cached)
  const { connections } = createSimulationLinks(spotifyArtists)

  // Transform artists with computed positions
  const artists = transformArtists(spotifyArtists, positionMap)
  const genres = extractGenres(artists, artistAudioMap)

  // Calculate overall audio profile
  const audioProfile = calculateAudioProfile(audioFeatures)

  return {
    artists,
    genres,
    connections,
    audioProfile,
  }
}
