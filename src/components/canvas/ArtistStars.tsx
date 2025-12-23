import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import { useAudioAnalyzer } from '@/audio'
import type { GalaxyArtist, EvolutionStatus } from '@/types/domain'

// Import shaders as raw text
import starVertexShader from '@/shaders/star.vert?raw'
import starFragmentShader from '@/shaders/star.frag?raw'

const SPAWN_DURATION = 3.0 // seconds for staggered spawn animation
const TRANSITION_DURATION = 1.5 // seconds for position transitions

interface StarData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  brightnesses: Float32Array
  phases: Float32Array
  evolutionStatuses: Float32Array // 0=stable, 1=new, 2=fading, 3=rising, 4=falling
  spawnDelays: Float32Array // 0-1 staggered delay for spawn animation
}

interface TransitionState {
  startTime: number
  fromPositions: Float32Array
  fromSizes: Float32Array
  toPositions: Float32Array
  toSizes: Float32Array
  artistIds: string[] // Track which artists in each index
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const color = new THREE.Color(hex)
  return [color.r, color.g, color.b]
}

/**
 * Map evolution status to numeric value for shader
 */
function evolutionToNumber(status: EvolutionStatus | undefined): number {
  switch (status) {
    case 'new':
      return 1
    case 'fading':
      return 2
    case 'rising':
      return 3
    case 'falling':
      return 4
    case 'stable':
    default:
      return 0
  }
}

/**
 * Prepare star data from galaxy artists
 */
function prepareStarData(artists: GalaxyArtist[]): StarData {
  const count = artists.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightnesses = new Float32Array(count)
  const phases = new Float32Array(count)
  const evolutionStatuses = new Float32Array(count)
  const spawnDelays = new Float32Array(count)

  // Calculate spawn delays based on distance from center
  // Stars closer to center spawn first, creating an outward "discovery" effect
  const distances: { index: number; dist: number }[] = []
  artists.forEach((artist, i) => {
    const dist = Math.sqrt(
      artist.position[0] ** 2 +
        artist.position[1] ** 2 +
        artist.position[2] ** 2
    )
    distances.push({ index: i, dist })
  })

  // Sort by distance to assign spawn order
  distances.sort((a, b) => a.dist - b.dist)
  const maxDelay = 0.6 // Leave room for the spawn window
  distances.forEach((item, sortIndex) => {
    // Normalize to 0-maxDelay range
    spawnDelays[item.index] = (sortIndex / (count - 1 || 1)) * maxDelay
  })

  artists.forEach((artist, i) => {
    // Position
    positions[i * 3] = artist.position[0]
    positions[i * 3 + 1] = artist.position[1]
    positions[i * 3 + 2] = artist.position[2]

    // Color
    const rgb = hexToRgb(artist.color)
    colors[i * 3] = rgb[0]
    colors[i * 3 + 1] = rgb[1]
    colors[i * 3 + 2] = rgb[2]

    // Size (from popularity)
    sizes[i] = artist.size

    // Brightness
    brightnesses[i] = artist.brightness

    // Random phase for twinkling
    phases[i] = Math.random()

    // Evolution status
    evolutionStatuses[i] = evolutionToNumber(artist.evolutionStatus)
  })

  return { positions, colors, sizes, brightnesses, phases, evolutionStatuses, spawnDelays }
}

/**
 * Create transition data between previous and new artist sets
 */
function createTransitionState(
  previousArtists: GalaxyArtist[],
  newArtists: GalaxyArtist[],
  startTime: number
): TransitionState {
  // Create lookup for previous artist positions by ID
  const previousMap = new Map<string, GalaxyArtist>()
  previousArtists.forEach((a) => previousMap.set(a.id, a))

  const count = newArtists.length
  const fromPositions = new Float32Array(count * 3)
  const fromSizes = new Float32Array(count)
  const toPositions = new Float32Array(count * 3)
  const toSizes = new Float32Array(count)
  const artistIds = newArtists.map((a) => a.id)

  newArtists.forEach((artist, i) => {
    const previous = previousMap.get(artist.id)

    // Target position (new)
    toPositions[i * 3] = artist.position[0]
    toPositions[i * 3 + 1] = artist.position[1]
    toPositions[i * 3 + 2] = artist.position[2]
    toSizes[i] = artist.size

    if (previous) {
      // Existing artist - transition from old position
      fromPositions[i * 3] = previous.position[0]
      fromPositions[i * 3 + 1] = previous.position[1]
      fromPositions[i * 3 + 2] = previous.position[2]
      fromSizes[i] = previous.size
    } else {
      // New artist - start from center with zero size (will grow in)
      fromPositions[i * 3] = 0
      fromPositions[i * 3 + 1] = 0
      fromPositions[i * 3 + 2] = 0
      fromSizes[i] = 0
    }
  })

  return {
    startTime,
    fromPositions,
    fromSizes,
    toPositions,
    toSizes,
    artistIds,
  }
}

