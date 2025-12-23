// Star vertex shader
// Handles point-based star rendering with size and color variations
// Includes audio-reactive pulsing and evolution status effects

uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;
uniform float uTransitionProgress; // 0-1 transition progress

// Audio reactive uniforms
uniform float uAudioBass;    // Bass frequency (0-1)
uniform float uAudioMid;     // Mid frequency (0-1)
uniform float uAudioTreble;  // Treble frequency (0-1)
uniform float uAudioAverage; // Overall average (0-1)

// Spawn animation uniforms
uniform float uSpawnProgress; // 0-1 spawn animation progress

attribute float aSize;
attribute vec3 aColor;
attribute float aBrightness;
attribute float aPhase; // Random phase offset for twinkling
attribute float aEvolution; // 0=stable, 1=new, 2=fading, 3=rising, 4=falling
attribute float aSpawnDelay; // 0-1 staggered spawn delay

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;
varying float vEvolution;
varying float vSpawnOpacity; // Per-star spawn opacity

void main() {
  // Transform position through model and view matrices
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  // Calculate distance from camera for depth-based effects
  vDistance = -viewPosition.z;

  // Calculate per-star spawn opacity with stagger
  // Each star starts appearing after its delay passes
  // The spawn animation lasts for a fraction of the total duration per star
  float spawnWindowSize = 0.4; // Each star takes 40% of total duration to fade in
  float localProgress = (uSpawnProgress - aSpawnDelay) / spawnWindowSize;
  vSpawnOpacity = clamp(localProgress, 0.0, 1.0);
  // Apply ease-out for smoother appearance
  vSpawnOpacity = 1.0 - pow(1.0 - vSpawnOpacity, 3.0);

  // Calculate size with:
  // - Base size from attribute
  // - Perspective scaling (smaller when further)
  // - Pixel ratio correction
  // - Subtle twinkling animation
  float twinkle = 1.0 + 0.15 * sin(uTime * 2.0 + aPhase * 6.28318);
  float perspectiveScale = 300.0 / max(vDistance, 1.0);

  // Audio-reactive size pulse
  // Use phase to vary which stars respond to which frequencies
  float audioResponse = 0.0;
  if (aPhase < 0.33) {
    // Bass-reactive stars (larger, slower pulse)
    audioResponse = uAudioBass * 0.5;
  } else if (aPhase < 0.66) {
    // Mid-reactive stars (medium response)
    audioResponse = uAudioMid * 0.4;
  } else {
    // Treble-reactive stars (quick, subtle pulse)
    audioResponse = uAudioTreble * 0.3;
  }

  // Combine audio response with general average for cohesion
  float audioPulse = 1.0 + audioResponse + uAudioAverage * 0.2;
  vAudioPulse = audioPulse;

  // Evolution-based size modifiers
  float evolutionSizeBoost = 1.0;
  if (aEvolution == 1.0) {
    // New stars: pulsing size effect to draw attention
    evolutionSizeBoost = 1.0 + 0.3 * sin(uTime * 4.0);
  } else if (aEvolution == 2.0) {
    // Fading stars: smaller and less prominent
    evolutionSizeBoost = 0.7;
  } else if (aEvolution == 3.0) {
    // Rising stars: slightly larger
    evolutionSizeBoost = 1.15;
  } else if (aEvolution == 4.0) {
    // Falling stars: slightly smaller
    evolutionSizeBoost = 0.9;
  }

  // Apply spawn scale (stars grow in during spawn animation)
  float spawnScale = 0.3 + vSpawnOpacity * 0.7; // Start at 30%, grow to 100%

  gl_PointSize = aSize * uBaseSize * perspectiveScale * uPixelRatio * twinkle * audioPulse * evolutionSizeBoost * spawnScale;

  // Clamp size
  gl_PointSize = clamp(gl_PointSize, 2.0, 80.0);

  // Pass to fragment shader
  vColor = aColor;
  vBrightness = aBrightness * twinkle * (1.0 + audioResponse * 0.5);
  vEvolution = aEvolution;
}
