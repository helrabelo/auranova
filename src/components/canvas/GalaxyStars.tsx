import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useAudioAnalyzer } from '@/audio'
import { useReducedMotion } from '@/hooks'
import type { GalaxyArtist, EvolutionStatus } from '@/types/domain'

// Import shaders as raw text
import starVertexShader from '@/shaders/star.vert?raw'
import starFragmentShader from '@/shaders/star.frag?raw'

const SPAWN_DURATION = 3.0 // seconds for staggered spawn animation
const REVEAL_DURATION = 2.5 // seconds for skeleton -> real data reveal (first visit)
const QUICK_REVEAL_DURATION = 0.4 // seconds for quick reveal (return visitors)
const SKELETON_STAR_COUNT = 50 // Number of placeholder stars
const RETURN_VISITOR_KEY = 'auranova-has-seen-reveal'

interface StarData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  brightnesses: Float32Array
  phases: Float32Array
  evolutionStatuses: Float32Array
  spawnDelays: Float32Array
  activations: Float32Array // 0 = skeleton/inactive, 1 = fully activated
}

/**
 * Generate skeleton star data for unauthenticated/loading states
 * Creates a pleasing arrangement that hints at the real visualization
 */
function generateSkeletonData(): StarData {
  const count = SKELETON_STAR_COUNT
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightnesses = new Float32Array(count)
  const phases = new Float32Array(count)
  const evolutionStatuses = new Float32Array(count)
  const spawnDelays = new Float32Array(count)
  const activations = new Float32Array(count)

  // Create a galaxy-like distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // Golden angle for spiral

  for (let i = 0; i < count; i++) {
    // Spiral galaxy distribution
    const t = i / count
    const radius = 5 + t * 25 // Inner to outer radius
    const angle = i * goldenAngle
    const height = (Math.random() - 0.5) * 8 * (1 - t * 0.5) // Thinner at edges

    positions[i * 3] = radius * Math.cos(angle)
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = radius * Math.sin(angle)

    // Muted blue-gray colors (cosmic but not personalized)
    const hue = 0.6 + Math.random() * 0.1 // Blue range
    const saturation = 0.2 + Math.random() * 0.2 // Low saturation
    const lightness = 0.4 + Math.random() * 0.2 // Medium brightness
    const color = new THREE.Color()
    color.setHSL(hue, saturation, lightness)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    // Uniform sizes for skeleton
    sizes[i] = 0.3 + Math.random() * 0.3
    brightnesses[i] = 0.4 + Math.random() * 0.3
    phases[i] = Math.random()
    evolutionStatuses[i] = 0 // stable
    spawnDelays[i] = (i / count) * 0.6 // Staggered spawn
    activations[i] = 0 // Start inactive
  }

  return { positions, colors, sizes, brightnesses, phases, evolutionStatuses, spawnDelays, activations }
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
    case 'new': return 1
    case 'fading': return 2
    case 'rising': return 3
    case 'falling': return 4
    case 'stable':
    default: return 0
  }
}

/**
 * Prepare star data from galaxy artists
 */
