import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { audioManager, type AudioAnalyzerData } from './AudioManager'

const DEFAULT_DATA: AudioAnalyzerData = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  average: 0,
}

/**
 * Hook to access audio analyzer data in React Three Fiber render loop
 * Returns smoothed values for use in shaders/animations
 */
export function useAudioAnalyzer(): {
  getAnalyzerData: () => AudioAnalyzerData
  bassRef: React.RefObject<number>
  midRef: React.RefObject<number>
  trebleRef: React.RefObject<number>
  averageRef: React.RefObject<number>
} {
  // Refs to hold current values (for use in render loop)
  const bassRef = useRef(0)
  const midRef = useRef(0)
  const trebleRef = useRef(0)
  const averageRef = useRef(0)

  // Smoothing factor (0-1, lower = smoother)
  const smoothing = 0.15

  // Update values every frame
  useFrame(() => {
    const data = audioManager.getAnalyzerData()

    // Smooth interpolation for visual continuity
    bassRef.current += (data.bass - bassRef.current) * smoothing
    midRef.current += (data.mid - midRef.current) * smoothing
    trebleRef.current += (data.treble - trebleRef.current) * smoothing
    averageRef.current += (data.average - averageRef.current) * smoothing
  })

  const getAnalyzerData = useCallback((): AudioAnalyzerData => {
    return audioManager.getAnalyzerData() ?? DEFAULT_DATA
  }, [])

  return {
    getAnalyzerData,
    bassRef,
    midRef,
    trebleRef,
    averageRef,
  }
}

/**
 * Simple hook to check if audio is currently playing
 */
export function useIsAudioPlaying(): boolean {
  const isPlayingRef = useRef(false)

  useFrame(() => {
    isPlayingRef.current = audioManager.isPlaying()
  })

  return isPlayingRef.current
}
