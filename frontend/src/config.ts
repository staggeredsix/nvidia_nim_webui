const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

const sanitizeBaseUrl = (value?: string) => value?.replace(/\/+$/, '')

const apiBaseFromEnv = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
const wsBaseFromEnv = sanitizeBaseUrl(import.meta.env.VITE_WS_BASE_URL)

export const API_BASE_URL = apiBaseFromEnv ?? `http://${defaultHost}:7000`
export const WS_BASE_URL = wsBaseFromEnv ?? API_BASE_URL.replace(/^http(s?):/i, 'ws$1:')

