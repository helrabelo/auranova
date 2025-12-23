wo# Auranova Roadmap

## Phase 1: Auth + Data (Week 1)
- [x] Project setup
- [x] Spotify OAuth PKCE implementation
- [x] Token refresh handling
- [x] Fetch top artists (short/medium/long term)
- [x] Fetch top tracks
- [x] Fetch audio features for tracks
- [x] Data aggregation (artist → genres → energy/mood)

## Phase 2: Galaxy Layout (Week 2)
- [x] Genre clustering algorithm
- [x] D3 force simulation for artist positioning
- [x] Artists weighted by popularity
- [x] Connections between related artists
- [x] Position serialization (stable between renders via localStorage)

## Phase 3: Basic Three.js Scene (Week 3)
- [x] Star field with instanced points
- [x] Camera fly-through controls
- [x] Click to focus on artist
- [x] Basic lighting setup
- [x] Performance baseline (target: 60fps with 500+ stars)

## Phase 4: Shaders + Effects (Weeks 4-5)
- [x] Custom star shader (glow, twinkle)
- [x] Star color based on genre
- [x] Star size based on popularity
- [x] Nebula shader for genre clouds
- [x] Bloom post-processing
- [x] Connection lines with gradient

## Phase 5: Audio Integration (Week 6)
- [x] Preview playback on hover/click
- [x] Web Audio API analyzer
- [x] Audio-reactive star pulsing
- [x] Smooth play/pause transitions
- [x] Volume control

## Phase 6: Time + Evolution (Week 7) ✅ COMPLETE
- [x] Toggle between time ranges
- [x] Animated transition between states
- [x] "New discoveries" highlighting
- [x] Fading stars (artists you stopped listening to)

## Phase 7: Polish + Ship (Weeks 8-9)
- [ ] Artist detail panel
- [ ] Genre legend
- [ ] Loading experience (stars appearing)
- [ ] Mobile touch controls
- [ ] Share functionality (screenshot export)
- [ ] README + demo video
- [ ] Deploy

## Stretch Goals
- [ ] Last.fm integration for deeper history
- [ ] "Musical DNA" fingerprint visualization
- [ ] Compare with friends
- [ ] Playlist generation from selected region
