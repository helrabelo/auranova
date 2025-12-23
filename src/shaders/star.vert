// Star vertex shader
// Handles point-based star rendering with size and color variations
// Includes audio-reactive pulsing, evolution status effects, and phase transitions

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

// Phase uniforms (0=skeleton, 1=loading, 2=revealing, 3=active)
uniform float uPhase;
uniform float uRevealProgress; // 0-1 reveal animation progress

attribute float aSize;
attribute vec3 aColor;
attribute float aBrightness;
attribute float aPhase; // Random phase offset for twinkling
attribute float aEvolution; // 0=stable, 1=new, 2=fading, 3=rising, 4=falling
attribute float aSpawnDelay; // 0-1 staggered spawn delay
attribute float aActivation; // 0=skeleton, 1=active (optional, defaults to 1)

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;
varying float vEvolution;
varying float vSpawnOpacity; // Per-star spawn opacity
varying float vActivation; // Pass activation to fragment shader
varying float vPhase; // Pass phase to fragment shader

void main() {
  // Transform position through model and view matrices
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  // Calculate distance from camera for depth-based effects
  vDistance = -viewPosition.z;

  // Read activation (default to 1.0 if not provided)
  vActivation = aActivation;
  vPhase = uPhase;

  // Calculate per-star spawn opacity with stagger
  float spawnWindowSize = 0.4;
  float localProgress = (uSpawnProgress - aSpawnDelay) / spawnWindowSize;
  vSpawnOpacity = clamp(localProgress, 0.0, 1.0);
  // Apply ease-out for smoother appearance
  vSpawnOpacity = 1.0 - pow(1.0 - vSpawnOpacity, 3.0);

  // Calculate size with various factors
  float twinkle = 1.0 + 0.15 * sin(uTime * 2.0 + aPhase * 6.28318);
  float perspectiveScale = 300.0 / max(vDistance, 1.0);

  // Audio-reactive size pulse (reduced in skeleton/loading phases)
  float audioResponse = 0.0;
  float audioMultiplier = uPhase >= 3.0 ? 1.0 : 0.3; // Full audio only in active phase

  if (aPhase < 0.33) {
    audioResponse = uAudioBass * 0.5 * audioMultiplier;
  } else if (aPhase < 0.66) {
    audioResponse = uAudioMid * 0.4 * audioMultiplier;
  } else {
    audioResponse = uAudioTreble * 0.3 * audioMultiplier;
  }

  float audioPulse = 1.0 + audioResponse + uAudioAverage * 0.2 * audioMultiplier;
  vAudioPulse = audioPulse;

  // Evolution-based size modifiers (only in active phase)
  float evolutionSizeBoost = 1.0;
  if (uPhase >= 3.0) {
    if (aEvolution == 1.0) {
      evolutionSizeBoost = 1.0 + 0.3 * sin(uTime * 4.0);
    } else if (aEvolution == 2.0) {
      evolutionSizeBoost = 0.7;
    } else if (aEvolution == 3.0) {
      evolutionSizeBoost = 1.15;
    } else if (aEvolution == 4.0) {
      evolutionSizeBoost = 0.9;
    }
  }

  // Skeleton/loading phase: gentle breathing animation
  float skeletonPulse = 1.0;
  if (uPhase < 2.0) {
    // Slower, more subtle pulse for skeleton/loading
    float breathe = sin(uTime * 0.8 + aPhase * 6.28) * 0.15;
    skeletonPulse = 1.0 + breathe;

    // Extra pulse during loading phase
    if (uPhase >= 1.0) {
      float loadingPulse = sin(uTime * 2.0) * 0.1;
      skeletonPulse += loadingPulse;
    }
  }

  // Apply spawn scale
  float spawnScale = 0.3 + vSpawnOpacity * 0.7;

  // Calculate final size
  float baseSize = aSize * uBaseSize;

  // Skeleton stars are slightly smaller
  if (uPhase < 2.0) {
    baseSize *= 0.7;
  }

  gl_PointSize = baseSize * perspectiveScale * uPixelRatio * twinkle * audioPulse * evolutionSizeBoost * spawnScale * skeletonPulse;

  // Clamp size
  gl_PointSize = clamp(gl_PointSize, 2.0, 80.0);

  // Pass to fragment shader
  vColor = aColor;

  // Brightness adjusted for phase
  float phaseBrightness = aBrightness;
  if (uPhase < 2.0) {
    // Dimmer in skeleton/loading phases
    phaseBrightness *= 0.5;
  } else if (uPhase < 3.0) {
    // Gradually increase during reveal
    phaseBrightness = mix(phaseBrightness * 0.5, phaseBrightness, uRevealProgress);
  }

  vBrightness = phaseBrightness * twinkle * (1.0 + audioResponse * 0.5);
  vEvolution = aEvolution;
}
