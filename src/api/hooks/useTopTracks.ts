import { useQuery } from '@tanstack/react-query'
import { getAllTopTracks } from '@/api/spotify/endpoints'
import type { SpotifyTrack, TimeRange } from '@/api/spotify/types'
import { useAuthStore } from '@/stores/authStore'

interface UseTopTracksOptions {
  timeRange?: TimeRange
  maxTracks?: number
  enabled?: boolean
}

export function useTopTracks(options: UseTopTracksOptions = {}): {
  data: SpotifyTrack[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { timeRange = 'medium_term', maxTracks = 50, enabled = true } = options
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['topTracks', timeRange, maxTracks],
    queryFn: () => getAllTopTracks(timeRange, maxTracks),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
