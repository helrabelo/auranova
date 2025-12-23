import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { TOUCH } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface TouchControlsProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  enabled?: boolean
}

/**
 * Mobile touch controls enhancement for OrbitControls
 * Adds:
 * - Pinch-to-zoom sensitivity adjustment
 * - Smooth momentum on touch release
 * - Touch gesture hints
 */
export function TouchControls({
  controlsRef,
  enabled = true,
}: TouchControlsProps): React.JSX.Element | null {
  const { gl } = useThree()
  const isTouchDevice = useRef(false)
  const lastTouchCount = useRef(0)
  const momentumRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Detect touch device
    isTouchDevice.current =
      'ontouchstart' in window || navigator.maxTouchPoints > 0

    if (!isTouchDevice.current || !enabled) return

    const canvas = gl.domElement

    // Configure OrbitControls for mobile
    const controls = controlsRef.current
    if (controls) {
      // Increase touch sensitivity
      controls.rotateSpeed = 0.5
      controls.zoomSpeed = 1.2
      controls.panSpeed = 0.8

      // Enable touch actions
      controls.touches = {
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
      }
    }

    // Track touch state for momentum
    let lastX = 0
    let lastY = 0
    let lastTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchCount.current = e.touches.length
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
        lastTime = Date.now()
        momentumRef.current = { x: 0, y: 0 }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const now = Date.now()
        const dt = now - lastTime
        if (dt > 0) {
          const dx = e.touches[0].clientX - lastX
          const dy = e.touches[0].clientY - lastY
          momentumRef.current = {
            x: dx / dt,
            y: dy / dt,
          }
        }
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
        lastTime = now
      }
    }

    const handleTouchEnd = () => {
      lastTouchCount.current = 0
      // Momentum will be applied in useFrame
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [gl, controlsRef, enabled])

  // Apply momentum damping
  useFrame(() => {
    if (!isTouchDevice.current || !enabled) return

    const controls = controlsRef.current
    if (!controls || lastTouchCount.current > 0) return

    // Apply momentum with damping
    const momentum = momentumRef.current
    if (Math.abs(momentum.x) > 0.001 || Math.abs(momentum.y) > 0.001) {
      // Damping factor
      momentum.x *= 0.95
      momentum.y *= 0.95

      // Apply to controls rotation (using type assertion for methods)
      const orbitControls = controls as OrbitControlsImpl & {
        rotateLeft: (angle: number) => void
        rotateUp: (angle: number) => void
      }
      orbitControls.rotateLeft(momentum.x * 0.01)
      orbitControls.rotateUp(momentum.y * 0.01)
    }
  })

  return null
}

/**
 * Touch hints overlay for first-time mobile users
 */
export function TouchHints(): React.JSX.Element | null {
  const [showHints, setShowHints] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if mobile and haven't dismissed before
    const isMobile =
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasDismissed = localStorage.getItem('auranova-touch-hints-dismissed')

    if (isMobile && !hasDismissed) {
      // Show hints after a short delay
      const timer = setTimeout(() => setShowHints(true), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  const handleDismiss = () => {
    setShowHints(false)
    setDismissed(true)
    localStorage.setItem('auranova-touch-hints-dismissed', 'true')
  }

  if (!showHints || dismissed) return null

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-4 max-w-[280px] animate-fade-in">
      <div className="text-white text-sm space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">1</span>
          <span className="text-gray-300">One finger to rotate</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">2</span>
          <span className="text-gray-300">Pinch to zoom in/out</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">Tap</span>
          <span className="text-gray-300">Tap a star to see details</span>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white text-sm transition-colors"
      >
        Got it
      </button>
    </div>
  )
}
