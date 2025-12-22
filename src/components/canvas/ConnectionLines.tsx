import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useUIStore } from '@/stores/uiStore'

// Import shaders
import connectionVertexShader from '@/shaders/connection.vert?raw'
import connectionFragmentShader from '@/shaders/connection.frag?raw'

interface LineData {
  positions: Float32Array
  colors: Float32Array
  alphas: Float32Array
}

/**
 * Prepares line data from artist connections
 * Each line is a pair of vertices (start and end)
 */
function prepareLineData(
  connections: { source: string; target: string; strength: number }[],
  artistMap: Map<string, { position: [number, number, number]; color: string }>
): LineData | null {
  const validConnections = connections.filter(
    (c) => artistMap.has(c.source) && artistMap.has(c.target)
  )

  if (validConnections.length === 0) return null

  const count = validConnections.length * 2 // 2 vertices per line
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const alphas = new Float32Array(count)

  validConnections.forEach((conn, i) => {
    const sourceArtist = artistMap.get(conn.source)!
    const targetArtist = artistMap.get(conn.target)!

    const idx = i * 2

    // Start vertex
    positions[idx * 3] = sourceArtist.position[0]
    positions[idx * 3 + 1] = sourceArtist.position[1]
    positions[idx * 3 + 2] = sourceArtist.position[2]

    // End vertex
    positions[(idx + 1) * 3] = targetArtist.position[0]
    positions[(idx + 1) * 3 + 1] = targetArtist.position[1]
    positions[(idx + 1) * 3 + 2] = targetArtist.position[2]

    // Parse colors
    const sourceColor = new THREE.Color(sourceArtist.color)
    const targetColor = new THREE.Color(targetArtist.color)

    colors[idx * 3] = sourceColor.r
    colors[idx * 3 + 1] = sourceColor.g
    colors[idx * 3 + 2] = sourceColor.b

    colors[(idx + 1) * 3] = targetColor.r
    colors[(idx + 1) * 3 + 1] = targetColor.g
    colors[(idx + 1) * 3 + 2] = targetColor.b

    // Alpha based on connection strength
    const alpha = conn.strength * 0.4 // Max 40% opacity
    alphas[idx] = alpha
    alphas[idx + 1] = alpha
  })

  return { positions, colors, alphas }
}

/**
 * Connection lines between related artists
 * Uses custom shaders for gradient coloring and animated pulse
 */
export function ConnectionLines(): React.JSX.Element | null {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Get data from stores
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const selectedArtistId = useUIStore((state) => state.selection.artistId)

  // Build artist position map
  const artistMap = useMemo(() => {
    if (!galaxyData) return new Map()
    const map = new Map<
      string,
      { position: [number, number, number]; color: string }
    >()
    galaxyData.artists.forEach((a) => {
      map.set(a.id, { position: a.position, color: a.color })
    })
    return map
  }, [galaxyData])

  // Filter connections - show all or only connected to selected
  const filteredConnections = useMemo(() => {
    if (!galaxyData) return []

    // If an artist is selected, only show their connections
    if (selectedArtistId) {
      return galaxyData.connections.filter(
        (c) => c.source === selectedArtistId || c.target === selectedArtistId
      )
    }

    // Show top connections (by strength) to avoid visual clutter
    return galaxyData.connections
      .filter((c) => c.strength > 0.3) // Only stronger connections
      .slice(0, 100) // Limit for performance
  }, [galaxyData, selectedArtistId])

  // Prepare line geometry data
  const lineData = useMemo(() => {
    return prepareLineData(filteredConnections, artistMap)
  }, [filteredConnections, artistMap])

  // Create geometry
  const geometry = useMemo(() => {
    if (!lineData) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(lineData.positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(lineData.colors, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(lineData.alphas, 1))
    return geo
  }, [lineData])

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uHighlight: { value: selectedArtistId ? 1.0 : 0.5 },
      },
      vertexShader: connectionVertexShader,
      fragmentShader: connectionFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [selectedArtistId])

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uHighlight.value = selectedArtistId ? 1.0 : 0.5
    }
  })

  if (!geometry || !lineData) return null

  return (
    <lineSegments geometry={geometry}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </lineSegments>
  )
}
