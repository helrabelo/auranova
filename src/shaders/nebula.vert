// Nebula vertex shader
// For volumetric genre clouds

uniform float uTime;

varying vec2 vUv;
varying vec3 vPosition;
varying float vNoise;

// Simple noise function
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
      mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
      mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
      f.y
    ),
    f.z
  );
}

void main() {
  vUv = uv;
  vPosition = position;

  // Animate with noise
  float time = uTime * 0.1;
  vNoise = noise(position * 0.5 + time);

  // Slight vertex displacement for organic movement
  vec3 displaced = position;
  displaced += normal * vNoise * 0.2;

  vec4 modelPosition = modelMatrix * vec4(displaced, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;

  gl_Position = projectionMatrix * viewPosition;
}
