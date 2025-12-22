import { useQuery } from '@tanstack/react-query'
import { getAudioFeatures } from '@/api/spotify/endpoints'
import type { SpotifyAudioFeatures } from '@/api/spotify/types'
import { useAuthStore } from '@/stores/authStore'

interface UseAudioFeaturesOptions {
  trackIds: string[]
  enabled?: boolean
}

export function useAudioFeatures(options: UseAudioFeaturesOptions): {
  data: SpotifyAudioFeatures[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { trackIds, enabled = true } = options
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['audioFeatures', trackIds],
    queryFn: async () => {
      const response = await getAudioFeatures(trackIds)
      // Filter out null entries (tracks without audio features)
      return response.audio_features.filter(
        (f): f is SpotifyAudioFeatures => f !== null
      )
    },
    enabled: enabled && isAuthenticated && trackIds.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour - audio features don't change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
