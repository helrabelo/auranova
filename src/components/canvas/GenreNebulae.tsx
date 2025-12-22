import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import type { GalaxyGenre } from '@/types/domain'

// Import shaders
import nebulaVertexShader from '@/shaders/nebula.vert?raw'
import nebulaFragmentShader from '@/shaders/nebula.frag?raw'

interface NebulaMeshProps {
  genre: GalaxyGenre
}

/**
 * Single nebula cloud for a genre
 */
function NebulaMesh({ genre }: NebulaMeshProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Calculate size based on artist count (more artists = larger cloud)
  const size = useMemo(() => {
    const baseSize = 8
    const scaleFactor = Math.sqrt(genre.artistCount) * 2
    return baseSize + scaleFactor
  }, [genre.artistCount])

  // Parse genre color
  const color = useMemo(() => {
    return new THREE.Color(genre.color)
  }, [genre.color])

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: color },
        uOpacity: { value: 0.15 }, // Very subtle
        uDensity: { value: 1.2 },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [color])

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} position={genre.position}>
      <sphereGeometry args={[size, 32, 32]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  )
}

/**
 * Genre nebulae - volumetric clouds representing genre clusters
 * Each genre with multiple artists gets a subtle nebula cloud
 */
export function GenreNebulae(): React.JSX.Element | null {
  const galaxyData = useMusicStore((state) => state.galaxyData)

  // Filter to genres with enough artists to warrant a cloud
  const visibleGenres = useMemo(() => {
    if (!galaxyData) return []
    return galaxyData.genres.filter((g) => g.artistCount >= 2)
  }, [galaxyData])

  if (visibleGenres.length === 0) return null

  return (
    <group>
      {visibleGenres.map((genre) => (
        <NebulaMesh key={genre.id} genre={genre} />
      ))}
    </group>
  )
}
