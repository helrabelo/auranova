// Star vertex shader
// Handles point-based star rendering with size and color variations
// Includes audio-reactive pulsing

uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;

// Audio reactive uniforms
uniform float uAudioBass;    // Bass frequency (0-1)
uniform float uAudioMid;     // Mid frequency (0-1)
uniform float uAudioTreble;  // Treble frequency (0-1)
uniform float uAudioAverage; // Overall average (0-1)

attribute float aSize;
attribute vec3 aColor;
attribute float aBrightness;
attribute float aPhase; // Random phase offset for twinkling

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;

void main() {
  // Transform position through model and view matrices
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  // Calculate distance from camera for depth-based effects
  vDistance = -viewPosition.z;

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

  gl_PointSize = aSize * uBaseSize * perspectiveScale * uPixelRatio * twinkle * audioPulse;

  // Clamp size
  gl_PointSize = clamp(gl_PointSize, 2.0, 80.0);

  // Pass to fragment shader
  vColor = aColor;
  vBrightness = aBrightness * twinkle * (1.0 + audioResponse * 0.5);
}
