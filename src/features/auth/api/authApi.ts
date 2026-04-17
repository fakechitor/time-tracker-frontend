import { API_BASE_URL } from '../../../shared/config/env'
import { requestJson } from '../../../shared/api/http'
import type { AuthUser, LoginPayload, RegisterPayload, TokenPair } from '../model/types'

export function register(payload: RegisterPayload) {
  return requestJson<TokenPair>(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    body: payload,
  })
}

export function login(payload: LoginPayload) {
  return requestJson<TokenPair>(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: payload,
  })
}

export function refreshTokens(refreshToken: string) {
  return requestJson<TokenPair>(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: refreshToken },
  })
}

export function getMe(accessToken: string) {
  return requestJson<AuthUser>(`${API_BASE_URL}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
