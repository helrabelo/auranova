import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

/**
 * Post-processing effects for the galaxy scene
 * - Bloom: Creates glow around bright stars
 * - Vignette: Darkens edges for cinematic feel
 */
export function Effects(): React.JSX.Element {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.0} // Increased bloom strength for more glow
        luminanceThreshold={0.15} // Lower threshold = more stars bloom
        luminanceSmoothing={0.9} // Smooth transition
        mipmapBlur // Better quality blur
        radius={0.85} // Slightly wider bloom spread
      />
      <Vignette
        offset={0.3} // Start of vignette
        darkness={0.6} // Edge darkness
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
