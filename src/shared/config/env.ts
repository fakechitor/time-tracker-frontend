const appPort = (import.meta.env.VITE_APP_PORT as string | undefined) ?? '18080'
const defaultApiBaseUrl = `http://localhost:${appPort}`

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? defaultApiBaseUrl