/**
 * Easing function - ease out cubic
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Custom hook for raycasting to find hovered/clicked star
 */
function useStarInteraction(
  artists: GalaxyArtist[],
  currentPositionsRef: React.RefObject<Float32Array | null>,
  onHover: (artistId: string | null) => void,
  onClick: (artistId: string | null) => void
) {
  const { camera, raycaster, pointer } = useThree()
  const previousHovered = useRef<string | null>(null)

  const handlePointerMove = useCallback(
    (_event: ThreeEvent<PointerEvent>) => {
      // Use current interpolated positions for interaction
      const positions = currentPositionsRef.current
      if (!positions) return

      // Find closest point within threshold
      let closestDist = Infinity
      let closestIndex = -1
      const threshold = 1.5 // Distance threshold for hover

      raycaster.setFromCamera(pointer, camera)

      for (let i = 0; i < artists.length; i++) {
        const pos = new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        )
        const dist = raycaster.ray.distanceToPoint(pos)
        if (dist < threshold && dist < closestDist) {
          closestDist = dist
          closestIndex = i
        }
      }

      const hoveredId = closestIndex >= 0 ? artists[closestIndex].id : null

      if (hoveredId !== previousHovered.current) {
        previousHovered.current = hoveredId
        onHover(hoveredId)
      }
    },
    [artists, camera, raycaster, pointer, onHover, currentPositionsRef]
  )

  const handleClick = useCallback(
    (_event: ThreeEvent<MouseEvent>) => {
      const positions = currentPositionsRef.current
      if (!positions) return

      raycaster.setFromCamera(pointer, camera)

      let closestDist = Infinity
      let closestIndex = -1
      const threshold = 1.5

      for (let i = 0; i < artists.length; i++) {
        const pos = new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        )
        const dist = raycaster.ray.distanceToPoint(pos)
        if (dist < threshold && dist < closestDist) {
          closestDist = dist
          closestIndex = i
        }
      }

      const clickedId = closestIndex >= 0 ? artists[closestIndex].id : null
      onClick(clickedId)
    },
    [artists, camera, raycaster, pointer, onClick, currentPositionsRef]
  )

  return { handlePointerMove, handleClick }
}

/**
 * Artist label shown on hover - enhanced with image, genres, and popularity
 */
function ArtistLabel({
  artist,
  position,
}: {
  artist: GalaxyArtist
  position: [number, number, number]
}): React.JSX.Element {
  const statusBadge = artist.evolutionStatus
    ? {
        new: { text: 'NEW', color: 'bg-green-500' },
        rising: { text: '↑', color: 'bg-emerald-500' },
        falling: { text: '↓', color: 'bg-orange-500' },
        fading: { text: 'FADING', color: 'bg-red-500/50' },
        stable: null,
      }[artist.evolutionStatus]
    : null

  // Get top 3 genres
  const displayGenres = artist.genres.slice(0, 3).join(' · ')

  return (
    <Html
      position={position}
      center
      style={{
        pointerEvents: 'none',
        transform: 'translateY(-50px)',
      }}
    >
      <div
        className="bg-black/90 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        style={{ minWidth: '200px' }}
      >
        <div className="flex items-center gap-3">
          {/* Artist Image */}
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-12 h-12 rounded-full object-cover border-2 shadow-lg"
              style={{ borderColor: artist.color }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${artist.color}, ${artist.color}88)` }}
            >
              {artist.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Artist name with evolution badge */}
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-semibold truncate">{artist.name}</p>
              {statusBadge && (
                <span
                  className={`${statusBadge.color} text-white text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0`}
                >
                  {statusBadge.text}
                </span>
              )}
            </div>

            {/* Genres */}
            {displayGenres && (
              <p className="text-gray-400 text-xs truncate mt-0.5">{displayGenres}</p>
            )}

            {/* Popularity bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${artist.popularity}%`,
                    background: `linear-gradient(90deg, ${artist.color}, ${artist.color}cc)`,
                  }}
                />
              </div>
              <span className="text-gray-500 text-xs font-medium">{artist.popularity}</span>
            </div>
          </div>
        </div>
      </div>
    </Html>
  )
}

