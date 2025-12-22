import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Stats } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Points, BufferGeometry, PointsMaterial } from 'three'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { ArtistStars } from './ArtistStars'
import { CameraController } from './CameraController'
import { ConnectionLines } from './ConnectionLines'
import { GenreNebulae } from './GenreNebulae'
import { Effects } from './Effects'

// Test particle system - will be replaced with actual star field
function TestParticles(): React.JSX.Element {
  const pointsRef = useRef<Points<BufferGeometry, PointsMaterial>>(null)

  // Generate geometry with buffer attributes
  const geometry = useMemo(() => {
    const count = 500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const radius = 20 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Random colors (galaxy-like)
      const hue = 0.5 + Math.random() * 0.3 // Blue to purple range
      const color = new THREE.Color()
      color.setHSL(hue, 0.8, 0.6 + Math.random() * 0.3)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

  // Animate rotation
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Central glowing orb
function CentralOrb(): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      )
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
    </mesh>
  )
}

export function Scene(): React.JSX.Element {
  const galaxyData = useMusicStore((state) => state.galaxyData)
  const hasArtists = galaxyData && galaxyData.artists.length > 0
  const controlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <>
      {/* Performance monitor (toggle with 'p' key or remove in production) */}
      <Stats showPanel={0} className="stats-panel" />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={150}
        autoRotate={!hasArtists} // Stop auto-rotate when showing real data
        autoRotateSpeed={0.3}
      />

      {/* Camera fly-to animation controller */}
      <CameraController controlsRef={controlsRef} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />

      {/* Background stars */}
      <Stars
        radius={200}
        depth={100}
        count={5000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />

      {/* Genre nebulae (render first, behind stars) */}
      {hasArtists && <GenreNebulae />}

      {/* Artist stars (from Spotify data) or test particles (fallback) */}
      {hasArtists ? <ArtistStars /> : <TestParticles />}

      {/* Connection lines between related artists */}
      {hasArtists && <ConnectionLines />}

      {/* Central reference point */}
      <CentralOrb />

      {/* Post-processing effects (bloom, vignette) */}
      <Effects />
    </>
  )
}
