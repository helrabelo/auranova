import { useState, useMemo } from 'react'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import type { GalaxyGenre } from '@/types/domain'

interface GenreItemProps {
  genre: GalaxyGenre
  isSelected: boolean
  onClick: () => void
}

function GenreItem({
  genre,
  isSelected,
  onClick,
}: GenreItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left ${
        isSelected
          ? 'bg-white/20'
          : 'hover:bg-white/10'
      }`}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: genre.color }}
      />
      <span className="text-sm text-gray-300 truncate flex-1">{genre.name}</span>
      <span className="text-xs text-gray-500">{genre.artistCount}</span>
    </button>
  )
}

export function GenreLegend(): React.JSX.Element | null {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const selectedGenreId = useUIStore((state) => state.selection.genreId)
  const selectedArtistId = useUIStore((state) => state.selection.artistId)
  const selectGenre = useUIStore((state) => state.selectGenre)

  // Sort genres by artist count (most popular first)
  const sortedGenres = useMemo(() => {
    if (!galaxyData) return []
    return [...galaxyData.genres].sort((a, b) => b.artistCount - a.artistCount)
  }, [galaxyData])

  const handleGenreClick = (genreId: string) => {
    // Toggle selection
    if (selectedGenreId === genreId) {
      selectGenre(null)
    } else {
      selectGenre(genreId)
    }
  }

  if (!galaxyData || sortedGenres.length === 0) return null

  // Hide on mobile when artist panel is open to avoid overlap
  const hideOnMobile = selectedArtistId ? 'hidden sm:block' : ''

  return (
    <div className={`fixed bottom-20 left-4 z-40 ${hideOnMobile}`}>
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden max-w-[180px] sm:max-w-[200px]">
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-medium text-white">Genres</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Genre list */}
        {!isCollapsed && (
          <div className="px-2 pb-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
            {sortedGenres.map((genre) => (
              <GenreItem
                key={genre.id}
                genre={genre}
                isSelected={selectedGenreId === genre.id}
                onClick={() => handleGenreClick(genre.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
