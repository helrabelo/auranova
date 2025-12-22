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
        intensity={0.8} // Bloom strength
        luminanceThreshold={0.2} // Only bloom bright areas
        luminanceSmoothing={0.9} // Smooth transition
        mipmapBlur // Better quality blur
        radius={0.8} // Bloom spread
      />
      <Vignette
        offset={0.3} // Start of vignette
        darkness={0.6} // Edge darkness
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
