import { useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import type { GalaxyArtist } from '@/types/domain'

// Configuration
const TOP_ARTISTS_COUNT = 10 // Always show labels for top N by size
const NEARBY_DISTANCE_THRESHOLD = 30 // Show labels for artists within this distance
const FAR_DISTANCE_FADE_START = 40 // Start fading labels at this distance
const FAR_DISTANCE_FADE_END = 60 // Fully fade labels at this distance
const MAX_NEARBY_LABELS = 10 // Max additional labels beyond top artists

/**
 * Single persistent label for an artist
 */
function PersistentLabel({
  artist,
  opacity,
}: {
  artist: GalaxyArtist
  opacity: number
}): React.JSX.Element {
  return (
    <Html
      position={artist.position}
      center
      zIndexRange={[10, 0]}
      style={{
        pointerEvents: 'none',
        transform: 'translateY(-20px)',
        opacity,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
        style={{
          backgroundColor: `${artist.color}33`,
          borderColor: `${artist.color}66`,
          borderWidth: '1px',
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {artist.name}
      </div>
    </Html>
  )
}

/**
 * Persistent labels for top artists and nearby stars
 * Shows always-on labels for discoverability
 */
export function PersistentLabels(): React.JSX.Element | null {
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const artists = galaxyData?.artists ?? []
  const hoveredArtistId = useUIStore((state) => state.hoveredArtistId)
  const selectedArtistId = useUIStore((state) => state.selection.artistId)

  const { camera } = useThree()
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 0, 50])

  // Update camera position each frame
  useFrame(() => {
    setCameraPosition([camera.position.x, camera.position.y, camera.position.z])
  })

  // Get top artists by star size (largest stars)
  const topArtists = useMemo(() => {
    if (artists.length === 0) return []
    return [...artists]
      .sort((a, b) => b.size - a.size)
      .slice(0, TOP_ARTISTS_COUNT)
  }, [artists])

  const topArtistIds = useMemo(
    () => new Set(topArtists.map((a) => a.id)),
    [topArtists]
  )

  // Calculate distances and find nearby artists
  const visibleLabels = useMemo(() => {
    const labels: Array<{ artist: GalaxyArtist; opacity: number }> = []

    // Always add top artists with full opacity (unless too far)
    for (const artist of topArtists) {
      // Skip if this artist is being hovered or selected (shown by GalaxyStars)
      if (artist.id === hoveredArtistId || artist.id === selectedArtistId) continue

      const dx = artist.position[0] - cameraPosition[0]
      const dy = artist.position[1] - cameraPosition[1]
      const dz = artist.position[2] - cameraPosition[2]
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // Calculate opacity based on distance
      let opacity = 1
      if (distance > FAR_DISTANCE_FADE_END) {
        opacity = 0
      } else if (distance > FAR_DISTANCE_FADE_START) {
        opacity = 1 - (distance - FAR_DISTANCE_FADE_START) / (FAR_DISTANCE_FADE_END - FAR_DISTANCE_FADE_START)
      }

      if (opacity > 0) {
        labels.push({ artist, opacity })
      }
    }

    // Add nearby artists that aren't in top list
    const nearbyArtists: Array<{ artist: GalaxyArtist; distance: number }> = []

    for (const artist of artists) {
      // Skip top artists and hovered/selected
      if (topArtistIds.has(artist.id)) continue
      if (artist.id === hoveredArtistId || artist.id === selectedArtistId) continue

      const dx = artist.position[0] - cameraPosition[0]
      const dy = artist.position[1] - cameraPosition[1]
      const dz = artist.position[2] - cameraPosition[2]
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < NEARBY_DISTANCE_THRESHOLD) {
        nearbyArtists.push({ artist, distance })
      }
    }

    // Sort by distance and take closest ones
    nearbyArtists.sort((a, b) => a.distance - b.distance)

    for (const { artist, distance } of nearbyArtists.slice(0, MAX_NEARBY_LABELS)) {
      // Opacity fades as you get closer to threshold
      const opacity = 1 - (distance / NEARBY_DISTANCE_THRESHOLD) * 0.5
      labels.push({ artist, opacity })
    }

    return labels
  }, [artists, topArtists, topArtistIds, hoveredArtistId, selectedArtistId, cameraPosition])

  if (visibleLabels.length === 0) return null

  return (
    <>
      {visibleLabels.map(({ artist, opacity }) => (
        <PersistentLabel key={artist.id} artist={artist} opacity={opacity} />
      ))}
    </>
  )
}
