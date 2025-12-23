import { create } from 'zustand'
import type { CameraTarget, Selection } from '@/types/domain'

interface UIState {
  // Selection state
  selection: Selection
  hoveredArtistId: string | null

  // Camera state
  cameraTarget: CameraTarget | null
  isAnimating: boolean

  // UI panels
  showArtistPanel: boolean
  showGenreLegend: boolean
  showControls: boolean

  // Audio preview
  previewingTrackId: string | null
  previewVolume: number

  // Search
  searchQuery: string
  isSearchOpen: boolean

  // Actions
  selectArtist: (artistId: string | null) => void
  selectGenre: (genreId: string | null) => void
  setHoveredArtist: (artistId: string | null) => void
  setCameraTarget: (target: CameraTarget | null) => void
  setIsAnimating: (animating: boolean) => void
  toggleArtistPanel: () => void
  toggleGenreLegend: () => void
  toggleControls: () => void
  setPreviewingTrack: (trackId: string | null) => void
  setPreviewVolume: (volume: number) => void
  setSearchQuery: (query: string) => void
  toggleSearch: () => void
  closeSearch: () => void
  resetSelection: () => void
  resetCamera: () => void
}

const DEFAULT_CAMERA_TARGET: CameraTarget = {
  position: [0, 0, 50],
  lookAt: [0, 0, 0],
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  selection: {
    artistId: null,
    genreId: null,
  },
  hoveredArtistId: null,
  cameraTarget: DEFAULT_CAMERA_TARGET,
  isAnimating: false,
  showArtistPanel: true,
  showGenreLegend: true,
  showControls: true,
  previewingTrackId: null,
  previewVolume: 0.5,
  searchQuery: '',
  isSearchOpen: false,

  // Actions
  selectArtist: (artistId): void => {
    set((state) => ({
      selection: { ...state.selection, artistId },
      showArtistPanel: artistId !== null,
    }))
  },

  selectGenre: (genreId): void => {
    set((state) => ({
      selection: { ...state.selection, genreId },
    }))
  },

  setHoveredArtist: (artistId): void => {
    set({ hoveredArtistId: artistId })
  },

  setCameraTarget: (target): void => {
    set({ cameraTarget: target, isAnimating: true })
  },

  setIsAnimating: (animating): void => {
    set({ isAnimating: animating })
  },

  toggleArtistPanel: (): void => {
    set((state) => ({ showArtistPanel: !state.showArtistPanel }))
  },

  toggleGenreLegend: (): void => {
    set((state) => ({ showGenreLegend: !state.showGenreLegend }))
  },

  toggleControls: (): void => {
    set((state) => ({ showControls: !state.showControls }))
  },

  setPreviewingTrack: (trackId): void => {
    set({ previewingTrackId: trackId })
  },

  setPreviewVolume: (volume): void => {
    set({ previewVolume: Math.max(0, Math.min(1, volume)) })
  },

  setSearchQuery: (query): void => {
    set({ searchQuery: query })
  },

  toggleSearch: (): void => {
    set((state) => ({
      isSearchOpen: !state.isSearchOpen,
      searchQuery: state.isSearchOpen ? '' : state.searchQuery,
    }))
  },

  closeSearch: (): void => {
    set({ isSearchOpen: false, searchQuery: '' })
  },

  resetSelection: (): void => {
    set({
      selection: { artistId: null, genreId: null },
      hoveredArtistId: null,
    })
  },

  resetCamera: (): void => {
    set({
      cameraTarget: DEFAULT_CAMERA_TARGET,
      isAnimating: true,
    })
  },
}))
