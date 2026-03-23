/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type SystemRole = 'super_admin' | 'admin' | 'user'
export type OrgRole =
  | 'owner'
  | 'member'
  | 'Project Manager'
  | 'QA Lead'
  | 'Senior Developer'
  | 'Senior QA'
  | 'Junior Developer'
  | 'QA Tester'

export interface Membership {
  org_id: number
  org_name: string
  role: OrgRole
  is_owner: boolean
}

export interface AuthUser {
  id: number
  username: string
  email: string
  role: SystemRole
}

interface StoredTokens {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
  activeOrgId: number
}

export interface AuthSession extends StoredTokens {
  user: AuthUser
  memberships: Membership[]
}

interface AuthActionResult {
  ok: boolean
  message?: string
  error?: string
}

interface LoginPayload {
  email: string
  password: string
  activeOrgId?: number
}

interface SignupPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface ResetPasswordPayload {
  email: string
  password: string
  confirmPassword: string
}

interface AuthContextValue {
  status: 'bootstrapping' | 'anonymous' | 'authenticated'
  session: AuthSession | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  memberships: Membership[]
  activeMembership: Membership | null
  activeOrgId: number
  hasActiveOrg: boolean
  defaultAppPath: string
  login: (payload: LoginPayload) => Promise<AuthActionResult>
  logout: () => Promise<void>
  signup: (payload: SignupPayload) => Promise<AuthActionResult>
  requestOtp: (email: string) => Promise<AuthActionResult>
  resendOtp: (email: string) => Promise<AuthActionResult>
  verifyOtp: (email: string, otp: string) => Promise<AuthActionResult>
  resetPassword: (payload: ResetPasswordPayload) => Promise<AuthActionResult>
  refreshSession: () => Promise<boolean>
  setActiveOrg: (orgId: number) => Promise<AuthActionResult>
}

interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: {
    code?: string
    message?: string
  }
}

interface LoginResponse {
  user: AuthUser
  active_org_id: number
  tokens: {
    access_token: string
    access_expires_in: number
    refresh_token: string
    refresh_expires_in: number
  }
}

interface MeResponse {
  user: AuthUser
  active_org_id: number
  memberships: Membership[]
}

interface RefreshResponse {
  active_org_id: number
  tokens: {
    access_token: string
    access_expires_in: number
    refresh_token: string
    refresh_expires_in: number
  }
}

const AUTH_STORAGE_KEY = 'bugcatcher-mobileweb-auth-session'
const DEFAULT_API_BASE_PATH = '/api/v1'
const API_BASE_PATH = (import.meta.env.VITE_API_BASE_PATH?.trim() || DEFAULT_API_BASE_PATH).replace(/\/+$/, '')

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeRole(value: string): SystemRole {
  return value === 'super_admin' || value === 'admin' ? value : 'user'
}

function readStoredTokens(): StoredTokens | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>
    if (
      !parsed.accessToken ||
      !parsed.refreshToken ||
      typeof parsed.accessExpiresAt !== 'number' ||
      typeof parsed.refreshExpiresAt !== 'number'
    ) {
      return null
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      accessExpiresAt: parsed.accessExpiresAt,
      refreshExpiresAt: parsed.refreshExpiresAt,
      activeOrgId: typeof parsed.activeOrgId === 'number' ? parsed.activeOrgId : 0,
    }
  } catch {
    return null
  }
}

function persistStoredTokens(session: StoredTokens | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers,
  })

  const envelope = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !envelope.ok || envelope.data === undefined) {
    throw new ApiError(response.status, envelope.error?.message || 'Request failed.')
  }

  return envelope.data
}

function buildStoredTokens(payload: LoginResponse['tokens'] | RefreshResponse['tokens'], activeOrgId: number): StoredTokens {
  const now = Date.now()
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    accessExpiresAt: now + payload.access_expires_in * 1000,
    refreshExpiresAt: now + payload.refresh_expires_in * 1000,
    activeOrgId,
  }
}

function buildSession(me: MeResponse, tokens: StoredTokens): AuthSession {
  return {
    ...tokens,
    activeOrgId: me.active_org_id,
    user: {
      ...me.user,
      role: normalizeRole(me.user.role),
    },
    memberships: me.memberships,
  }
}

function getActiveMembership(session: AuthSession | null): Membership | null {
  if (!session) {
    return null
  }

  return session.memberships.find((membership) => membership.org_id === session.activeOrgId) ?? null
}

export function getDefaultAppPath(session: AuthSession | null): string {
  if (!session) {
    return '/login'
  }

  return session.activeOrgId > 0 ? '/app/dashboard' : '/app/organizations'
}

export function hasSystemRole(session: AuthSession | null, role: SystemRole): boolean {
  return session?.user.role === role
}

