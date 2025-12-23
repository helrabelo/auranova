import { useRef, useMemo, Suspense } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars, Stats } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useMusicStore } from '@/stores/musicStore'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import { useUserProfile } from '@/api/hooks'
import { PlanetStars } from './PlanetStars'
import { CameraController } from './CameraController'
import { ConnectionLines } from './ConnectionLines'
import { GenreNebulae } from './GenreNebulae'
import { PersistentLabels } from './PersistentLabels'
import { Effects } from './Effects'
import { TouchControls } from './TouchControls'

// Profile image sphere component (separate to handle texture loading)
function ProfileSphere({ imageUrl }: { imageUrl: string }): React.JSX.Element {
  const texture = useLoader(THREE.TextureLoader, imageUrl)

  return (
    <mesh>
      <sphereGeometry args={[3, 32, 32]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

// Central glowing nucleus with orbital ring, profile image core, and particles
function CentralOrb(): React.JSX.Element {
  const { profileImageUrl } = useUserProfile()

  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)

  // Create orbiting particles
  const particleCount = 50
  const particlePositions = useMemo(
    () => new Float32Array(particleCount * 3),
    []
  )
  const particleAngles = useMemo(
    () => new Float32Array(particleCount).map(() => Math.random() * Math.PI * 2),
    []
  )
  const particleRadii = useMemo(
    () => new Float32Array(particleCount).map(() => 5 + Math.random() * 2),
    []
  )
  const particleSpeeds = useMemo(
    () => new Float32Array(particleCount).map(() => 0.3 + Math.random() * 0.4),
    []
  )

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Pulse outer sphere
    if (outerRef.current) {
      outerRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05)
    }

    // Pulse inner core (faster, different phase) - only if no profile image
    if (innerRef.current && !profileImageUrl) {
      innerRef.current.scale.setScalar(1 + Math.sin(time * 3 + 1) * 0.1)
    }

    // Rotate ring
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.2
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.5) * 0.1
    }

    // Animate orbiting particles
    if (particlesRef.current) {
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i] * 0.01
        const angle = particleAngles[i]
        const radius = particleRadii[i]
        const wobble = Math.sin(time * 2 + i) * 0.3

        particlePositions[i * 3] = Math.cos(angle) * radius
        particlePositions[i * 3 + 1] = wobble
        particlePositions[i * 3 + 2] = Math.sin(angle) * radius
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Outer translucent sphere - larger nucleus */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* Profile image or fallback inner core */}
      {profileImageUrl ? (
        <Suspense fallback={
          <mesh ref={innerRef}>
            <sphereGeometry args={[3, 24, 24]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} />
          </mesh>
        }>
          <ProfileSphere imageUrl={profileImageUrl} />
        </Suspense>
      ) : (
        <>
          {/* Inner glowing core */}
          <mesh ref={innerRef}>
            <sphereGeometry args={[2.5, 24, 24]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} />
          </mesh>
          {/* Bright center point */}
          <mesh>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#ddd6fe" />
          </mesh>
        </>
      )}

      {/* Orbital ring / accretion disk - scaled up */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.2, 16, 64]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.6} />
      </mesh>

      {/* Secondary thinner ring */}
      <mesh rotation={[Math.PI / 2 + 0.3, 0.2, 0]}>
        <torusGeometry args={[7, 0.12, 12, 48]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </mesh>

      {/* Orbiting particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          color="#e9d5ff"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
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
        enablePan
        panSpeed={0.8}
        // Limit pan range to prevent getting lost in space
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
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

      {/* Planet-style stars - 3D spheres with procedural textures */}
      <PlanetStars />

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
