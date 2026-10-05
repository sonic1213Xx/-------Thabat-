import { expireSession } from '@/lib/auth'

const responseCache = new Map<string, { expiresAt: number; value: unknown }>()
const pendingRequests = new Map<string, Promise<unknown>>()
let pendingSessionCheck: Promise<boolean> | null = null

function clearCaches() {
  responseCache.clear()
  pendingRequests.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('thabat-session-changed', clearCaches)
  window.addEventListener('thabat-auth-expired', clearCaches)
}

function validateCachedSession() {
  if (!pendingSessionCheck) {
    pendingSessionCheck = fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 401) expireSession()
        if (!response.ok && response.status !== 401) throw new Error(`Session check failed: ${response.status}`)
        return response.ok
      })
      .finally(() => { pendingSessionCheck = null })
  }
  return pendingSessionCheck
}

export async function fetchCached<T>(key: string, input: RequestInfo | URL, init?: RequestInit, ttl = 30000): Promise<T> {
  const cached = responseCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    if (!(await validateCachedSession())) throw new Error('Session expired')
    return cached.value as T
  }

  const pending = pendingRequests.get(key)
  if (pending) return pending as Promise<T>

  const request = fetch(input, init).then(async (response) => {
    if (response.status === 401) {
      clearCaches()
      expireSession()
    }
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    const value = await response.json() as T
    responseCache.set(key, { expiresAt: Date.now() + ttl, value })
    return value
  }).finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, request)
  return request
}

export function invalidateCached(...keys: string[]): void {
  for (const key of keys) responseCache.delete(key)
}
