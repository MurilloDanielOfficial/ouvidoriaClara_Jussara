import type { LoginSession } from '../types'

const SESSION_KEY = 'ouvidoria_session'

export function getSession(): LoginSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as LoginSession
    if (session.expiration_time * 1000 < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function setSession(session: LoginSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isSessionValid(): boolean {
  const session = getSession()
  return session !== null && session.expiration_time * 1000 > Date.now()
}
