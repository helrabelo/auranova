import { useQuery } from '@tanstack/react-query'
import { getUserProfile } from '@/api/spotify/endpoints'
import type { SpotifyUserProfile } from '@/api/spotify/types'
import { useAuthStore } from '@/stores/authStore'

interface UseUserProfileOptions {
  enabled?: boolean
}

export function useUserProfile(options: UseUserProfileOptions = {}): {
  data: SpotifyUserProfile | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
  profileImageUrl: string | null
} {
  const { enabled = true } = options
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => getUserProfile(),
    enabled: enabled && isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })

  // Get the best quality profile image
  const profileImageUrl = query.data?.images?.[0]?.url ?? null

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    profileImageUrl,
  }
}
