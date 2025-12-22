import { create } from 'zustand'
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
  timeRange: TimeRange
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

export const useMusicStore = create<MusicState>((set, get) => ({
  // Initial state
  galaxyData: null,
  timeRange: 'medium_term',
  isLoading: false,
  error: null,

  // Actions
  setGalaxyData: (data): void => {
    set({ galaxyData: data, error: null })
  },

  setTimeRange: (range): void => {
    set({ timeRange: range })
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
}))
