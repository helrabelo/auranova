/// <reference types="vite/client" />

// GLSL shader imports
declare module '*.glsl' {
  const value: string
  export default value
}

declare module '*.vert' {
  const value: string
  export default value
}

declare module '*.frag' {
  const value: string
  export default value
}

declare module '*.vs' {
  const value: string
  export default value
}

declare module '*.fs' {
  const value: string
  export default value
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_SPOTIFY_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
