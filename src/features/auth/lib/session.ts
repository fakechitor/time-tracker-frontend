import { ApiError } from '../../../shared/api/http'
import { getMe, refreshTokens } from '../api/authApi'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenStorage'
import type { AuthUser } from '../model/types'

export async function getCurrentUser(): Promise<AuthUser> {
  const accessToken = getAccessToken()
  if (!accessToken) {
    throw new ApiError('Missing access token', 401)
  }

  try {
    return await getMe(accessToken)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearTokens()
    throw new ApiError('Missing refresh token', 401)
  }

  const nextTokens = await refreshTokens(refreshToken)
  saveTokens(nextTokens)
  return getMe(nextTokens.access_token)
}
