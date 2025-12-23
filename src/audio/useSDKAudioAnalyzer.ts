import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlaybackStore } from '@/stores/playbackStore'
import type { AudioAnalyzerData } from './AudioManager'

interface AudioFeatures {
  energy: number
  danceability: number
  valence: number
  tempo?: number
}

/**
 * Simulated audio analyzer for SDK playback
 * Since we can't access the SDK audio stream directly, we generate
 * reactive values based on track audio features (energy, danceability, valence)
 *
 * This creates a convincing visual effect that responds to the music's character
 * rather than the actual waveform.
 */
export function useSDKAudioAnalyzer(audioFeatures?: AudioFeatures): {
  getAnalyzerData: () => AudioAnalyzerData
  bassRef: React.RefObject<number>
  midRef: React.RefObject<number>
  trebleRef: React.RefObject<number>
  averageRef: React.RefObject<number>
} {
  const bassRef = useRef(0)
  const midRef = useRef(0)
  const trebleRef = useRef(0)
  const averageRef = useRef(0)

  const playerState = usePlaybackStore((state) => state.playerState)

  // Smoothing factor for value interpolation
  const smoothing = 0.15

  useFrame((state) => {
    const isPlaying = playerState?.isPlaying ?? false

    if (!isPlaying || !audioFeatures) {
      // Decay values when not playing
      bassRef.current *= 0.92
      midRef.current *= 0.92
      trebleRef.current *= 0.92
      averageRef.current *= 0.92
      return
    }

    const time = state.clock.elapsedTime
    const { energy, danceability, valence, tempo = 120 } = audioFeatures

    // Calculate beat frequency based on tempo (BPM -> Hz)
    // Add some variation based on danceability
    const bpm = tempo
    const beatHz = bpm / 60
    const subBeatHz = beatHz * 2 // Double-time for high-hat feel

    // Generate pulse waves at beat frequency
    const beatPulse = Math.sin(time * beatHz * Math.PI * 2)
    const subBeatPulse = Math.sin(time * subBeatHz * Math.PI * 2)

    // Normalize pulses to 0-1 range
    const beatNorm = beatPulse * 0.5 + 0.5
    const subBeatNorm = subBeatPulse * 0.5 + 0.5

    // Bass: Strong on-beat pulses, influenced by energy
    // Higher energy = sharper, more prominent bass hits
    const bassPulseStrength = energy * 0.6
    const bassBase = energy * 0.4
    const targetBass = bassBase + beatNorm * bassPulseStrength * danceability

    // Mid: More consistent, slight variation on sub-beats
    // Influenced by overall energy level
    const midVariation = Math.sin(time * 3.7) * 0.15
    const targetMid = energy * 0.5 + subBeatNorm * 0.2 + midVariation

    // Treble: Sparkly, high-frequency feel, influenced by valence (happiness)
    // Higher valence = brighter, more active treble
    const trebleSparkle = Math.sin(time * 11.3) * Math.sin(time * 7.1)
    const targetTreble =
      valence * 0.35 + Math.abs(trebleSparkle) * 0.3 + subBeatNorm * valence * 0.2

    // Smooth interpolation to target values
    bassRef.current += (targetBass - bassRef.current) * smoothing
    midRef.current += (targetMid - midRef.current) * smoothing
    trebleRef.current += (targetTreble - trebleRef.current) * smoothing

    // Calculate average
    averageRef.current =
      (bassRef.current + midRef.current + trebleRef.current) / 3
  })

  const getAnalyzerData = useCallback((): AudioAnalyzerData => {
    return {
      bass: bassRef.current,
      mid: midRef.current,
      treble: trebleRef.current,
      volume: averageRef.current,
      average: averageRef.current,
    }
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
 * Check if SDK playback is currently active
 */
export function useIsSDKPlaying(): boolean {
  const playerState = usePlaybackStore((state) => state.playerState)
  return playerState?.isPlaying ?? false
}
