import '@testing-library/jest-dom'

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock localStorage
const localStorageMock = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
  clear: () => {},
  length: 0,
  key: (_index: number) => null,
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock crypto.subtle for PKCE tests
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: async (_algorithm: string, data: BufferSource) => {
        // Simple mock - in real tests you might want a proper implementation
        const buffer = data as ArrayBuffer
        return buffer
      },
    },
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    },
  },
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver = ResizeObserverMock

// Mock WebGL context for Three.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(HTMLCanvasElement.prototype as any).getContext = function (
  contextId: string
) {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return {
      getExtension: () => null,
      getParameter: () => 1,
      getShaderPrecisionFormat: () => ({
        precision: 1,
        rangeMin: 1,
        rangeMax: 1,
      }),
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      useProgram: () => {},
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enable: () => {},
      disable: () => {},
      blendFunc: () => {},
      viewport: () => {},
      clear: () => {},
      clearColor: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      drawArrays: () => {},
      drawElements: () => {},
      getUniformLocation: () => ({}),
      uniformMatrix4fv: () => {},
      uniform1f: () => {},
      uniform3fv: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      getAttribLocation: () => 0,
    }
  }
  return null
}