export function hasOrgRole(session: AuthSession | null, role: OrgRole): boolean {
  const activeMembership = getActiveMembership(session)
  return activeMembership?.role === role
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('bootstrapping')
  const [session, setSession] = useState<AuthSession | null>(null)

  const applySession = (nextSession: AuthSession | null) => {
    setSession(nextSession)
    persistStoredTokens(nextSession)
    setStatus(nextSession ? 'authenticated' : 'anonymous')
  }

  const hydrateSession = async (storedTokens: StoredTokens): Promise<AuthSession> => {
    try {
      const me = await requestJson<MeResponse>('/auth/me', { method: 'GET' }, storedTokens.accessToken)
      return buildSession(me, storedTokens)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error
      }
    }

    const refreshed = await requestJson<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: storedTokens.refreshToken }),
    })
    const nextTokens = buildStoredTokens(refreshed.tokens, refreshed.active_org_id)
    const me = await requestJson<MeResponse>('/auth/me', { method: 'GET' }, nextTokens.accessToken)
    return buildSession(me, nextTokens)
  }

  useEffect(() => {
    const bootstrap = async () => {
      const storedTokens = readStoredTokens()
      if (!storedTokens) {
        setStatus('anonymous')
        return
      }

      try {
        const hydratedSession = await hydrateSession(storedTokens)
        applySession(hydratedSession)
      } catch {
        applySession(null)
      }
    }

    void bootstrap()
  }, [])

  const activeMembership = getActiveMembership(session)
  const value: AuthContextValue = {
    status,
    session,
    isBootstrapping: status === 'bootstrapping',
    isAuthenticated: Boolean(session),
    user: session?.user ?? null,
    memberships: session?.memberships ?? [],
    activeMembership,
    activeOrgId: session?.activeOrgId ?? 0,
    hasActiveOrg: (session?.activeOrgId ?? 0) > 0,
    defaultAppPath: getDefaultAppPath(session),
    login: async ({ email, password, activeOrgId }) => {
      try {
        const login = await requestJson<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            ...(activeOrgId ? { active_org_id: activeOrgId } : {}),
          }),
        })
        const tokens = buildStoredTokens(login.tokens, login.active_org_id)
        const me = await requestJson<MeResponse>('/auth/me', { method: 'GET' }, tokens.accessToken)
        applySession(buildSession(me, tokens))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to login.') }
      }
    },
    logout: async () => {
      const accessToken = session?.accessToken

      try {
        if (accessToken) {
          await requestJson<{ logged_out: boolean }>(
            '/auth/logout',
            {
              method: 'POST',
              body: JSON.stringify({}),
            },
            accessToken,
          )
        }
      } catch {
        // Logout should still clear local auth state even if the server request fails.
      }

      applySession(null)
    },
    signup: async ({ username, email, password, confirmPassword }) => {
      try {
        const response = await requestJson<{ message: string }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            username,
            email,
            password,
            confirm_password: confirmPassword,
          }),
        })
        return { ok: true, message: response.message }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to create account.') }
      }
    },
    requestOtp: async (email) => {
      try {
        const response = await requestJson<{ message: string }>('/auth/forgot/request-otp', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        return { ok: true, message: response.message }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to request reset code.') }
      }
    },
    resendOtp: async (email) => {
      try {
        const response = await requestJson<{ message: string }>('/auth/forgot/resend-otp', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        return { ok: true, message: response.message }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to resend reset code.') }
      }
    },
    verifyOtp: async (email, otp) => {
      try {
        const response = await requestJson<{ message: string }>('/auth/forgot/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email, otp }),
        })
        return { ok: true, message: response.message }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to verify reset code.') }
      }
    },
    resetPassword: async ({ email, password, confirmPassword }) => {
      try {
        const response = await requestJson<{ message: string }>('/auth/forgot/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            confirm_password: confirmPassword,
          }),
        })
        return { ok: true, message: response.message }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to reset password.') }
      }
    },
    refreshSession: async () => {
      const storedTokens = session ?? readStoredTokens()
      if (!storedTokens) {
        applySession(null)
        return false
      }

      try {
        const refreshedSession = await hydrateSession(storedTokens)
        applySession(refreshedSession)
        return true
      } catch {
        applySession(null)
        return false
      }
    },
    setActiveOrg: async (orgId) => {
      if (!session) {
        return { ok: false, error: 'Authentication required.' }
      }

      try {
        const response = await requestJson<RefreshResponse>(
          '/session/active-org',
          {
            method: 'PUT',
            body: JSON.stringify({ org_id: orgId }),
          },
          session.accessToken,
        )
        const tokens = buildStoredTokens(response.tokens, response.active_org_id)
        const me = await requestJson<MeResponse>('/auth/me', { method: 'GET' }, tokens.accessToken)
        applySession(buildSession(me, tokens))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Unable to change active organization.') }
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
