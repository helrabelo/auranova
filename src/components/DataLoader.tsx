import { useEffect, useMemo, useRef } from 'react'
import { useTopArtists } from '@/api/hooks/useTopArtists'
import { useTopTracks } from '@/api/hooks/useTopTracks'
import { useAudioFeatures } from '@/api/hooks/useAudioFeatures'
import { useMusicStore } from '@/stores/musicStore'
import { useAuthStore } from '@/stores/authStore'
import { transformToGalaxyData } from '@/simulation/dataTransform'
import { detectEvolution } from '@/simulation/evolutionDetector'

/**
 * Component that handles loading Spotify data and transforming it to galaxy data
 * Renders nothing - purely for side effects
 */
export function DataLoader(): React.JSX.Element | null {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const timeRange = useMusicStore((state) => state.timeRange)
  const previousTimeRange = useMusicStore((state) => state.previousTimeRange)
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const setGalaxyData = useMusicStore((state) => state.setGalaxyData)
  const setLoading = useMusicStore((state) => state.setLoading)
  const setError = useMusicStore((state) => state.setError)

  // Track if this is a time range change (not initial load)
  const isTimeRangeChange = useRef(false)
  useEffect(() => {
    if (previousTimeRange !== null && previousTimeRange !== timeRange) {
      isTimeRangeChange.current = true
    }
  }, [timeRange, previousTimeRange])

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

  // Store previous galaxy data for evolution detection
  const previousGalaxyDataRef = useRef(galaxyData)
  useEffect(() => {
    // Update ref before transformation happens
    previousGalaxyDataRef.current = galaxyData
  }, [timeRange]) // Only update when time range changes

  // Transform and store data when all data is loaded
  useEffect(() => {
    if (artists && artists.length > 0) {
      // Transform with audio features and D3 force simulation
      let newGalaxyData = transformToGalaxyData(artists, {
        tracks: tracks ?? [],
        audioFeatures: audioFeatures ?? [],
        timeRange, // For position caching
      })

      // Detect evolution only if this is a time range change
      if (isTimeRangeChange.current && previousGalaxyDataRef.current) {
        newGalaxyData = detectEvolution(newGalaxyData, previousGalaxyDataRef.current)
        isTimeRangeChange.current = false // Reset flag
      }

      setGalaxyData(newGalaxyData)
    }
  }, [artists, tracks, audioFeatures, timeRange, setGalaxyData])

  // This component renders nothing
  return null
}