/**
 * Main artist stars component using instanced points with animated transitions
 */
export function ArtistStars(): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)

  // Get data from stores
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const previousGalaxyData = useMusicStore((state) => state.previousGalaxyData)
  const isTransitioning = useMusicStore((state) => state.isTransitioning)
  const setTransitioning = useMusicStore((state) => state.setTransitioning)
  const artists = galaxyData?.artists ?? []

  const hoveredArtistId = useUIStore((state) => state.hoveredArtistId)
  const setHoveredArtist = useUIStore((state) => state.setHoveredArtist)
  const selectArtist = useUIStore((state) => state.selectArtist)

  // Transition state refs
  const transitionRef = useRef<TransitionState | null>(null)
  const currentPositionsRef = useRef<Float32Array | null>(null)
  const currentSizesRef = useRef<Float32Array | null>(null)

  // Prepare star data
  const starData = useMemo(() => {
    if (artists.length === 0) return null
    return prepareStarData(artists)
  }, [artists])

  // Initialize/update transition when data changes
  useEffect(() => {
    if (!starData) return

    // Store current positions
    currentPositionsRef.current = new Float32Array(starData.positions)
    currentSizesRef.current = new Float32Array(starData.sizes)

    // Check if we should start a transition
    if (isTransitioning && previousGalaxyData?.artists) {
      transitionRef.current = createTransitionState(
        previousGalaxyData.artists,
        artists,
        -1 // Will be set in first frame
      )
    }
  }, [starData, isTransitioning, previousGalaxyData, artists])

  // Create geometry with buffer attributes
  const geometry = useMemo(() => {
    if (!starData) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(starData.positions, 3)
    )
    geo.setAttribute('aColor', new THREE.BufferAttribute(starData.colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(starData.sizes, 1))
    geo.setAttribute(
      'aBrightness',
      new THREE.BufferAttribute(starData.brightnesses, 1)
    )
    geo.setAttribute('aPhase', new THREE.BufferAttribute(starData.phases, 1))
    geo.setAttribute(
      'aEvolution',
      new THREE.BufferAttribute(starData.evolutionStatuses, 1)
    )
    geo.setAttribute(
      'aSpawnDelay',
      new THREE.BufferAttribute(starData.spawnDelays, 1)
    )
    return geo
  }, [starData])

  // Fade-in animation state
  const fadeStartTimeRef = useRef<number | null>(null)
  const hasStartedFade = useRef(false)

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBaseSize: { value: 10 },
        uGlowIntensity: { value: 0.8 },
        uOpacity: { value: 1 }, // Now handled by spawn animation, kept at 1
        // Audio reactive uniforms
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioTreble: { value: 0 },
        uAudioAverage: { value: 0 },
        // Transition uniform
        uTransitionProgress: { value: 1 },
        // Spawn animation uniform
        uSpawnProgress: { value: 0 },
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  // Mark fade-in to start when stars appear
  useEffect(() => {
    if (artists.length > 0 && !hasStartedFade.current) {
      hasStartedFade.current = true
    }
  }, [artists.length])

  // Interaction handlers
  const { handlePointerMove, handleClick } = useStarInteraction(
    artists,
    currentPositionsRef,
    setHoveredArtist,
    selectArtist
  )

  // Audio analyzer for reactive visuals
  const { bassRef, midRef, trebleRef, averageRef } = useAudioAnalyzer()

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

      // Update audio uniforms
      materialRef.current.uniforms.uAudioBass.value = bassRef.current
      materialRef.current.uniforms.uAudioMid.value = midRef.current
      materialRef.current.uniforms.uAudioTreble.value = trebleRef.current
      materialRef.current.uniforms.uAudioAverage.value = averageRef.current

      // Spawn animation (staggered fade-in)
      if (hasStartedFade.current) {
        if (fadeStartTimeRef.current === null) {
          fadeStartTimeRef.current = state.clock.elapsedTime
        }

        const elapsed = state.clock.elapsedTime - fadeStartTimeRef.current
        const spawnProgress = Math.min(elapsed / SPAWN_DURATION, 1)
        materialRef.current.uniforms.uSpawnProgress.value = spawnProgress
      }
    }

    // Handle position/size transitions
    if (transitionRef.current && geometryRef.current) {
      const transition = transitionRef.current

      // Initialize start time on first frame of transition
      if (transition.startTime < 0) {
        transition.startTime = state.clock.elapsedTime
      }

      const elapsed = state.clock.elapsedTime - transition.startTime
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1)
      const easedProgress = easeOutCubic(progress)

      // Update shader uniform for transition-aware effects
      if (materialRef.current) {
        materialRef.current.uniforms.uTransitionProgress.value = easedProgress
      }

      // Interpolate positions and sizes
      const positionAttr = geometryRef.current.getAttribute('position')
      const sizeAttr = geometryRef.current.getAttribute('aSize')

      if (positionAttr && sizeAttr) {
        const positions = positionAttr.array as Float32Array
        const sizes = sizeAttr.array as Float32Array

        for (let i = 0; i < transition.artistIds.length; i++) {
          // Lerp position
          positions[i * 3] =
            transition.fromPositions[i * 3] +
            (transition.toPositions[i * 3] - transition.fromPositions[i * 3]) *
              easedProgress
          positions[i * 3 + 1] =
            transition.fromPositions[i * 3 + 1] +
            (transition.toPositions[i * 3 + 1] -
              transition.fromPositions[i * 3 + 1]) *
              easedProgress
          positions[i * 3 + 2] =
            transition.fromPositions[i * 3 + 2] +
            (transition.toPositions[i * 3 + 2] -
              transition.fromPositions[i * 3 + 2]) *
              easedProgress

          // Lerp size
          sizes[i] =
            transition.fromSizes[i] +
            (transition.toSizes[i] - transition.fromSizes[i]) * easedProgress

          // Update current positions ref for raycasting
          if (currentPositionsRef.current) {
            currentPositionsRef.current[i * 3] = positions[i * 3]
            currentPositionsRef.current[i * 3 + 1] = positions[i * 3 + 1]
            currentPositionsRef.current[i * 3 + 2] = positions[i * 3 + 2]
          }
          if (currentSizesRef.current) {
            currentSizesRef.current[i] = sizes[i]
          }
        }

        positionAttr.needsUpdate = true
        sizeAttr.needsUpdate = true
      }

      // Clear transition when complete
      if (progress >= 1) {
        transitionRef.current = null
        setTransitioning(false)
      }
    }
  })

  // Get hovered artist with current position
  const hoveredArtist = useMemo(() => {
    if (!hoveredArtistId) return null
    return artists.find((a) => a.id === hoveredArtistId) ?? null
  }, [hoveredArtistId, artists])

  const hoveredArtistPosition = useMemo((): [number, number, number] | null => {
    if (!hoveredArtist || !currentPositionsRef.current) return null
    const idx = artists.findIndex((a) => a.id === hoveredArtist.id)
    if (idx < 0) return null
    return [
      currentPositionsRef.current[idx * 3],
      currentPositionsRef.current[idx * 3 + 1],
      currentPositionsRef.current[idx * 3 + 2],
    ]
  }, [hoveredArtist, artists])

  // Don't render if no data
  if (!geometry || artists.length === 0) {
    return null
  }

  return (
    <group>
      <points
        ref={pointsRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredArtist(null)}
        onClick={handleClick}
      >
        <primitive object={geometry} ref={geometryRef} attach="geometry" />
        <primitive
          object={shaderMaterial}
          ref={materialRef}
          attach="material"
        />
      </points>

      {/* Hover label */}
      {hoveredArtist && hoveredArtistPosition && (
        <ArtistLabel artist={hoveredArtist} position={hoveredArtistPosition} />
      )}
    </group>
  )
}
