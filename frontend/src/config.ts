const defaultOrigin = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:7000'

const sanitizeBaseUrl = (value?: string) => value?.replace(/\/+$/, '')

const apiBaseFromEnv = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
const wsBaseFromEnv = sanitizeBaseUrl(import.meta.env.VITE_WS_BASE_URL)

const sanitizedDefaultOrigin = sanitizeBaseUrl(defaultOrigin)

export const API_BASE_URL = apiBaseFromEnv ?? `${sanitizedDefaultOrigin}/api`
export const WS_BASE_URL = wsBaseFromEnv ?? sanitizeBaseUrl(
  API_BASE_URL
    .replace(/^http(s?):/i, 'ws$1:')
    .replace(/\/?api$/i, '')
)

