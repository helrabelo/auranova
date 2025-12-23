// Planet vertex shader
// Handles instanced sphere rendering with per-instance transforms

uniform float uTime;

// Instance attributes
attribute vec3 instanceColor;
attribute float instanceSize;
attribute float instanceSeed;
attribute float instanceActivation;
attribute float instanceSpawnProgress;

// Varyings to fragment shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSeed;
varying float vActivation;
varying vec2 vUv;

void main() {
  // Get instance matrix (position, rotation, scale)
  vec4 worldPosition = instanceMatrix * vec4(position, 1.0);

  // Apply spawn animation - scale up from 0
  float spawnScale = smoothstep(0.0, 1.0, instanceSpawnProgress);
  worldPosition.xyz = (instanceMatrix * vec4(position * spawnScale, 1.0)).xyz;

  // Transform normal for lighting
  vNormal = normalize(mat3(instanceMatrix) * normal);
  vPosition = position;
  vWorldPosition = worldPosition.xyz;
  vColor = instanceColor;
  vSeed = instanceSeed;
  vActivation = instanceActivation;
  vUv = uv;

  // Final position
  vec4 mvPosition = modelViewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
}
