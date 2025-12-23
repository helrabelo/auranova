# AuraNova - Phase 11: Star Animation & Visual Polish

## Tasks for This Session

### 1. Fix Star Loading Animation (High Priority)

**Problem**: The skeleton loading animation shows correctly, but when real artist data loads, the stars just "blink" into existence instantly. There's no smooth transition or reveal animation - they should animate in gracefully.

#### Expected Behavior
1. Skeleton stars show during loading (working ✓)
2. When data loads, stars should animate in with:
   - Fade in from transparent to full opacity
   - Scale up from small to full size
   - Possibly staggered timing (closest to center first, or by popularity)

#### Current Behavior
- Skeleton works
- Real stars appear instantly with no transition
- Feels jarring and unpolished

#### Key Files to Investigate
- `src/components/canvas/GalaxyStars.tsx` - Main star rendering component
- `src/simulation/dataTransform.ts` - Transforms Spotify data to galaxy positions
- `src/components/DataLoader.tsx` - Handles data fetching states

#### Debugging Steps
1. Check if there's a `revealed` or `animating` state that's not being used
2. Look for transition CSS/Three.js animations that might be skipped
3. Check timing between skeleton → real data states
4. Verify the animation frames are actually running

#### Possible Causes
- State change happens too fast, skipping animation frames
- Animation start condition not triggering properly
- CSS transitions not applying to Three.js meshes (need useFrame animations)
- Race condition between data loading and render


### 2. Enhanced Star Visuals (Planet-like Appearance)

**Problem**: Stars currently look like simple glowing dots. They should look more alive and planet-like.

#### Current Implementation
Stars are likely simple `<mesh>` with `sphereGeometry` and basic material with glow effect from bloom post-processing.

#### Enhancement Ideas

**Option A: Multi-layer Planet Effect**
```tsx
<group>
  {/* Core solid sphere */}
  <mesh>
    <sphereGeometry args={[size, 16, 16]} />
    <meshBasicMaterial color={artistColor} />
  </mesh>

  {/* Atmosphere glow layer */}
  <mesh scale={1.3}>
    <sphereGeometry args={[size, 16, 16]} />
    <meshBasicMaterial color={artistColor} transparent opacity={0.3} />
  </mesh>

  {/* Outer halo */}
  <sprite>
    <spriteMaterial
      map={glowTexture}
      color={artistColor}
      transparent
      opacity={0.5}
    />
  </sprite>
</group>
```

**Option B: Shader-based Glow**
- Custom shader with fresnel effect for rim lighting
- Animated pulse based on artist popularity or audio features

**Option C: Ring/Notch Detail**
- Small orbital ring around larger stars
- Surface "notch" or texture variation
- Subtle rotation animation

#### Acceptance Criteria
- Stars have visible depth/dimension (not flat dots)
- Each star feels "alive" with subtle animation
- Performance remains good on mobile (50+ stars)
- Visual hierarchy preserved (popular artists = bigger/brighter)


## Current State Summary

### Recent Changes (Last Session)
- Added mobile pan gesture (two-finger drag)
- Enhanced central nucleus with orbital rings and particles
- Added user's Spotify profile image to nucleus center
- Fixed z-index issues on mobile
- Fixed artist card play button

### Key Files Reference
- `src/components/canvas/GalaxyStars.tsx` - Star rendering (MAIN FILE FOR THIS SESSION)
- `src/components/canvas/Scene.tsx` - Main scene with CentralOrb
- `src/components/canvas/Effects.tsx` - Post-processing (bloom, etc.)
- `src/simulation/dataTransform.ts` - Data transformation
- `src/types/domain.ts` - GalaxyArtist type definition

### Architecture Notes
- Stars use instanced rendering for performance (likely `<instancedMesh>`)
- Each artist has: position, size, color, popularity, genres
- Bloom effect in Effects.tsx provides some glow
- GalaxyStars handles multiple states: skeleton, loading, revealed, active


## Testing

```bash
npm run dev
```

Test scenarios:
1. Fresh load - watch for skeleton → real stars transition
2. Change time range (4W/6M/All) - should animate between states
3. Zoom in close to stars - check visual detail
4. Performance on mobile with 50+ stars


## Technical Notes

### Three.js Animation Pattern
```tsx
useFrame((state, delta) => {
  // Animate scale
  if (meshRef.current && currentScale < targetScale) {
    meshRef.current.scale.lerp(targetScale, delta * 2)
  }

  // Animate opacity (if using transparent material)
  if (materialRef.current) {
    materialRef.current.opacity = THREE.MathUtils.lerp(
      materialRef.current.opacity,
      targetOpacity,
      delta * 2
    )
  }
})
```

### Staggered Animation Pattern
```tsx
const staggerDelay = index * 50 // 50ms between each star
const animationProgress = Math.max(0, (elapsedTime - staggerDelay) / animationDuration)
```

### Performance Considerations
- Use instanced rendering for 50+ objects
- Limit shader complexity on mobile
- Consider LOD (level of detail) based on distance
- Batch material updates where possible
