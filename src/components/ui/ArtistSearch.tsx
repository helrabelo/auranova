import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import type { GalaxyArtist } from '@/types/domain'

const MAX_RESULTS = 8
const DEBOUNCE_MS = 150

/**
 * Search overlay for finding and navigating to artists
 */
export function ArtistSearch(): React.JSX.Element {
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const artists = galaxyData?.artists ?? []

  const searchQuery = useUIStore((state) => state.searchQuery)
  const isSearchOpen = useUIStore((state) => state.isSearchOpen)
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)
  const toggleSearch = useUIStore((state) => state.toggleSearch)
  const closeSearch = useUIStore((state) => state.closeSearch)
  const selectArtist = useUIStore((state) => state.selectArtist)

  const inputRef = useRef<HTMLInputElement>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchOpen])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery])

  // Filter artists based on search query
  const searchResults = useMemo<GalaxyArtist[]>(() => {
    if (!debouncedQuery.trim()) return []

    const query = debouncedQuery.toLowerCase()
    return artists
      .filter((artist) => artist.name.toLowerCase().includes(query))
      .slice(0, MAX_RESULTS)
  }, [artists, debouncedQuery])

  // Handle selecting an artist from results
  const handleSelectArtist = useCallback(
    (artist: GalaxyArtist) => {
      selectArtist(artist.id)
      closeSearch()
    },
    [selectArtist, closeSearch]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          closeSearch()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (searchResults[selectedIndex]) {
            handleSelectArtist(searchResults[selectedIndex])
          }
          break
      }
    },
    [closeSearch, searchResults, selectedIndex, handleSelectArtist]
  )

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleSearch()
      }
      // Close on Escape when open
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [toggleSearch, closeSearch, isSearchOpen])

  // Don't render if no artists loaded
  if (artists.length === 0) return <></>

  return (
    <>
      {/* Search button */}
      <button
        onClick={toggleSearch}
        className="fixed top-20 left-4 z-50 p-2.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
        aria-label="Search artists (Ctrl+K)"
        title="Search artists (Ctrl+K)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-gray-400"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Search overlay */}
      {isSearchOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closeSearch}
          />

          {/* Search panel */}
          <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[480px] z-50">
            <div className="bg-black/95 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-gray-500 flex-shrink-0"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search artists..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
                <kbd className="hidden md:block px-2 py-1 rounded bg-white/10 text-gray-500 text-xs font-mono">
                  esc
                </kbd>
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto">
                  {searchResults.map((artist, index) => (
                    <button
                      key={artist.id}
                      onClick={() => handleSelectArtist(artist)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Artist image or fallback */}
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-10 h-10 rounded-full object-cover border"
                          style={{ borderColor: artist.color }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${artist.color}, ${artist.color}88)`,
                          }}
                        >
                          {artist.name.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {artist.name}
                        </p>
                        {artist.genres.length > 0 && (
                          <p className="text-gray-500 text-xs truncate">
                            {artist.genres.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </div>

                      {/* Color indicator */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: artist.color }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {debouncedQuery.trim() && searchResults.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-500 text-sm">No artists found</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Try a different search term
                  </p>
                </div>
              )}

              {/* Initial state - show hint */}
              {!debouncedQuery.trim() && (
                <div className="px-4 py-6 text-center">
                  <p className="text-gray-500 text-sm">
                    Type to search your top artists
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    Navigate with arrow keys, Enter to select
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
