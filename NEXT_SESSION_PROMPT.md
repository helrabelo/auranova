# AuraNova - Phase 10: Mobile Pan & Nucleus Visual Enhancement

## Tasks for This Session

### 1. Mobile Pan Feature (Two-Finger Drag)

Currently, mobile touch controls support:
- **One finger**: Rotate the galaxy
- **Two finger pinch**: Zoom in/out

**Add two-finger drag to pan the camera**, allowing users to move the view around without rotating.

#### Implementation Location
- `src/components/canvas/TouchControls.tsx` - Touch gesture handling
- `src/components/canvas/Scene.tsx` - OrbitControls configuration

#### Technical Notes
- OrbitControls supports `enablePan` which is likely disabled
- Need to configure `touches.TWO` to support both DOLLY and PAN
- Consider using `THREE.TOUCH.DOLLY_PAN` (value 2) which combines both
- Current config in TouchControls.tsx:
  ```typescript
  controls.touches = {
    ONE: TOUCH.ROTATE,
    TWO: TOUCH.DOLLY_PAN, // Already set, but may need pan speed tuning
  }
  ```
- May need to adjust `panSpeed` for comfortable mobile panning
- Consider adding a three-finger gesture for pan-only if DOLLY_PAN feels awkward

#### Acceptance Criteria
- Two-finger drag pans the camera (moves view left/right/up/down)
- Pinch-to-zoom still works simultaneously
- Pan feels smooth and responsive on mobile
- Pan boundaries prevent getting lost in space


### 2. Central Nucleus Visual "Notch" Enhancement

The central orb (`CentralOrb` component in Scene.tsx) needs a visual enhancement - add a "notch" or distinctive visual element to make it more interesting.

#### Current Implementation
```typescript
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
```

#### Enhancement Ideas
- Add a glowing ring/torus around the nucleus
- Add particle emissions from the center
- Add a pulsing inner core with different color
- Add an accretion disk effect (flat ring with gradient)
- Add a "notch" indent or protrusion with emissive glow
- Add orbiting mini-particles

#### Acceptance Criteria
- Nucleus has a visually distinctive feature beyond plain sphere
- Animation/glow makes it feel alive
- Doesn't distract from the artist stars
- Performs well on mobile


## Current State Summary

### Recent Changes (This Session)
- Fixed mobile touch rotation (was using wrong TOUCH constant)
- Improved mobile UI with bottom sheet artist panel
- Added loading timeout (30s) with retry/logout options
- Genre legend and settings hide on mobile when artist panel is open
- Responsive header and controls

### Key Files Reference
- `src/components/canvas/Scene.tsx` - Main 3D scene with CentralOrb
- `src/components/canvas/TouchControls.tsx` - Mobile touch handling
- `src/components/canvas/CameraController.tsx` - Camera animations
- `src/components/ui/ArtistPanel.tsx` - Mobile-friendly bottom sheet

### Testing
```bash
npm run dev
```

Test on mobile device or Chrome DevTools mobile emulation:
1. Test two-finger pan gesture
2. Verify pinch-to-zoom still works
3. Check nucleus visual enhancement
4. Ensure performance is acceptable on mobile


## Notes

- Spotify app is in Development Mode - only allowlisted users can test
- To add test users: Spotify Dashboard → App → Settings → User Management
- For public release, need to submit app for Spotify review
