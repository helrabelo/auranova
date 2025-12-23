import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GalaxyData,
  GalaxyArtist,
  GalaxyGenre,
  ArtistConnection,
  AudioProfile,
  TimeRange,
} from '@/types/domain'

interface MusicState {
  // Data
  galaxyData: GalaxyData | null
  previousGalaxyData: GalaxyData | null // For evolution comparison
  timeRange: TimeRange
  previousTimeRange: TimeRange | null
  isTransitioning: boolean // For animation state
  isLoading: boolean
  error: string | null

  // Actions
  setGalaxyData: (data: GalaxyData) => void
  setTimeRange: (range: TimeRange) => void
  setArtists: (artists: GalaxyArtist[]) => void
  setGenres: (genres: GalaxyGenre[]) => void
  setConnections: (connections: ArtistConnection[]) => void
  setAudioProfile: (profile: AudioProfile) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setTransitioning: (transitioning: boolean) => void
  reset: () => void

  // Selectors
  getArtistById: (id: string) => GalaxyArtist | undefined
  getGenreById: (id: string) => GalaxyGenre | undefined
  getArtistsByGenre: (genreId: string) => GalaxyArtist[]
}

const initialGalaxyData: GalaxyData = {
  artists: [],
  genres: [],
  connections: [],
  audioProfile: {
    energy: 0.5,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.5,
    tempo: 120,
  },
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Initial state
      galaxyData: null,
      previousGalaxyData: null,
      timeRange: 'medium_term',
      previousTimeRange: null,
      isTransitioning: false,
      isLoading: false,
      error: null,

  // Actions
  setGalaxyData: (data): void => {
    const currentData = get().galaxyData
    set({
      previousGalaxyData: currentData,
      galaxyData: data,
      error: null,
      isTransitioning: currentData !== null, // Only transition if we had previous data
    })
  },

  setTimeRange: (range): void => {
    const currentRange = get().timeRange
    if (currentRange !== range) {
      set({
        previousTimeRange: currentRange,
        timeRange: range,
      })
    }
  },

  setTransitioning: (transitioning): void => {
    set({ isTransitioning: transitioning })
  },

  setArtists: (artists): void => {
    set((state) => ({
      galaxyData: state.galaxyData
        ? { ...state.galaxyData, artists }
        : { ...initialGalaxyData, artists },
    }))
  },

  setGenres: (genres): void => {
    set((state) => ({
      galaxyData: state.galaxyData
        ? { ...state.galaxyData, genres }
        : { ...initialGalaxyData, genres },
    }))
  },

  setConnections: (connections): void => {
    set((state) => ({
      galaxyData: state.galaxyData
        ? { ...state.galaxyData, connections }
        : { ...initialGalaxyData, connections },
    }))
  },

  setAudioProfile: (profile): void => {
    set((state) => ({
      galaxyData: state.galaxyData
        ? { ...state.galaxyData, audioProfile: profile }
        : { ...initialGalaxyData, audioProfile: profile },
    }))
  },

  setLoading: (loading): void => {
    set({ isLoading: loading })
  },

  setError: (error): void => {
    set({ error })
  },

  reset: (): void => {
    set({
      galaxyData: null,
      previousGalaxyData: null,
      previousTimeRange: null,
      isTransitioning: false,
      isLoading: false,
      error: null,
    })
  },

  // Selectors
  getArtistById: (id): GalaxyArtist | undefined => {
    return get().galaxyData?.artists.find((a) => a.id === id)
  },

  getGenreById: (id): GalaxyGenre | undefined => {
    return get().galaxyData?.genres.find((g) => g.id === id)
  },

  getArtistsByGenre: (genreId): GalaxyArtist[] => {
    const genre = get().getGenreById(genreId)
    if (!genre) return []
    return (
      get().galaxyData?.artists.filter((a) => a.genres.includes(genre.name)) ??
      []
    )
  },
    }),
    {
      name: 'auranova-music-preferences',
      partialize: (state) => ({
        // Only persist the time range selection
        timeRange: state.timeRange,
      }),
    }
  )
)
