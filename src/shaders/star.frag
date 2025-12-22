// Star fragment shader
// Creates a glowing point with soft edges
// Audio-reactive glow intensity

uniform float uTime;
uniform float uGlowIntensity;
uniform float uOpacity; // For fade-in animation
uniform float uAudioAverage; // For audio-reactive glow

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;

void main() {
  // Calculate distance from center of the point
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;

  // Discard pixels outside the circle
  if (dist > 1.0) {
    discard;
  }

  // Create soft glow falloff
  // Inner core is bright, outer edge fades smoothly
  float coreSize = 0.3;
  float core = 1.0 - smoothstep(0.0, coreSize, dist);
  float glow = 1.0 - smoothstep(coreSize, 1.0, dist);

  // Audio-reactive glow enhancement
  float audioGlow = uGlowIntensity * (1.0 + uAudioAverage * 0.5);

  // Combine core and glow
  float alpha = core + glow * audioGlow * 0.6;

  // Apply brightness (already includes audio response from vertex shader)
  vec3 finalColor = vColor * vBrightness;

  // Add slight color boost to the core (enhanced by audio)
  float coreBoost = core * (1.0 + uAudioAverage * 0.3);
  finalColor += vec3(0.1, 0.1, 0.15) * coreBoost;

  // Distance-based fog (stars fade slightly in distance)
  float fog = 1.0 - smoothstep(100.0, 500.0, vDistance);
  alpha *= fog;

  // Apply global opacity (for fade-in animation)
  alpha *= uOpacity;

  gl_FragColor = vec4(finalColor, alpha);
}