function prepareArtistData(artists: GalaxyArtist[]): StarData {
  const count = artists.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightnesses = new Float32Array(count)
  const phases = new Float32Array(count)
  const evolutionStatuses = new Float32Array(count)
  const spawnDelays = new Float32Array(count)
  const activations = new Float32Array(count)

  // Calculate spawn delays based on distance from center
  const distances: { index: number; dist: number }[] = []
  artists.forEach((artist, i) => {
    const dist = Math.sqrt(
      artist.position[0] ** 2 +
      artist.position[1] ** 2 +
      artist.position[2] ** 2
    )
    distances.push({ index: i, dist })
  })

  distances.sort((a, b) => a.dist - b.dist)
  const maxDelay = 0.6
  distances.forEach((item, sortIndex) => {
    spawnDelays[item.index] = (sortIndex / (count - 1 || 1)) * maxDelay
  })

  artists.forEach((artist, i) => {
    positions[i * 3] = artist.position[0]
    positions[i * 3 + 1] = artist.position[1]
    positions[i * 3 + 2] = artist.position[2]

    const rgb = hexToRgb(artist.color)
    colors[i * 3] = rgb[0]
    colors[i * 3 + 1] = rgb[1]
    colors[i * 3 + 2] = rgb[2]

    sizes[i] = artist.size
    brightnesses[i] = artist.brightness
    phases[i] = Math.random()
    evolutionStatuses[i] = evolutionToNumber(artist.evolutionStatus)
    activations[i] = 1 // Fully activated for real data
  })

  return { positions, colors, sizes, brightnesses, phases, evolutionStatuses, spawnDelays, activations }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Artist label shown on hover
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

            {displayGenres && (
              <p className="text-gray-400 text-xs truncate mt-0.5">{displayGenres}</p>
            )}

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
 * Hook for raycasting to find hovered/clicked star
 */
function useStarInteraction(
  artists: GalaxyArtist[],
  currentPositionsRef: React.RefObject<Float32Array | null>,
  onHover: (artistId: string | null) => void,
  onClick: (artistId: string | null) => void,
  enabled: boolean
) {
  const { camera, raycaster, pointer } = useThree()
  const previousHovered = useRef<string | null>(null)

  const handlePointerMove = useCallback(
    (_event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      const positions = currentPositionsRef.current
      if (!positions) return

      let closestDist = Infinity
      let closestIndex = -1
      const threshold = 1.5

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
    [artists, camera, raycaster, pointer, onHover, currentPositionsRef, enabled]
  )

  const handleClick = useCallback(
    (_event: ThreeEvent<MouseEvent>) => {
      if (!enabled) return
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
    [artists, camera, raycaster, pointer, onClick, currentPositionsRef, enabled]
  )

  return { handlePointerMove, handleClick }
}

/**
 * Unified Galaxy Stars component
 * Handles skeleton (unauthenticated), loading, revealing, and active states
 */
export function GalaxyStars(): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)

  // Store state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const isLoadingMusic = useMusicStore((state) => state.isLoading)
  const artists = galaxyData?.artists ?? []

  const hoveredArtistId = useUIStore((state) => state.hoveredArtistId)
  const setHoveredArtist = useUIStore((state) => state.setHoveredArtist)
  const selectArtist = useUIStore((state) => state.selectArtist)

  // Phase management - shared with CameraController via store
  const phase = useUIStore((state) => state.galaxyPhase)
  const setPhase = useUIStore((state) => state.setGalaxyPhase)
  const revealProgress = useUIStore((state) => state.revealProgress)
  const setRevealProgress = useUIStore((state) => state.setRevealProgress)
  const skipReveal = useUIStore((state) => state.skipReveal)
  const revealStartTimeRef = useRef<number | null>(null)
  const isReturnVisitor = useRef<boolean>(false)
  const revealDurationRef = useRef<number>(REVEAL_DURATION)

  // Accessibility: reduced motion support
  const prefersReducedMotion = useReducedMotion()

  // Data refs
  const skeletonDataRef = useRef<StarData | null>(null)
  const artistDataRef = useRef<StarData | null>(null)
  const currentPositionsRef = useRef<Float32Array | null>(null)

  // Check for return visitor on mount
  useEffect(() => {
    try {
      isReturnVisitor.current = localStorage.getItem(RETURN_VISITOR_KEY) === 'true'
    } catch {
      // localStorage not available
      isReturnVisitor.current = false
    }
  }, [])

  // Generate skeleton data on mount
  useEffect(() => {
    skeletonDataRef.current = generateSkeletonData()
  }, [])

  // Update phase based on auth and data state
  useEffect(() => {
    if (!isAuthenticated) {
      setPhase('skeleton')
      setRevealProgress(0)
      revealStartTimeRef.current = null
    } else if (isLoadingMusic) {
      setPhase('loading')
    } else if (artists.length > 0) {
      if (phase === 'loading' || phase === 'skeleton') {
        // Users who prefer reduced motion skip animation entirely
        if (prefersReducedMotion) {
          setPhase('active')
          setRevealProgress(1)
          artistDataRef.current = prepareArtistData(artists)
          return
        }
        // Set reveal duration based on visitor type
        // Return visitors get a quick transition, first-time visitors get full animation
        revealDurationRef.current = isReturnVisitor.current ? QUICK_REVEAL_DURATION : REVEAL_DURATION

        // Trigger reveal animation (both first-time and return visitors)
        setPhase('revealing')
        revealStartTimeRef.current = null // Will be set in animation frame
        artistDataRef.current = prepareArtistData(artists)
      } else if (phase === 'revealing' && revealProgress >= 1) {
        setPhase('active')
        // Mark as return visitor for next time
        try {
          localStorage.setItem(RETURN_VISITOR_KEY, 'true')
        } catch {
          // localStorage not available
        }
      }
    }
  }, [isAuthenticated, isLoadingMusic, artists.length, phase, revealProgress, prefersReducedMotion, setPhase, setRevealProgress])

  // Handle skip reveal trigger (from keyboard/touch input)
  useEffect(() => {
    if (skipReveal && phase === 'revealing') {
      setRevealProgress(1)
      setPhase('active')
      // Mark as return visitor
      try {
        localStorage.setItem(RETURN_VISITOR_KEY, 'true')
      } catch {
        // localStorage not available
      }
    }
  }, [skipReveal, phase, setPhase, setRevealProgress])

  // Update artist data when it changes
  useEffect(() => {
    if (artists.length > 0 && phase === 'active') {
      artistDataRef.current = prepareArtistData(artists)
    }
  }, [artists, phase])

  // Calculate max star count for geometry capacity
  const maxStarCount = useMemo(() => {
    const artistCount = artists.length
    return Math.max(SKELETON_STAR_COUNT, artistCount, 1)
  }, [artists.length])

  // Current star data based on phase - only changes on phase transitions, NOT during reveal
  // During reveal, we update geometry attributes directly in useFrame
  const currentStarData = useMemo((): StarData | null => {
    if (phase === 'skeleton' || phase === 'loading') {
      return skeletonDataRef.current
    }
    if (phase === 'revealing') {
      // Return skeleton data - we'll interpolate in useFrame
      // This prevents geometry recreation every frame
      return skeletonDataRef.current
    }
    if (phase === 'active' && artistDataRef.current) {
      return artistDataRef.current
    }
    return skeletonDataRef.current
  }, [phase]) // Note: revealProgress removed from deps!

  // Create geometry with max capacity - only recreate when phase changes (not during reveal)
  const geometry = useMemo(() => {
    if (!currentStarData) return null

    // Create geometry with enough capacity for all stars
    const count = phase === 'revealing' || phase === 'active' ? maxStarCount : SKELETON_STAR_COUNT

    const geo = new THREE.BufferGeometry()

    // Create buffer attributes with proper capacity
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const brightnesses = new Float32Array(count)
    const phases = new Float32Array(count)
    const evolutionStatuses = new Float32Array(count)
    const spawnDelays = new Float32Array(count)
    const activations = new Float32Array(count)

    // Copy current star data
    const copyCount = Math.min(count, currentStarData.positions.length / 3)
    for (let i = 0; i < copyCount; i++) {
      positions[i * 3] = currentStarData.positions[i * 3]
      positions[i * 3 + 1] = currentStarData.positions[i * 3 + 1]
      positions[i * 3 + 2] = currentStarData.positions[i * 3 + 2]
      colors[i * 3] = currentStarData.colors[i * 3]
      colors[i * 3 + 1] = currentStarData.colors[i * 3 + 1]
      colors[i * 3 + 2] = currentStarData.colors[i * 3 + 2]
      sizes[i] = currentStarData.sizes[i]
      brightnesses[i] = currentStarData.brightnesses[i]
      phases[i] = currentStarData.phases[i]
      evolutionStatuses[i] = currentStarData.evolutionStatuses[i]
      spawnDelays[i] = currentStarData.spawnDelays[i]
      activations[i] = currentStarData.activations[i]
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aEvolution', new THREE.BufferAttribute(evolutionStatuses, 1))
    geo.setAttribute('aSpawnDelay', new THREE.BufferAttribute(spawnDelays, 1))
    geo.setAttribute('aActivation', new THREE.BufferAttribute(activations, 1))

    // Set draw range to actual count
    geo.setDrawRange(0, copyCount)

    return geo
  }, [currentStarData, phase, maxStarCount])

  // Update current positions ref - ensure it has capacity for all artists
  useEffect(() => {
    // Use max capacity to ensure we can store all artist positions during reveal
    const capacity = maxStarCount * 3
    if (!currentPositionsRef.current || currentPositionsRef.current.length < capacity) {
      currentPositionsRef.current = new Float32Array(capacity)
    }
    // Copy initial data if available
    if (currentStarData) {
      const copyLength = Math.min(currentStarData.positions.length, capacity)
      for (let i = 0; i < copyLength; i++) {
        currentPositionsRef.current[i] = currentStarData.positions[i]
      }
    }
  }, [currentStarData, maxStarCount])

  // Shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBaseSize: { value: 10 },
        uGlowIntensity: { value: 0.8 },
        uOpacity: { value: 1 },
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioTreble: { value: 0 },
        uAudioAverage: { value: 0 },
        uTransitionProgress: { value: 1 },
        uSpawnProgress: { value: 0 },
        uPhase: { value: 0 }, // 0=skeleton, 1=loading, 2=revealing, 3=active
        uRevealProgress: { value: 0 },
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  // Spawn animation tracking
  const fadeStartTimeRef = useRef<number | null>(null)
  const hasStartedFade = useRef(false)
  const skipSpawnAnimation = useRef(false)
  const spawnDurationRef = useRef<number>(SPAWN_DURATION)

  useEffect(() => {
    if (currentStarData && !hasStartedFade.current) {
      hasStartedFade.current = true
      // Skip spawn animation only for reduced motion preference
      skipSpawnAnimation.current = prefersReducedMotion
      // Use faster spawn for return visitors
      spawnDurationRef.current = isReturnVisitor.current ? 0.5 : SPAWN_DURATION
    }
  }, [currentStarData, prefersReducedMotion])

  // Interaction handlers
  const { handlePointerMove, handleClick } = useStarInteraction(
    artists,
    currentPositionsRef,
    setHoveredArtist,
    selectArtist,
    phase === 'active'
  )

  // Audio analyzer
  const { bassRef, midRef, trebleRef, averageRef } = useAudioAnalyzer()

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

      // Audio uniforms (only when active)
      if (phase === 'active') {
        materialRef.current.uniforms.uAudioBass.value = bassRef.current
        materialRef.current.uniforms.uAudioMid.value = midRef.current
        materialRef.current.uniforms.uAudioTreble.value = trebleRef.current
        materialRef.current.uniforms.uAudioAverage.value = averageRef.current
      } else {
        // Gentle pulse for skeleton/loading
        const pulse = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
        materialRef.current.uniforms.uAudioAverage.value = phase === 'loading' ? 0.15 + pulse : 0
      }

      // Spawn animation (skip for reduced motion, faster for return visitors)
      if (hasStartedFade.current) {
        if (skipSpawnAnimation.current) {
          // Instantly show all stars for reduced motion preference
          materialRef.current.uniforms.uSpawnProgress.value = 1
        } else {
          if (fadeStartTimeRef.current === null) {
            fadeStartTimeRef.current = state.clock.elapsedTime
          }
          const elapsed = state.clock.elapsedTime - fadeStartTimeRef.current
          const spawnProgress = Math.min(elapsed / spawnDurationRef.current, 1)
          materialRef.current.uniforms.uSpawnProgress.value = spawnProgress
        }
      }

      // Phase uniform
      const phaseValue = { skeleton: 0, loading: 1, revealing: 2, active: 3 }[phase]
      materialRef.current.uniforms.uPhase.value = phaseValue

      // Reveal animation
      if (phase === 'revealing') {
        if (revealStartTimeRef.current === null) {
          revealStartTimeRef.current = state.clock.elapsedTime
        }
        const elapsed = state.clock.elapsedTime - revealStartTimeRef.current
        const progress = Math.min(elapsed / revealDurationRef.current, 1)
        setRevealProgress(progress)
        materialRef.current.uniforms.uRevealProgress.value = progress
      }
    }

    // Update geometry during reveal transition - interpolate between skeleton and artist data
    if (geometryRef.current && phase === 'revealing' && skeletonDataRef.current && artistDataRef.current) {
      const skeleton = skeletonDataRef.current
      const artist = artistDataRef.current

      const posAttr = geometryRef.current.getAttribute('position')
      const colorAttr = geometryRef.current.getAttribute('aColor')
      const sizeAttr = geometryRef.current.getAttribute('aSize')
      const brightnessAttr = geometryRef.current.getAttribute('aBrightness')
      const activationAttr = geometryRef.current.getAttribute('aActivation')
      const evolutionAttr = geometryRef.current.getAttribute('aEvolution')
      const spawnDelayAttr = geometryRef.current.getAttribute('aSpawnDelay')

      if (posAttr && colorAttr && sizeAttr && brightnessAttr && activationAttr) {
        const artistCount = artist.positions.length / 3
        const skeletonCount = skeleton.positions.length / 3
        const maxCount = Math.max(artistCount, skeletonCount)

        // Use current revealProgress from store for interpolation
        const easedProgress = easeOutCubic(revealProgress)

        for (let i = 0; i < maxCount; i++) {
          const hasArtist = i < artistCount
          const hasSkeleton = i < skeletonCount

          if (hasArtist && hasSkeleton) {
            // Interpolate between skeleton and artist
            for (let j = 0; j < 3; j++) {
              const skeletonVal = skeleton.positions[i * 3 + j]
              const artistVal = artist.positions[i * 3 + j]
              ;(posAttr.array as Float32Array)[i * 3 + j] = skeletonVal + (artistVal - skeletonVal) * easedProgress

              const skeletonColor = skeleton.colors[i * 3 + j]
              const artistColor = artist.colors[i * 3 + j]
              ;(colorAttr.array as Float32Array)[i * 3 + j] = skeletonColor + (artistColor - skeletonColor) * easedProgress
            }
            ;(sizeAttr.array as Float32Array)[i] = skeleton.sizes[i] + (artist.sizes[i] - skeleton.sizes[i]) * easedProgress
            ;(brightnessAttr.array as Float32Array)[i] = skeleton.brightnesses[i] + (artist.brightnesses[i] - skeleton.brightnesses[i]) * easedProgress
            ;(activationAttr.array as Float32Array)[i] = easedProgress
            if (evolutionAttr) (evolutionAttr.array as Float32Array)[i] = artist.evolutionStatuses[i]
            if (spawnDelayAttr) (spawnDelayAttr.array as Float32Array)[i] = artist.spawnDelays[i]
          } else if (hasArtist) {
            // New artist appearing from center
            for (let j = 0; j < 3; j++) {
              ;(posAttr.array as Float32Array)[i * 3 + j] = artist.positions[i * 3 + j] * easedProgress
              ;(colorAttr.array as Float32Array)[i * 3 + j] = artist.colors[i * 3 + j]
            }
            ;(sizeAttr.array as Float32Array)[i] = artist.sizes[i] * easedProgress
            ;(brightnessAttr.array as Float32Array)[i] = artist.brightnesses[i] * easedProgress
            ;(activationAttr.array as Float32Array)[i] = easedProgress
            if (evolutionAttr) (evolutionAttr.array as Float32Array)[i] = artist.evolutionStatuses[i]
            if (spawnDelayAttr) (spawnDelayAttr.array as Float32Array)[i] = artist.spawnDelays[i]
          } else if (hasSkeleton) {
            // Skeleton star fading out
            const fadeOut = 1 - easedProgress
            for (let j = 0; j < 3; j++) {
              ;(posAttr.array as Float32Array)[i * 3 + j] = skeleton.positions[i * 3 + j]
              ;(colorAttr.array as Float32Array)[i * 3 + j] = skeleton.colors[i * 3 + j]
            }
            ;(sizeAttr.array as Float32Array)[i] = skeleton.sizes[i] * fadeOut
            ;(brightnessAttr.array as Float32Array)[i] = skeleton.brightnesses[i] * fadeOut
            ;(activationAttr.array as Float32Array)[i] = 1 - easedProgress
          }
        }

        posAttr.needsUpdate = true
        colorAttr.needsUpdate = true
        sizeAttr.needsUpdate = true
        brightnessAttr.needsUpdate = true
        activationAttr.needsUpdate = true
        if (evolutionAttr) evolutionAttr.needsUpdate = true
        if (spawnDelayAttr) spawnDelayAttr.needsUpdate = true

        // Update draw range to include all stars
        geometryRef.current.setDrawRange(0, maxCount)

        // Update positions ref for interactions (use interpolated artist positions for click detection)
        if (currentPositionsRef.current && artistCount > 0) {
          const positionsToUse = posAttr.array as Float32Array
          for (let i = 0; i < artistCount * 3; i++) {
            currentPositionsRef.current[i] = positionsToUse[i]
          }
        }
      }
    }

    // When transitioning from revealing to active, update geometry with final artist data
    if (geometryRef.current && phase === 'active' && artistDataRef.current) {
      const artist = artistDataRef.current
      const artistCount = artist.positions.length / 3
      const posAttr = geometryRef.current.getAttribute('position')

      // Check if geometry has enough capacity for all artists
      // If not, skip update - React will create new geometry with proper capacity on next render
      const geometryCapacity = posAttr ? (posAttr.array as Float32Array).length / 3 : 0
      if (geometryCapacity < artistCount) {
        // Geometry doesn't have enough capacity, skip update
        return
      }

      // Only update once when transitioning to active
      const needsUpdate = geometryRef.current.userData.lastPhase !== 'active'
      geometryRef.current.userData.lastPhase = 'active'

      if (needsUpdate) {
        const colorAttr = geometryRef.current.getAttribute('aColor')
        const sizeAttr = geometryRef.current.getAttribute('aSize')
        const brightnessAttr = geometryRef.current.getAttribute('aBrightness')
        const activationAttr = geometryRef.current.getAttribute('aActivation')
        const evolutionAttr = geometryRef.current.getAttribute('aEvolution')
        const spawnDelayAttr = geometryRef.current.getAttribute('aSpawnDelay')

        for (let i = 0; i < artistCount; i++) {
          for (let j = 0; j < 3; j++) {
            ;(posAttr.array as Float32Array)[i * 3 + j] = artist.positions[i * 3 + j]
            ;(colorAttr.array as Float32Array)[i * 3 + j] = artist.colors[i * 3 + j]
          }
          ;(sizeAttr.array as Float32Array)[i] = artist.sizes[i]
          ;(brightnessAttr.array as Float32Array)[i] = artist.brightnesses[i]
          ;(activationAttr.array as Float32Array)[i] = 1
          if (evolutionAttr) (evolutionAttr.array as Float32Array)[i] = artist.evolutionStatuses[i]
          if (spawnDelayAttr) (spawnDelayAttr.array as Float32Array)[i] = artist.spawnDelays[i]
        }

        posAttr.needsUpdate = true
        colorAttr.needsUpdate = true
        sizeAttr.needsUpdate = true
        brightnessAttr.needsUpdate = true
        activationAttr.needsUpdate = true
        if (evolutionAttr) evolutionAttr.needsUpdate = true
        if (spawnDelayAttr) spawnDelayAttr.needsUpdate = true

        geometryRef.current.setDrawRange(0, artistCount)

        // Update positions ref for interactions
        if (currentPositionsRef.current) {
          for (let i = 0; i < artistCount * 3; i++) {
            currentPositionsRef.current[i] = artist.positions[i]
          }
        }
      }
    }
  })

  // Get hovered artist
  const hoveredArtist = useMemo(() => {
    if (!hoveredArtistId || phase !== 'active') return null
    return artists.find((a) => a.id === hoveredArtistId) ?? null
  }, [hoveredArtistId, artists, phase])

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

  if (!geometry) {
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
        <primitive object={shaderMaterial} ref={materialRef} attach="material" />
      </points>

      {/* Hover label (only in active phase) */}
      {hoveredArtist && hoveredArtistPosition && phase === 'active' && (
        <ArtistLabel artist={hoveredArtist} position={hoveredArtistPosition} />
      )}
    </group>
  )
}
