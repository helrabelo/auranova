import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useReducedMotion } from '@/hooks'
import type { GalaxyArtist } from '@/types/domain'

// Import shaders
import planetVertexShader from '@/shaders/planet.vert?raw'
import planetFragmentShader from '@/shaders/planet.frag?raw'

const SPAWN_DURATION = 3.0
const REVEAL_DURATION = 2.5
const QUICK_REVEAL_DURATION = 0.4
const SKELETON_STAR_COUNT = 50
const RETURN_VISITOR_KEY = 'auranova-has-seen-reveal'
const SPHERE_SEGMENTS = 24 // Balance between quality and performance

interface PlanetData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  seeds: Float32Array
  activations: Float32Array
  spawnProgress: Float32Array
}

/**
 * Generate skeleton planet data
 */
function generateSkeletonData(): PlanetData {
  const count = SKELETON_STAR_COUNT
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const activations = new Float32Array(count)
  const spawnProgress = new Float32Array(count)

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const t = i / count
    const radius = 5 + t * 25
    const angle = i * goldenAngle
    const height = (Math.random() - 0.5) * 8 * (1 - t * 0.5)

    positions[i * 3] = radius * Math.cos(angle)
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = radius * Math.sin(angle)

    // Muted blue-gray colors
    const color = new THREE.Color()
    color.setHSL(0.6 + Math.random() * 0.1, 0.2 + Math.random() * 0.2, 0.4 + Math.random() * 0.2)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    // Match planet sizes: sm=0.4, md=0.6, lg=0.9
    const sizeRoll = Math.random()
    sizes[i] = sizeRoll < 0.33 ? 0.4 : sizeRoll < 0.66 ? 0.6 : 0.9
    seeds[i] = Math.random()
    activations[i] = 0
    spawnProgress[i] = 0
  }

  return { positions, colors, sizes, seeds, activations, spawnProgress }
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const color = new THREE.Color(hex)
  return [color.r, color.g, color.b]
}

/**
 * Generate a seed from artist ID
 */
function artistIdToSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) / 2147483647
}

/**
 * Prepare planet data from artists
 */
function prepareArtistData(artists: GalaxyArtist[]): PlanetData {
  const count = artists.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const activations = new Float32Array(count)
  const spawnProgress = new Float32Array(count)

  artists.forEach((artist, i) => {
    positions[i * 3] = artist.position[0]
    positions[i * 3 + 1] = artist.position[1]
    positions[i * 3 + 2] = artist.position[2]

    const rgb = hexToRgb(artist.color)
    colors[i * 3] = rgb[0]
    colors[i * 3 + 1] = rgb[1]
    colors[i * 3 + 2] = rgb[2]

    sizes[i] = artist.size
    seeds[i] = artistIdToSeed(artist.id)
    activations[i] = 1
    spawnProgress[i] = 1
  })

  return { positions, colors, sizes, seeds, activations, spawnProgress }
}

/**
 * Artist label on hover
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Get initials from artist name (1-2 characters)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    // Single word: take first 1-2 characters
    return words[0].substring(0, 2).toUpperCase()
  }
  // Multiple words: take first letter of first two words
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase()
}

/**
 * Floating initials above each planet
 */
function PlanetInitials({
  artists,
  positions,
  sizes,
  phase,
}: {
  artists: GalaxyArtist[]
  positions: Float32Array | null
  sizes: Float32Array | null
  phase: string
}): React.JSX.Element | null {
  if (phase !== 'active' || !positions || !sizes) return null

  return (
    <>
      {artists.slice(0, 100).map((artist, i) => {
        const x = positions[i * 3]
        const y = positions[i * 3 + 1]
        const z = positions[i * 3 + 2]
        const size = sizes[i] || 0.5
        const initials = getInitials(artist.name)

        return (
          <Html
            key={artist.id}
            position={[x, y + size + 0.3, z]}
            center
            style={{ pointerEvents: 'none' }}
            zIndexRange={[0, 10]}
          >
            <div
              className="text-white font-bold text-xs opacity-80 select-none"
              style={{
                textShadow: `0 0 4px ${artist.color}, 0 0 8px ${artist.color}`,
                fontSize: '10px',
              }}
            >
              {initials}
            </div>
          </Html>
        )
      })}
    </>
  )
}

/**
 * Planet-based Galaxy Stars component
 * Uses instanced sphere meshes for 3D planet-like appearance
 */
