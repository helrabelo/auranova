// Star fragment shader
// Creates a glowing point with soft edges
// Audio-reactive glow intensity, evolution status effects, and phase transitions

uniform float uTime;
uniform float uGlowIntensity;
uniform float uOpacity; // For fade-in animation
uniform float uAudioAverage; // For audio-reactive glow
uniform float uPhase; // 0=skeleton, 1=loading, 2=revealing, 3=active
uniform float uRevealProgress; // 0-1 reveal animation

varying vec3 vColor;
varying float vBrightness;
varying float vDistance;
varying float vAudioPulse;
varying float vEvolution;
varying float vSpawnOpacity;
varying float vActivation;

void main() {
  // Calculate distance from center of the point
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;

  // Discard pixels outside the circle
  if (dist > 1.0) {
    discard;
  }

  // Create soft glow falloff with brighter core
  float coreSize = 0.2; // Smaller core = brighter center point
  float core = 1.0 - smoothstep(0.0, coreSize, dist);
  float glow = 1.0 - smoothstep(coreSize, 1.0, dist);

  // Add subtle inner ring for depth/dimension
  float innerRing = smoothstep(0.15, 0.25, dist) * (1.0 - smoothstep(0.3, 0.45, dist));
  float innerRingIntensity = innerRing * 0.3;

  // Phase-adjusted glow intensity
  float phaseGlow = uGlowIntensity;
  if (uPhase < 2.0) {
    // Softer glow in skeleton/loading phases
    phaseGlow *= 0.6;
  } else if (uPhase < 3.0) {
    // Transition glow during reveal
    phaseGlow = mix(phaseGlow * 0.6, phaseGlow, uRevealProgress);
  }

  // Audio-reactive glow enhancement (reduced in non-active phases)
  float audioMultiplier = uPhase >= 3.0 ? 1.0 : 0.3;
  float audioGlow = phaseGlow * (1.0 + uAudioAverage * 0.5 * audioMultiplier);

  // Combine core, inner ring, and glow
  float alpha = core + innerRingIntensity + glow * audioGlow * 0.6;

  // Apply brightness
  vec3 finalColor = vColor * vBrightness;

  // Phase-based color adjustments
  if (uPhase < 2.0) {
    // Skeleton/loading: desaturated, cooler colors
    float gray = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
    vec3 desaturated = mix(finalColor, vec3(gray), 0.6);
    // Add slight blue tint
    desaturated += vec3(-0.05, 0.0, 0.1);
    finalColor = desaturated;

    // Loading phase: subtle pulsing ring effect
    if (uPhase >= 1.0) {
      float pulseRing = sin(uTime * 2.0 - dist * 4.0) * 0.5 + 0.5;
      float ring = smoothstep(0.4, 0.5, dist) * (1.0 - smoothstep(0.6, 0.7, dist));
      finalColor += vec3(0.1, 0.15, 0.3) * ring * pulseRing * 0.5;
    }
  } else if (uPhase < 3.0) {
    // Revealing: transition from desaturated to full color
    float gray = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
    vec3 desaturated = mix(finalColor, vec3(gray), 0.6);
    desaturated += vec3(-0.05, 0.0, 0.1);
    finalColor = mix(desaturated, finalColor, uRevealProgress);

    // Add color bloom effect during reveal
    float bloomProgress = smoothstep(0.3, 0.8, uRevealProgress);
    float colorBloom = sin(uRevealProgress * 3.14159) * 0.3;
    finalColor += finalColor * colorBloom * bloomProgress;
  }

  // Evolution-based color effects (only in active phase)
  if (uPhase >= 3.0) {
    if (vEvolution == 1.0) {
      // New stars: bright green pulsing ring effect
      float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
      float ring = smoothstep(0.6, 0.7, dist) * (1.0 - smoothstep(0.85, 1.0, dist));
      vec3 newColor = vec3(0.2, 1.0, 0.4);
      finalColor = mix(finalColor, newColor, ring * pulse * 0.8);
      finalColor += newColor * core * 0.3 * pulse;
      alpha += ring * pulse * 0.5;
    } else if (vEvolution == 2.0) {
      // Fading stars: dim with reddish tint
      finalColor = mix(finalColor, vec3(0.8, 0.3, 0.2), 0.3);
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
  }

  // Add slight color boost to the core
  float coreBoost = core * (1.0 + uAudioAverage * 0.3 * audioMultiplier);
  finalColor += vec3(0.1, 0.1, 0.15) * coreBoost;

  // Add subtle color variation to inner ring for depth
  vec3 ringColor = vColor * 1.2 + vec3(0.05, 0.05, 0.1);
  finalColor += ringColor * innerRingIntensity * 0.5;

  // Distance-based fog
  float fog = 1.0 - smoothstep(100.0, 500.0, vDistance);
  alpha *= fog;

  // Apply per-star spawn opacity
  alpha *= vSpawnOpacity;

  // Apply global opacity
  alpha *= uOpacity;

  // Skeleton phase: additional soft glow for "teaser" feel
  if (uPhase < 2.0) {
    // Add outer halo for skeleton stars
    float halo = smoothstep(0.8, 1.0, dist) * (1.0 - smoothstep(0.95, 1.0, dist));
    alpha += halo * 0.2;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
