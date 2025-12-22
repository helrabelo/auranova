/**
 * Position cache for stable artist positions between renders
 * Uses localStorage to persist positions across sessions
 */

import type { TimeRange } from '@/types/domain'

const CACHE_KEY_PREFIX = 'auranova:positions:'
const CACHE_VERSION = 1

interface CacheEntry {
  version: number
  timestamp: number
  artistIds: string[]
  positions: Map<string, [number, number, number]>
}

interface SerializedCacheEntry {
  version: number
  timestamp: number
  artistIds: string[]
  positions: [string, [number, number, number]][]
}

/**
 * Generate a cache key for a specific time range and artist set
 */
function getCacheKey(timeRange: TimeRange, artistIds: string[]): string {
  // Create a hash of sorted artist IDs to detect changes
  const sortedIds = [...artistIds].sort()
  const idsHash = sortedIds.join(',').slice(0, 100) // Truncate for key length
  return `${CACHE_KEY_PREFIX}${timeRange}:${String(sortedIds.length)}:${String(hashCode(idsHash))}`
}

/**
 * Simple hash function for string
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if cached positions are still valid
 * Invalid if artist set has changed
 */
function isCacheValid(cached: CacheEntry, currentArtistIds: string[]): boolean {
  if (cached.version !== CACHE_VERSION) return false

  // Check if artist sets match
  const cachedSet = new Set(cached.artistIds)
  const currentSet = new Set(currentArtistIds)

  if (cachedSet.size !== currentSet.size) return false

  for (const id of currentSet) {
    if (!cachedSet.has(id)) return false
  }

  return true
}

/**
 * Get cached positions for a time range and artist set
 */
export function getCachedPositions(
  timeRange: TimeRange,
  artistIds: string[]
): Map<string, [number, number, number]> | null {
  try {
    const key = getCacheKey(timeRange, artistIds)
    const stored = localStorage.getItem(key)

    if (!stored) return null

    const serialized = JSON.parse(stored) as SerializedCacheEntry
    const cached: CacheEntry = {
      ...serialized,
      positions: new Map(serialized.positions),
    }

    if (!isCacheValid(cached, artistIds)) {
      localStorage.removeItem(key)
      return null
    }

    return cached.positions
  } catch {
    return null
  }
}

/**
 * Save positions to cache
 */
export function setCachedPositions(
  timeRange: TimeRange,
  artistIds: string[],
  positions: Map<string, [number, number, number]>
): void {
  try {
    const key = getCacheKey(timeRange, artistIds)

    const entry: SerializedCacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      artistIds,
      positions: Array.from(positions.entries()),
    }

    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

/**
 * Clear all cached positions
 */
export function clearPositionCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
    })
  } catch {
    // Silently fail
  }
}
