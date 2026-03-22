const DEMO_AUTH_KEY = 'bugcatcher_mobileweb_demo_auth'

export function isDemoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(DEMO_AUTH_KEY) === '1'
}

export function setDemoAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') return
  if (value) {
    window.localStorage.setItem(DEMO_AUTH_KEY, '1')
    return
  }

  window.localStorage.removeItem(DEMO_AUTH_KEY)
}
