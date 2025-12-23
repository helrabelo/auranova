import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Stats } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import { GalaxyStars } from './GalaxyStars'
import { CameraController } from './CameraController'
import { ConnectionLines } from './ConnectionLines'
import { GenreNebulae } from './GenreNebulae'
import { PersistentLabels } from './PersistentLabels'
import { Effects } from './Effects'
import { TouchControls } from './TouchControls'

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

  // Feature flags
  const debugMode = useFeatureFlagsStore((state) => state.debugMode)
  const nebulasEnabled = useFeatureFlagsStore((state) => state.nebulasEnabled)
  const showLabels = useFeatureFlagsStore((state) => state.showLabels)

  return (
    <>
      {/* Performance monitor (only in debug mode) */}
      {debugMode && <Stats showPanel={0} className="stats-panel" />}

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

      {/* Mobile touch controls enhancement */}
      <TouchControls controlsRef={controlsRef} />

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

      {/* Genre nebulae (render first, behind stars) - can be toggled for performance */}
      {hasArtists && nebulasEnabled && <GenreNebulae />}

      {/* Unified galaxy stars - handles skeleton, loading, revealing, and active states */}
      <GalaxyStars />

      {/* Persistent artist labels (top artists + nearby) */}
      {hasArtists && showLabels && <PersistentLabels />}

      {/* Connection lines between related artists */}
      {hasArtists && <ConnectionLines />}

      {/* Central reference point */}
      <CentralOrb />

      {/* Post-processing effects (bloom, vignette) */}
      <Effects />
    </>
  )
}
