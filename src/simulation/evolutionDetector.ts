import type { GalaxyArtist, GalaxyData, EvolutionStatus } from '@/types/domain'

/**
 * Compare two galaxy data sets and detect evolution status for each artist.
 * This enables visual highlighting of new discoveries, fading artists, and rank changes.
 */
export function detectEvolution(
  newData: GalaxyData,
  previousData: GalaxyData | null
): GalaxyData {
  // If no previous data, all artists are "new" (but we don't mark initial load as new)
  if (!previousData) {
    return newData
  }

  // Create lookup maps for previous artists
  const previousArtistMap = new Map<string, { index: number; artist: GalaxyArtist }>()
  previousData.artists.forEach((artist, index) => {
    previousArtistMap.set(artist.id, { index, artist })
  })

  // Track artists with evolution status
  const artistsWithEvolution: GalaxyArtist[] = newData.artists.map((artist, newIndex) => {
    const previous = previousArtistMap.get(artist.id)

    let evolutionStatus: EvolutionStatus = 'stable'
    let rankChange = 0

    if (!previous) {
      // Artist is new (not in previous data)
      evolutionStatus = 'new'
    } else {
      // Artist exists in both - check for rank changes
      const oldIndex = previous.index
      rankChange = oldIndex - newIndex // Positive = moved up (lower index = higher rank)

      if (rankChange >= 5) {
        evolutionStatus = 'rising'
      } else if (rankChange <= -5) {
        evolutionStatus = 'falling'
      } else {
        evolutionStatus = 'stable'
      }
    }

    return {
      ...artist,
      evolutionStatus,
      rankChange,
    }
  })

  // Note: We could also track "fading" artists (in previous but not in new)
  // but those need special handling since they're not in the new data set.
  // For now, we focus on the current data set and mark newcomers.

  return {
    ...newData,
    artists: artistsWithEvolution,
  }
}

/**
 * Get summary statistics about evolution between two time ranges
 */
export function getEvolutionSummary(data: GalaxyData): {
  newCount: number
  risingCount: number
  fallingCount: number
  stableCount: number
} {
  const summary = {
    newCount: 0,
    risingCount: 0,
    fallingCount: 0,
    stableCount: 0,
  }

  data.artists.forEach((artist) => {
    switch (artist.evolutionStatus) {
      case 'new':
        summary.newCount++
        break
      case 'rising':
        summary.risingCount++
        break
      case 'falling':
        summary.fallingCount++
        break
      case 'stable':
      default:
        summary.stableCount++
        break
    }
  })

  return summary
}
