// Planet fragment shader
// Creates procedural planet textures with lighting

uniform float uTime;
uniform float uGlowIntensity;
uniform vec3 uLightDirection;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSeed;
varying float vActivation;
varying vec2 vUv;

// Simplex noise functions for procedural textures
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractal brownian motion for more complex patterns
float fbm(vec3 p, float seed) {
  float value = 0.0;
  float amplitude = 0.5;
  vec3 offset = vec3(seed * 100.0);

  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p + offset);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Normalize the normal
  vec3 normal = normalize(vNormal);

  // Create procedural surface pattern based on seed
  vec3 noisePos = vPosition * 3.0 + vec3(vSeed * 123.456);
  float noise1 = fbm(noisePos, vSeed);
  float noise2 = fbm(noisePos * 2.0 + vec3(50.0), vSeed + 1.0);

  // Create color variations
  vec3 baseColor = vColor;
  vec3 darkColor = baseColor * 0.4;
  vec3 lightColor = baseColor * 1.4 + vec3(0.1);

  // Mix colors based on noise for surface variation
  float colorMix = smoothstep(-0.3, 0.3, noise1);
  vec3 surfaceColor = mix(darkColor, baseColor, colorMix);

  // Add secondary pattern (like cloud bands or terrain)
  float pattern = smoothstep(0.0, 0.2, noise2) * 0.3;
  surfaceColor = mix(surfaceColor, lightColor, pattern);

  // Lighting calculation
  vec3 lightDir = normalize(uLightDirection);
  float NdotL = dot(normal, lightDir);

  // Diffuse lighting with wrap-around for softer look
  float diffuse = NdotL * 0.5 + 0.5;
  diffuse = pow(diffuse, 1.2);

  // Fresnel rim lighting for atmospheric glow
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
  fresnel = pow(fresnel, 3.0);

  // Atmospheric rim color (slightly lighter than base)
  vec3 rimColor = baseColor * 1.5 + vec3(0.2, 0.2, 0.3);

  // Combine lighting
  vec3 finalColor = surfaceColor * diffuse;
  finalColor += rimColor * fresnel * uGlowIntensity;

  // Add subtle specular highlight
  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
  finalColor += vec3(1.0) * specular * 0.3;

  // Apply activation (for reveal animation)
  float alpha = vActivation;

  // Add subtle glow at edges
  float edgeGlow = fresnel * 0.5 * uGlowIntensity;
  finalColor += baseColor * edgeGlow;

  gl_FragColor = vec4(finalColor, alpha);
}
