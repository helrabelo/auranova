import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import { useAudioAnalyzer } from '@/audio'
import type { GalaxyArtist } from '@/types/domain'

// Import shaders as raw text
import starVertexShader from '@/shaders/star.vert?raw'
import starFragmentShader from '@/shaders/star.frag?raw'

const FADE_IN_DURATION = 2.0 // seconds

interface StarData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  brightnesses: Float32Array
  phases: Float32Array
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const color = new THREE.Color(hex)
  return [color.r, color.g, color.b]
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
  })

  return { positions, colors, sizes, brightnesses, phases }
}

/**
 * Custom hook for raycasting to find hovered/clicked star
 */
function useStarInteraction(
  artists: GalaxyArtist[],
  onHover: (artistId: string | null) => void,
  onClick: (artistId: string | null) => void
) {
  const { camera, raycaster, pointer } = useThree()
  const previousHovered = useRef<string | null>(null)

  const handlePointerMove = useCallback(
    (_event: ThreeEvent<PointerEvent>) => {
      const positions = artists.map((a) => new THREE.Vector3(...a.position))

      // Find closest point within threshold
      let closestDist = Infinity
      let closestIndex = -1
      const threshold = 1.5 // Distance threshold for hover

      raycaster.setFromCamera(pointer, camera)

      positions.forEach((pos, index) => {
        const dist = raycaster.ray.distanceToPoint(pos)
        if (dist < threshold && dist < closestDist) {
          closestDist = dist
          closestIndex = index
        }
      })

      const hoveredId = closestIndex >= 0 ? artists[closestIndex].id : null

      if (hoveredId !== previousHovered.current) {
        previousHovered.current = hoveredId
        onHover(hoveredId)
      }
    },
    [artists, camera, raycaster, pointer, onHover]
  )

  const handleClick = useCallback(
    (_event: ThreeEvent<MouseEvent>) => {
      const positions = artists.map((a) => new THREE.Vector3(...a.position))

      raycaster.setFromCamera(pointer, camera)

      let closestDist = Infinity
      let closestIndex = -1
      const threshold = 1.5

      positions.forEach((pos, index) => {
        const dist = raycaster.ray.distanceToPoint(pos)
        if (dist < threshold && dist < closestDist) {
          closestDist = dist
          closestIndex = index
        }
      })

      const clickedId = closestIndex >= 0 ? artists[closestIndex].id : null
      onClick(clickedId)
    },
    [artists, camera, raycaster, pointer, onClick]
  )

  return { handlePointerMove, handleClick }
}

/**
 * Artist label shown on hover
 */
function ArtistLabel({ artist }: { artist: GalaxyArtist }): React.JSX.Element {
  return (
    <Html
      position={artist.position}
      center
      style={{
        pointerEvents: 'none',
        transform: 'translateY(-30px)',
      }}
    >
      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 whitespace-nowrap">
        <p className="text-white text-sm font-medium">{artist.name}</p>
        {artist.genres.length > 0 && (
          <p className="text-gray-400 text-xs">{artist.genres[0]}</p>
        )}
      </div>
    </Html>
  )
}

/**
 * Main artist stars component using instanced points
 */
export function ArtistStars(): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Get data from stores
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const artists = galaxyData?.artists ?? []

  const hoveredArtistId = useUIStore((state) => state.hoveredArtistId)
  const setHoveredArtist = useUIStore((state) => state.setHoveredArtist)
  const selectArtist = useUIStore((state) => state.selectArtist)

  // Prepare star data
  const starData = useMemo(() => {
    if (artists.length === 0) return null
    return prepareStarData(artists)
  }, [artists])

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
    return geo
  }, [starData])

  // Fade-in animation state - we use a ref to track when animation should start
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
        uOpacity: { value: 0 }, // Start invisible for fade-in
        // Audio reactive uniforms
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioTreble: { value: 0 },
        uAudioAverage: { value: 0 },
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
      // fadeStartTimeRef will be set in the first frame
    }
  }, [artists.length])

  // Interaction handlers
  const { handlePointerMove, handleClick } = useStarInteraction(
    artists,
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

      // Fade-in animation
      if (hasStartedFade.current) {
        // Initialize start time on first frame
        if (fadeStartTimeRef.current === null) {
          fadeStartTimeRef.current = state.clock.elapsedTime
        }

        const elapsed = state.clock.elapsedTime - fadeStartTimeRef.current
        const progress = Math.min(elapsed / FADE_IN_DURATION, 1)
        // Ease out cubic for smooth fade
        const opacity = 1 - Math.pow(1 - progress, 3)
        materialRef.current.uniforms.uOpacity.value = opacity
      }
    }
  })

  // Get hovered artist
  const hoveredArtist = useMemo(() => {
    if (!hoveredArtistId) return null
    return artists.find((a) => a.id === hoveredArtistId) ?? null
  }, [hoveredArtistId, artists])

  // Don't render if no data
  if (!geometry || artists.length === 0) {
    return null
  }

  return (
    <group>
      <points
        ref={pointsRef}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        geometry={geometry}
        material={shaderMaterial}
      >
        <primitive
          object={shaderMaterial}
          ref={materialRef}
          attach="material"
        />
      </points>

      {/* Hover label */}
      {hoveredArtist && <ArtistLabel artist={hoveredArtist} />}
    </group>
  )
}
