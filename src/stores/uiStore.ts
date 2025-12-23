import { create } from 'zustand'
import type { CameraTarget, Selection } from '@/types/domain'

// Galaxy phases for the onboarding flow
export type GalaxyPhase =
  | 'skeleton'    // Unauthenticated: muted placeholder stars
  | 'loading'     // Authenticated, fetching data: skeleton with pulse
  | 'revealing'   // Data ready: transition from skeleton to real positions
  | 'active'      // Full visualization

interface UIState {
  // Selection state
  selection: Selection
  hoveredArtistId: string | null

  // Camera state
  cameraTarget: CameraTarget | null
  isAnimating: boolean

  // Galaxy phase state (shared between GalaxyStars and CameraController)
  galaxyPhase: GalaxyPhase
  revealProgress: number
  skipReveal: boolean

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
  setGalaxyPhase: (phase: GalaxyPhase) => void
  setRevealProgress: (progress: number) => void
  triggerSkipReveal: () => void
  resetGalaxyPhase: () => void
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
  galaxyPhase: 'skeleton',
  revealProgress: 0,
  skipReveal: false,
  showArtistPanel: true,
  showGenreLegend: false,
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

  setGalaxyPhase: (phase): void => {
    set({ galaxyPhase: phase })
  },

  setRevealProgress: (progress): void => {
    set({ revealProgress: progress })
  },

  triggerSkipReveal: (): void => {
    set({ skipReveal: true })
  },

  resetGalaxyPhase: (): void => {
    set({
      galaxyPhase: 'skeleton',
      revealProgress: 0,
      skipReveal: false,
    })
  },
}))
