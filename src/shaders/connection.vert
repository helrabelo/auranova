// Connection line vertex shader
// Passes color and alpha to fragment shader

attribute vec3 aColor;
attribute float aAlpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;

  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
