const responseCache = new Map<string, { expiresAt: number; value: unknown }>()
const pendingRequests = new Map<string, Promise<unknown>>()

export async function fetchCached<T>(key: string, input: RequestInfo | URL, init?: RequestInit, ttl = 30000): Promise<T> {
  const cached = responseCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value as T

  const pending = pendingRequests.get(key)
  if (pending) return pending as Promise<T>

  const request = fetch(input, init).then(async (response) => {
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
