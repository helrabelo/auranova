// Star fragment shader
// Creates a glowing point with soft edges
// Audio-reactive glow intensity and evolution status effects

uniform float uTime;
uniform float uGlowIntensity;
uniform float uOpacity; // For fade-in animation
uniform float uAudioAverage; // For audio-reactive glow

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;
varying float vEvolution;
varying float vSpawnOpacity;

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

  // Evolution-based color effects
  if (vEvolution == 1.0) {
    // New stars: bright green pulsing ring effect
    float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
    float ring = smoothstep(0.6, 0.7, dist) * (1.0 - smoothstep(0.85, 1.0, dist));
    vec3 newColor = vec3(0.2, 1.0, 0.4); // Green
    finalColor = mix(finalColor, newColor, ring * pulse * 0.8);
    finalColor += newColor * core * 0.3 * pulse;
    alpha += ring * pulse * 0.5;
  } else if (vEvolution == 2.0) {
    // Fading stars: dim with reddish tint
    finalColor = mix(finalColor, vec3(0.8, 0.3, 0.2), 0.3); // Red tint
    alpha *= 0.6;
  } else if (vEvolution == 3.0) {
    // Rising stars: bright emerald glow
    vec3 risingColor = vec3(0.3, 0.9, 0.5);
    float outerGlow = smoothstep(0.5, 1.0, dist);
    finalColor = mix(finalColor, risingColor, outerGlow * 0.4);
    alpha += outerGlow * 0.2;
  } else if (vEvolution == 4.0) {
    // Falling stars: warm orange tint
    vec3 fallingColor = vec3(1.0, 0.6, 0.2);
    float outerGlow = smoothstep(0.5, 1.0, dist);
    finalColor = mix(finalColor, fallingColor, outerGlow * 0.3);
  }

  // Add slight color boost to the core (enhanced by audio)
  float coreBoost = core * (1.0 + uAudioAverage * 0.3);
  finalColor += vec3(0.1, 0.1, 0.15) * coreBoost;

  // Distance-based fog (stars fade slightly in distance)
  float fog = 1.0 - smoothstep(100.0, 500.0, vDistance);
  alpha *= fog;

  // Apply per-star spawn opacity (staggered fade-in)
  alpha *= vSpawnOpacity;

  // Apply global opacity (for legacy fade-in, kept for compatibility)
  alpha *= uOpacity;

  gl_FragColor = vec4(finalColor, alpha);
}
