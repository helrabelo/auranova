import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useUIStore } from '@/stores/uiStore'
import { useMusicStore } from '@/stores/musicStore'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface CameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

const ANIMATION_DURATION = 1.5 // seconds for artist selection animation
const CAMERA_OFFSET = 15 // distance from target artist
const REVEAL_CAMERA_START_Z = 35 // closer camera during skeleton/loading
const REVEAL_CAMERA_END_Z = 50 // final camera position after reveal

/**
 * Camera controller that handles:
 * 1. Reveal animation - pulls camera back during galaxy reveal
 * 2. Artist selection - smoothly animates to selected artists
 */
export function CameraController({
  controlsRef,
}: CameraControllerProps): null {
  const { camera } = useThree()

  // Store state
  const selectedArtistId = useUIStore((state) => state.selection.artistId)
  const isAnimating = useUIStore((state) => state.isAnimating)
  const setIsAnimating = useUIStore((state) => state.setIsAnimating)
  const galaxyPhase = useUIStore((state) => state.galaxyPhase)
  const revealProgress = useUIStore((state) => state.revealProgress)
  const getArtistById = useMusicStore((state) => state.getArtistById)

  // Track if we've set the initial camera position
  const hasSetInitialPosition = useRef(false)

  // Animation state for artist selection
  const animationRef = useRef({
    startTime: 0,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    isActive: false,
  })

  // Set initial camera position closer for skeleton/loading phases
  useEffect(() => {
    if (!hasSetInitialPosition.current && (galaxyPhase === 'skeleton' || galaxyPhase === 'loading')) {
      camera.position.set(0, 0, REVEAL_CAMERA_START_Z)
      hasSetInitialPosition.current = true
    }
  }, [camera, galaxyPhase])

  // Start animation when artist is selected
  useEffect(() => {
    if (!selectedArtistId) return

    const artist = getArtistById(selectedArtistId)
    if (!artist) return

    const controls = controlsRef.current
    if (!controls) return

    // Calculate target position (offset from artist)
    const artistPos = new THREE.Vector3(...artist.position)
    const cameraDirection = camera.position.clone().sub(artistPos).normalize()
    const targetCameraPos = artistPos
      .clone()
      .add(cameraDirection.multiplyScalar(CAMERA_OFFSET))

    // Store animation start state
    animationRef.current = {
      startTime: performance.now() / 1000,
      startPosition: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPosition: targetCameraPos,
      endTarget: artistPos,
      isActive: true,
    }

    setIsAnimating(true)
  }, [selectedArtistId, camera, controlsRef, getArtistById, setIsAnimating])

  // Animation loop
  useFrame(() => {
    const controls = controlsRef.current

    // Handle reveal camera animation (pull back during reveal)
    if (galaxyPhase === 'revealing' && !animationRef.current.isActive) {
      // Eased progress for smooth pull-back
      const easedReveal = 1 - Math.pow(1 - revealProgress, 3)
      const targetZ = THREE.MathUtils.lerp(REVEAL_CAMERA_START_Z, REVEAL_CAMERA_END_Z, easedReveal)

      // Only update Z position if not animating to an artist
      if (camera.position.x === 0 && camera.position.y === 0) {
        camera.position.z = targetZ
      }
    }

    // Handle artist selection animation
    const anim = animationRef.current
    if (!anim.isActive) return

    if (!controls) return

    const currentTime = performance.now() / 1000
    const elapsed = currentTime - anim.startTime
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

    // Easing function (ease out cubic)
    const eased = 1 - Math.pow(1 - progress, 3)

    // Lerp camera position
    camera.position.lerpVectors(anim.startPosition, anim.endPosition, eased)

    // Lerp orbit controls target
    controls.target.lerpVectors(anim.startTarget, anim.endTarget, eased)
    controls.update()

    // End animation
    if (progress >= 1) {
      anim.isActive = false
      setIsAnimating(false)
    }
  })

  // Disable controls during animation
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (isAnimating) {
      controls.enabled = false
    } else {
      controls.enabled = true
    }
  }, [isAnimating, controlsRef])

  return null
}
