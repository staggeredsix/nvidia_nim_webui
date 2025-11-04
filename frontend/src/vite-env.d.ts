/// <reference types="vite/client" />

interface AppImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_BASE_URL?: string
}

declare global {
  interface ImportMetaEnv extends AppImportMetaEnv {}
}

export {}

