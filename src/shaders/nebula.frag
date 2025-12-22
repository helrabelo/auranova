// Nebula fragment shader
// Creates volumetric, semi-transparent genre clouds

uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDensity;

varying vec2 vUv;
varying vec3 vPosition;
varying float vNoise;

// Fractal Brownian Motion for cloud-like textures
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise2D(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

void main() {
  // Animated UV coordinates
  vec2 uv = vUv;
  float time = uTime * 0.05;

  // Create layered noise for cloud effect
  float noise1 = fbm(uv * 3.0 + time);
  float noise2 = fbm(uv * 6.0 - time * 0.5);
  float noise3 = fbm(uv * 12.0 + vec2(time * 0.3, -time * 0.2));

  // Combine noise layers
  float cloudNoise = noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.15;

  // Edge falloff - fade out at edges
  float distFromCenter = length(vUv - 0.5) * 2.0;
  float edgeFalloff = 1.0 - smoothstep(0.3, 1.0, distFromCenter);

  // Combine with vertex noise for 3D variation
  float finalNoise = cloudNoise * edgeFalloff * (0.5 + vNoise * 0.5);

  // Apply density threshold for cloud-like appearance
  finalNoise = smoothstep(0.3, 0.7, finalNoise * uDensity);

  // Color with slight variation
  vec3 color = uColor;
  color += vec3(0.1, 0.05, 0.15) * noise2; // Subtle color variation

  // Final alpha
  float alpha = finalNoise * uOpacity;

  // Discard nearly transparent pixels
  if (alpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
