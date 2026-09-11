import type { Locale } from '@/lib/translations'

export type AppRole = 'CREATOR' | 'PRINCIPAL' | 'VP_STUDENT_AFFAIRS' | 'VP_ACADEMIC_AFFAIRS' | 'VP_OPERATIONS' | 'VICE_PRINCIPAL' | 'TEACHER' | 'COUNSELOR' | 'ACTIVITIES_COORDINATOR' | 'GATE_SECURITY' | 'TRANSPORTATION_SUPERVISOR'

export type SessionUser = { id: string; name: string; role: AppRole }
export type TeachingAssignment = { id: string; subject: string; gradeLevel: number | null; divisions: string[]; attendance: boolean; gradebook: boolean }
export type Profile = SessionUser & {
  locale?: Locale
  password: string
  createdAt: string
  lastActivity: string
  signature?: string
  subject?: string
  gradeLevel?: number | null
  assigned_divisions?: string[]
  busRouteIds?: string[]
  defaultView?: string
  teachingAssignments?: TeachingAssignment[]
  subjectsTaught?: string[]
}

export const DEFAULT_CREDENTIALS = { id: '10', password: 'admin123', role: 'CREATOR' as AppRole, name: 'حسين' }
const TEST_CREDENTIALS: Array<{ id: string; password: string; role: AppRole; name: string }> = [
  DEFAULT_CREDENTIALS,
  { id: '11', password: 'principal123', role: 'PRINCIPAL', name: 'مدير المدرسة' },
  { id: '12', password: 'vp123', role: 'VICE_PRINCIPAL', name: 'وكيل شؤون الطلاب' },
  { id: '13', password: 'teacher123', role: 'TEACHER', name: 'المعلم' },
]
export const AUTH_STORAGE_KEY = 'thabat-session'
export const AUTH_PERSISTENCE_KEY = 'thabat-session-persistent'
export const PROFILES_STORAGE_KEY = 'thabat-profiles'
export const SIGNATURES_STORAGE_KEY = 'thabat-profile-signatures'
export const WELCOME_LOGIN_KEY = 'thabat-welcome-login'
let runtimeSession: SessionUser | null = null

export function authenticate(id: string, password: string): SessionUser | null {
  const credentials = TEST_CREDENTIALS.find((item) => item.id === id.trim() && item.password === password)
  if (credentials) return { id: credentials.id, name: credentials.name, role: credentials.role }
  return null
}

export function getProfiles(): Profile[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? '[]') as Profile[] } catch { return [] }
}

export function saveProfile(profile: Profile): void {
  if (typeof window !== 'undefined') localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([...getProfiles().filter((item) => item.id !== profile.id), profile]))
}

export function deleteProfile(id: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(getProfiles().filter((item) => item.id !== id)))
}

export function getCurrentProfile(): Profile | null {
  const session = getSession()
  if (!session) return null
  if (session.id === DEFAULT_CREDENTIALS.id) return { ...DEFAULT_CREDENTIALS, password: DEFAULT_CREDENTIALS.password, createdAt: '', lastActivity: 'الآن', signature: getProfileSignature(session.id) ?? undefined }
  return getProfiles().find((profile) => profile.id === session.id) ?? null
}

export function getProfileSignature(id?: string): string | null {
  if (typeof window === 'undefined') return null
  const profileId = id ?? getSession()?.id
  if (!profileId) return null
  try { return (JSON.parse(localStorage.getItem(SIGNATURES_STORAGE_KEY) ?? '{}') as Record<string, string>)[profileId] ?? null } catch { return null }
}

export function saveProfileSignature(signature: string | null, id?: string): void {
  if (typeof window === 'undefined') return
  const profileId = id ?? getSession()?.id
  if (!profileId) return
  try {
    const signatures = JSON.parse(localStorage.getItem(SIGNATURES_STORAGE_KEY) ?? '{}') as Record<string, string>
    if (signature) signatures[profileId] = signature
    else delete signatures[profileId]
    localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(signatures))
    const profile = getProfiles().find((item) => item.id === profileId)
    if (profile) saveProfile({ ...profile, signature: signature ?? undefined })
    window.dispatchEvent(new CustomEvent('thabat-profile-signature-changed', { detail: { id: profileId, signature } }))
  } catch { /* Ignore malformed local profile data. */ }
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null
  try {
    if (runtimeSession) return runtimeSession

    // Check persistent (localStorage) session first
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY)
    const persistence = localStorage.getItem(AUTH_PERSISTENCE_KEY)
    const persistentValue = persistence === 'true' ? storedSession : null

    // Fall back to session-only (sessionStorage) session for users who didn't check "remember me"
    const sessionValue = persistentValue ?? sessionStorage.getItem(AUTH_STORAGE_KEY)

    // If there's a stale localStorage entry with no valid persistence flag, clean it up
    if (!persistentValue && storedSession) localStorage.removeItem(AUTH_STORAGE_KEY)

    const session = sessionValue ? JSON.parse(sessionValue) as SessionUser : null
    if (session && typeof document !== 'undefined' && !document.cookie.includes('THABAT_USER_ID=')) {
      document.cookie = `THABAT_USER_ID=${encodeURIComponent(session.id)}; Max-Age=31536000; Path=/; SameSite=Lax`
    }
    return session
  } catch {
    return null
  }
}

export function setSession(user: SessionUser, remember = true): void {
  if (typeof window === 'undefined') return
  runtimeSession = user
  // Prototype identity context for API routes; this is not a signed session token.
  document.cookie = `THABAT_USER_ID=${encodeURIComponent(user.id)}; Max-Age=31536000; Path=/; SameSite=Lax`
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_PERSISTENCE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    localStorage.setItem(AUTH_PERSISTENCE_KEY, 'true')
  }
  else sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  localStorage.setItem(WELCOME_LOGIN_KEY, `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
  window.dispatchEvent(new CustomEvent('thabat-session-changed', { detail: user }))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  runtimeSession = null
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_PERSISTENCE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  document.cookie = 'THABAT_USER_ID=; Max-Age=0; Path=/; SameSite=Lax'
  window.dispatchEvent(new CustomEvent('thabat-session-changed', { detail: null }))
}