export function PlanetStars(): React.JSX.Element | null {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const hitMeshRef = useRef<THREE.InstancedMesh>(null) // Invisible mesh for hit detection
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Store state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const isLoadingMusic = useMusicStore((state) => state.isLoading)
  const artists = galaxyData?.artists ?? []

  const hoveredArtistId = useUIStore((state) => state.hoveredArtistId)
  const setHoveredArtist = useUIStore((state) => state.setHoveredArtist)
  const selectArtist = useUIStore((state) => state.selectArtist)

  // Phase management
  const phase = useUIStore((state) => state.galaxyPhase)
  const setPhase = useUIStore((state) => state.setGalaxyPhase)
  const revealProgress = useUIStore((state) => state.revealProgress)
  const setRevealProgress = useUIStore((state) => state.setRevealProgress)
  const revealStartTimeRef = useRef<number | null>(null)
  const isReturnVisitor = useRef<boolean>(false)
  const revealDurationRef = useRef<number>(REVEAL_DURATION)

  const prefersReducedMotion = useReducedMotion()

  // Data refs
  const skeletonDataRef = useRef<PlanetData | null>(null)
  const artistDataRef = useRef<PlanetData | null>(null)
  const currentPositionsRef = useRef<Float32Array | null>(null)
  const currentSizesRef = useRef<Float32Array | null>(null)

  // Check return visitor
  useEffect(() => {
    try {
      isReturnVisitor.current = localStorage.getItem(RETURN_VISITOR_KEY) === 'true'
    } catch {
      isReturnVisitor.current = false
    }
  }, [])

  // Generate skeleton data
  useEffect(() => {
    skeletonDataRef.current = generateSkeletonData()
  }, [])

  // Phase management
  useEffect(() => {
    if (!isAuthenticated) {
      setPhase('skeleton')
      setRevealProgress(0)
      revealStartTimeRef.current = null
    } else if (isLoadingMusic) {
      setPhase('loading')
    } else if (artists.length > 0) {
      if (phase === 'loading' || phase === 'skeleton') {
        if (prefersReducedMotion) {
          setPhase('active')
          setRevealProgress(1)
          artistDataRef.current = prepareArtistData(artists)
          return
        }
        revealDurationRef.current = isReturnVisitor.current ? QUICK_REVEAL_DURATION : REVEAL_DURATION
        setPhase('revealing')
        revealStartTimeRef.current = null
        artistDataRef.current = prepareArtistData(artists)
      } else if (phase === 'revealing' && revealProgress >= 1) {
        setPhase('active')
        try {
          localStorage.setItem(RETURN_VISITOR_KEY, 'true')
        } catch {}
      }
    }
  }, [isAuthenticated, isLoadingMusic, artists.length, phase, revealProgress, prefersReducedMotion, setPhase, setRevealProgress])

  // Update artist data when it changes
  useEffect(() => {
    if (artists.length > 0 && phase === 'active') {
      artistDataRef.current = prepareArtistData(artists)
    }
  }, [artists, phase])

  // Calculate max count
  const maxCount = useMemo(() => {
    return Math.max(SKELETON_STAR_COUNT, artists.length, 1)
  }, [artists.length])

  // Create sphere geometry
  const sphereGeometry = useMemo(() => {
    return new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
  }, [])

  // Simple hit detection geometry (lower poly for performance)
  const hitGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 8, 8)
    // Set large bounding sphere for raycasting to work across all instances
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100)
    return geo
  }, [])

  // Invisible material for hit detection
  const hitMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      visible: false,
      transparent: true,
      opacity: 0,
    })
  }, [])

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGlowIntensity: { value: 0.8 },
        uLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      },
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      transparent: true,
      side: THREE.FrontSide,
    })
  }, [])

  // Initialize instance attributes
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current

    // Create instance attributes
    const instanceColors = new Float32Array(maxCount * 3)
    const instanceSizes = new Float32Array(maxCount)
    const instanceSeeds = new Float32Array(maxCount)
    const instanceActivations = new Float32Array(maxCount)
    const instanceSpawnProgress = new Float32Array(maxCount)

    mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(instanceColors, 3))
    mesh.geometry.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(instanceSizes, 1))
    mesh.geometry.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(instanceSeeds, 1))
    mesh.geometry.setAttribute('instanceActivation', new THREE.InstancedBufferAttribute(instanceActivations, 1))
    mesh.geometry.setAttribute('instanceSpawnProgress', new THREE.InstancedBufferAttribute(instanceSpawnProgress, 1))

    // Initialize positions and sizes refs
    currentPositionsRef.current = new Float32Array(maxCount * 3)
    currentSizesRef.current = new Float32Array(maxCount)
  }, [maxCount])

  // Spawn animation tracking
  const spawnStartTimeRef = useRef<number | null>(null)
  const spawnDurationRef = useRef<number>(SPAWN_DURATION)

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return

    const mesh = meshRef.current
    const currentData = phase === 'active' ? artistDataRef.current :
                        phase === 'revealing' ? skeletonDataRef.current :
                        skeletonDataRef.current

    if (!currentData) return

    // Update time uniform
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

    // Handle reveal animation
    if (phase === 'revealing') {
      if (revealStartTimeRef.current === null) {
        revealStartTimeRef.current = state.clock.elapsedTime
        spawnStartTimeRef.current = state.clock.elapsedTime
        spawnDurationRef.current = isReturnVisitor.current ? 0.5 : SPAWN_DURATION
      }
      const elapsed = state.clock.elapsedTime - revealStartTimeRef.current
      const progress = Math.min(elapsed / revealDurationRef.current, 1)
      setRevealProgress(progress)
    }

    // Calculate spawn progress
    let globalSpawnProgress = 1
    if (spawnStartTimeRef.current !== null) {
      const spawnElapsed = state.clock.elapsedTime - spawnStartTimeRef.current
      globalSpawnProgress = Math.min(spawnElapsed / spawnDurationRef.current, 1)
    }

    // Get attributes
    const colorAttr = mesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute
    const sizeAttr = mesh.geometry.getAttribute('instanceSize') as THREE.InstancedBufferAttribute
    const seedAttr = mesh.geometry.getAttribute('instanceSeed') as THREE.InstancedBufferAttribute
    const activationAttr = mesh.geometry.getAttribute('instanceActivation') as THREE.InstancedBufferAttribute
    const spawnProgressAttr = mesh.geometry.getAttribute('instanceSpawnProgress') as THREE.InstancedBufferAttribute

    if (!colorAttr || !sizeAttr) return

    const skeleton = skeletonDataRef.current
    const artist = artistDataRef.current
    const easedProgress = easeOutCubic(revealProgress)

    const dummy = new THREE.Object3D()
    const artistCount = artist?.positions.length ? artist.positions.length / 3 : 0
    const skeletonCount = skeleton?.positions.length ? skeleton.positions.length / 3 : 0
    const activeCount = phase === 'active' ? artistCount :
                        phase === 'revealing' ? Math.max(artistCount, skeletonCount) :
                        skeletonCount

    for (let i = 0; i < activeCount; i++) {
      let x = 0, y = 0, z = 0
      let r = 0.5, g = 0.5, b = 0.5
      let size = 0.5
      let seed = 0
      let activation = 0
      let spawnProg = globalSpawnProgress

      if (phase === 'revealing' && skeleton && artist) {
        const hasArtist = i < artistCount
        const hasSkeleton = i < skeletonCount

        if (hasArtist && hasSkeleton) {
          x = skeleton.positions[i * 3] + (artist.positions[i * 3] - skeleton.positions[i * 3]) * easedProgress
          y = skeleton.positions[i * 3 + 1] + (artist.positions[i * 3 + 1] - skeleton.positions[i * 3 + 1]) * easedProgress
          z = skeleton.positions[i * 3 + 2] + (artist.positions[i * 3 + 2] - skeleton.positions[i * 3 + 2]) * easedProgress
          r = skeleton.colors[i * 3] + (artist.colors[i * 3] - skeleton.colors[i * 3]) * easedProgress
          g = skeleton.colors[i * 3 + 1] + (artist.colors[i * 3 + 1] - skeleton.colors[i * 3 + 1]) * easedProgress
          b = skeleton.colors[i * 3 + 2] + (artist.colors[i * 3 + 2] - skeleton.colors[i * 3 + 2]) * easedProgress
          size = skeleton.sizes[i] + (artist.sizes[i] - skeleton.sizes[i]) * easedProgress
          seed = artist.seeds[i]
          activation = easedProgress
        } else if (hasArtist) {
          x = artist.positions[i * 3] * easedProgress
          y = artist.positions[i * 3 + 1] * easedProgress
          z = artist.positions[i * 3 + 2] * easedProgress
          r = artist.colors[i * 3]
          g = artist.colors[i * 3 + 1]
          b = artist.colors[i * 3 + 2]
          size = artist.sizes[i] * easedProgress
          seed = artist.seeds[i]
          activation = easedProgress
        } else if (hasSkeleton) {
          x = skeleton.positions[i * 3]
          y = skeleton.positions[i * 3 + 1]
          z = skeleton.positions[i * 3 + 2]
          r = skeleton.colors[i * 3]
          g = skeleton.colors[i * 3 + 1]
          b = skeleton.colors[i * 3 + 2]
          size = skeleton.sizes[i] * (1 - easedProgress)
          seed = skeleton.seeds[i]
          activation = 1 - easedProgress
        }
      } else if (phase === 'active' && artist && i < artistCount) {
        x = artist.positions[i * 3]
        y = artist.positions[i * 3 + 1]
        z = artist.positions[i * 3 + 2]
        r = artist.colors[i * 3]
        g = artist.colors[i * 3 + 1]
        b = artist.colors[i * 3 + 2]
        size = artist.sizes[i]
        seed = artist.seeds[i]
        activation = 1
      } else if (skeleton && i < skeletonCount) {
        x = skeleton.positions[i * 3]
        y = skeleton.positions[i * 3 + 1]
        z = skeleton.positions[i * 3 + 2]
        r = skeleton.colors[i * 3]
        g = skeleton.colors[i * 3 + 1]
        b = skeleton.colors[i * 3 + 2]
        size = skeleton.sizes[i]
        seed = skeleton.seeds[i]
        activation = 0.5
      }

      // Update instance matrix for visual mesh
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(size)
      dummy.rotation.y = state.clock.elapsedTime * 0.1 + seed * Math.PI * 2 // Slow rotation
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // Sync hit mesh for interaction (larger hit area for easier clicking)
      if (hitMeshRef.current) {
        dummy.scale.setScalar(size * 2) // Larger hit area
        dummy.updateMatrix()
        hitMeshRef.current.setMatrixAt(i, dummy.matrix)
      }

      // Update attributes
      colorAttr.setXYZ(i, r, g, b)
      sizeAttr.setX(i, size)
      seedAttr.setX(i, seed)
      activationAttr.setX(i, activation)
      spawnProgressAttr.setX(i, spawnProg)

      // Store position and size for raycasting and labels
      if (currentPositionsRef.current) {
        currentPositionsRef.current[i * 3] = x
        currentPositionsRef.current[i * 3 + 1] = y
        currentPositionsRef.current[i * 3 + 2] = z
      }
      if (currentSizesRef.current) {
        currentSizesRef.current[i] = size
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    seedAttr.needsUpdate = true
    activationAttr.needsUpdate = true
    spawnProgressAttr.needsUpdate = true
    mesh.count = activeCount

    // Update hit mesh
    if (hitMeshRef.current) {
      hitMeshRef.current.instanceMatrix.needsUpdate = true
      hitMeshRef.current.count = activeCount
    }
  })

  // Interaction handlers - use instanceId from R3F events directly
  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (phase !== 'active') return
      event.stopPropagation()

      const instanceId = event.instanceId
      if (instanceId !== undefined && instanceId < artists.length) {
        setHoveredArtist(artists[instanceId].id)
        // Change cursor to pointer
        document.body.style.cursor = 'pointer'
      }
    },
    [artists, setHoveredArtist, phase]
  )

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      setHoveredArtist(null)
      document.body.style.cursor = 'auto'
    },
    [setHoveredArtist]
  )

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (phase !== 'active') return
      event.stopPropagation()

      const instanceId = event.instanceId
      if (instanceId !== undefined && instanceId < artists.length) {
        selectArtist(artists[instanceId].id)
      }
    },
    [artists, selectArtist, phase]
  )

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

  return (
    <group>
      {/* Visual planet mesh with custom shader */}
      <instancedMesh
        ref={meshRef}
        args={[sphereGeometry, shaderMaterial, maxCount]}
        frustumCulled={false}
      >
        <primitive object={shaderMaterial} ref={materialRef} attach="material" />
      </instancedMesh>

      {/* Invisible hit mesh for interaction detection */}
      <instancedMesh
        ref={hitMeshRef}
        args={[hitGeometry, hitMaterial, maxCount]}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />

      {/* Artist initials floating above planets */}
      <PlanetInitials
        artists={artists}
        positions={currentPositionsRef.current}
        sizes={currentSizesRef.current}
        phase={phase}
      />

      {hoveredArtist && hoveredArtistPosition && phase === 'active' && (
        <ArtistLabel artist={hoveredArtist} position={hoveredArtistPosition} />
      )}
    </group>
  )
}
