import { useEffect, useMemo } from 'react'
import { useTopArtists } from '@/api/hooks/useTopArtists'
import { useTopTracks } from '@/api/hooks/useTopTracks'
import { useAudioFeatures } from '@/api/hooks/useAudioFeatures'
import { useMusicStore } from '@/stores/musicStore'
import { useAuthStore } from '@/stores/authStore'
import { transformToGalaxyData } from '@/simulation/dataTransform'

/**
 * Component that handles loading Spotify data and transforming it to galaxy data
 * Renders nothing - purely for side effects
 */
export function DataLoader(): React.JSX.Element | null {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const timeRange = useMusicStore((state) => state.timeRange)
  const setGalaxyData = useMusicStore((state) => state.setGalaxyData)
  const setLoading = useMusicStore((state) => state.setLoading)
  const setError = useMusicStore((state) => state.setError)

  // Fetch top artists
  const {
    data: artists,
    isLoading: isLoadingArtists,
    error: artistsError,
  } = useTopArtists({
    timeRange,
    maxArtists: 50,
    enabled: isAuthenticated,
  })

  // Fetch top tracks
  const {
    data: tracks,
    isLoading: isLoadingTracks,
    error: tracksError,
  } = useTopTracks({
    timeRange,
    maxTracks: 50,
    enabled: isAuthenticated,
  })

  // Extract track IDs for audio features query
  const trackIds = useMemo(() => {
    return tracks?.map((track) => track.id) ?? []
  }, [tracks])

  // Fetch audio features for tracks
  const {
    data: audioFeatures,
    isLoading: isLoadingAudioFeatures,
    error: audioFeaturesError,
  } = useAudioFeatures({
    trackIds,
    enabled: isAuthenticated && trackIds.length > 0,
  })

  // Combined loading state
  const isLoading =
    isLoadingArtists || isLoadingTracks || isLoadingAudioFeatures

  // Update loading state
  useEffect(() => {
    setLoading(isLoading)
  }, [isLoading, setLoading])

  // Handle errors (prioritize artist errors as they're most critical)
  useEffect(() => {
    const error = artistsError ?? tracksError ?? audioFeaturesError
    if (error) {
      setError(error.message)
    } else {
      setError(null)
    }
  }, [artistsError, tracksError, audioFeaturesError, setError])

  // Transform and store data when all data is loaded
  useEffect(() => {
    if (artists && artists.length > 0) {
      // Transform with audio features and D3 force simulation
      const galaxyData = transformToGalaxyData(artists, {
        tracks: tracks ?? [],
        audioFeatures: audioFeatures ?? [],
        timeRange, // For position caching
      })
      setGalaxyData(galaxyData)
    }
  }, [artists, tracks, audioFeatures, timeRange, setGalaxyData])

  // This component renders nothing
  return null
}
