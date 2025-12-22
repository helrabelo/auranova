import { useQuery } from '@tanstack/react-query'
import { getArtistTopTracks } from '@/api/spotify/endpoints'
import type { SpotifyTrack } from '@/api/spotify/types'
import { useAuthStore } from '@/stores/authStore'

interface UseArtistTopTracksOptions {
  artistId: string | null
  market?: string
  enabled?: boolean
}

interface UseArtistTopTracksResult {
  data: SpotifyTrack[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch an artist's top tracks
 * Used for preview playback - returns tracks with preview_url
 */
export function useArtistTopTracks(
  options: UseArtistTopTracksOptions
): UseArtistTopTracksResult {
  const { artistId, market = 'US', enabled = true } = options
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['artistTopTracks', artistId, market],
    queryFn: async () => {
      if (!artistId) return []
      const response = await getArtistTopTracks(artistId, market)
      return response.tracks
    },
    enabled: enabled && isAuthenticated && !!artistId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch()
    },
  }
}

/**
 * Get tracks that have preview URLs available
 */
export function getTracksWithPreviews(
  tracks: SpotifyTrack[] | undefined
): SpotifyTrack[] {
  if (!tracks) return []
  return tracks.filter((track) => track.preview_url !== null)
}
