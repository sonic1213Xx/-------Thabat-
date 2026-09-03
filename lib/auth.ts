export type AppRole = 'CURATOR' | 'PRINCIPAL' | 'VP_STUDENT_AFFAIRS' | 'VP_ACADEMIC_AFFAIRS' | 'VP_OPERATIONS' | 'VICE_PRINCIPAL' | 'TEACHER' | 'COUNSELOR' | 'ACTIVITIES_COORDINATOR' | 'GATE_SECURITY' | 'TRANSPORTATION_SUPERVISOR'

export type SessionUser = { id: string; name: string; role: AppRole }
export type TeachingAssignment = { id: string; subject: string; gradeLevel: number | null; divisions: string[]; attendance: boolean; gradebook: boolean }
export type Profile = SessionUser & {
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
}

export const DEFAULT_CREDENTIALS = { id: '10', password: 'admin123', role: 'CURATOR' as AppRole, name: 'حسين' }
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
let runtimeSession: SessionUser | null = null

export function authenticate(id: string, password: string): SessionUser | null {
  const credentials = TEST_CREDENTIALS.find((item) => item.id === id.trim() && item.password === password)
  if (credentials) return { id: credentials.id, name: credentials.name, role: credentials.role }
  if (typeof window !== 'undefined') {
    try {
      const profile = (JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? '[]') as Profile[]).find((item) => item.id === id.trim() && item.password === password && item.role !== 'CURATOR')
      return profile ? { id: profile.id, name: profile.name, role: profile.role } : null
    } catch { return null }
  }
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
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY)
    const persistence = localStorage.getItem(AUTH_PERSISTENCE_KEY)
    const value = persistence === 'true' || (storedSession && persistence === null) ? storedSession : null
    if (!value && storedSession) localStorage.removeItem(AUTH_STORAGE_KEY)
    return value ? JSON.parse(value) as SessionUser : null
  } catch {
    return null
  }
}

export function setSession(user: SessionUser, remember = true): void {
  if (typeof window === 'undefined') return
  runtimeSession = user
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_PERSISTENCE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    localStorage.setItem(AUTH_PERSISTENCE_KEY, 'true')
  }
  else sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  runtimeSession = null
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_PERSISTENCE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}
