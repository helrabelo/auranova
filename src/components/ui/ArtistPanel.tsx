import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import { useArtistTopTracks } from '@/api/hooks'
import { AudioPreviewPlayer } from './AudioPreviewPlayer'

/**
 * Panel showing selected artist details
 */
export function ArtistPanel(): React.JSX.Element | null {
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const selectedArtistId = useUIStore((state) => state.selection.artistId)
  const showPanel = useUIStore((state) => state.showArtistPanel)
  const selectArtist = useUIStore((state) => state.selectArtist)

  // Fetch artist's top tracks for preview playback
  const { data: artistTracks, isLoading: isLoadingTracks } = useArtistTopTracks(
    {
      artistId: selectedArtistId,
    }
  )

  // Find selected artist
  const artist = galaxyData?.artists.find((a) => a.id === selectedArtistId)

  if (!artist || !showPanel) {
    return null
  }

  const formatFollowers = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="absolute right-4 top-20 w-80 bg-black/80 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden z-30">
      {/* Header with image */}
      <div className="relative h-32 bg-gradient-to-b from-purple-900/50 to-transparent">
        {artist.imageUrl && (
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <button
          onClick={() => selectArtist(null)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          aria-label="Close panel"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 -mt-8 relative">
        {/* Artist image */}
        <div
          className="w-20 h-20 rounded-full border-4 border-black overflow-hidden mb-3"
          style={{
            backgroundColor: artist.color,
            boxShadow: `0 0 20px ${artist.color}40`,
          }}
        >
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-white font-bold">
              {artist.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="text-xl font-bold text-white mb-1">{artist.name}</h3>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-400">Followers</span>
            <p className="text-white font-medium">
              {formatFollowers(artist.followers)}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Popularity</span>
            <p className="text-white font-medium">{artist.popularity}/100</p>
          </div>
        </div>

        {/* Genres */}
        {artist.genres.length > 0 && (
          <div className="mb-4">
            <span className="text-gray-400 text-sm">Genres</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {artist.genres.slice(0, 5).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spotify link */}
        <a
          href={artist.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] transition-colors text-white font-medium text-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Open in Spotify
        </a>
      </div>

      {/* Audio preview player */}
      {isLoadingTracks ? (
        <div className="px-4 py-3 text-center">
          <div className="animate-pulse text-gray-400 text-sm">
            Loading previews...
          </div>
        </div>
      ) : artistTracks && artistTracks.length > 0 ? (
        <AudioPreviewPlayer tracks={artistTracks} artistName={artist.name} />
      ) : null}
    </div>
  )
}
