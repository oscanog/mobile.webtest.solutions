import type { AuthUser } from '../../auth-context'
import { requestJson } from '../../lib/api'

export interface UpdateProfilePayload {
  username: string
}

export interface UpdateProfileResponse {
  updated: boolean
  message: string
  user: AuthUser
}

export interface ChangePasswordPayload {
  current_password: string
  password: string
  confirm_password: string
}

export interface ChangePasswordResponse {
  updated: boolean
  message: string
}

export function updateProfile(accessToken: string, payload: UpdateProfilePayload) {
  return requestJson<UpdateProfileResponse>(
    '/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}

export function changePassword(accessToken: string, payload: ChangePasswordPayload) {
  return requestJson<ChangePasswordResponse>(
    '/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}
