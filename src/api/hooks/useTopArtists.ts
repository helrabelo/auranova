import { useQuery } from '@tanstack/react-query'
import { getAllTopArtists } from '@/api/spotify/endpoints'
import type { SpotifyArtist, TimeRange } from '@/api/spotify/types'
import { useAuthStore } from '@/stores/authStore'

interface UseTopArtistsOptions {
  timeRange?: TimeRange
  maxArtists?: number
  enabled?: boolean
}

export function useTopArtists(options: UseTopArtistsOptions = {}): {
  data: SpotifyArtist[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { timeRange = 'medium_term', maxArtists = 50, enabled = true } = options
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['topArtists', timeRange, maxArtists],
    queryFn: () => getAllTopArtists(timeRange, maxArtists),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
