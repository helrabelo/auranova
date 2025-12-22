// Connection line fragment shader
// Creates glowing gradient lines between artists

uniform float uTime;
uniform float uOpacity;
uniform float uHighlight;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Subtle pulse animation
  float pulse = 0.8 + 0.2 * sin(uTime * 2.0);

  // Final color with glow
  vec3 color = vColor * 1.2; // Slight brightness boost

  // Final alpha
  float alpha = vAlpha * uOpacity * uHighlight * pulse;

  gl_FragColor = vec4(color, alpha);
}
