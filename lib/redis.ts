import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

export async function getCached<T>(key: string): Promise<T | null> {
  try { return await redis.get<T>(key) } catch (error) { console.warn(`Redis read failed for ${key}:`, error); return null }
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  try { await redis.set(key, value, { ex: ttlSeconds }) } catch (error) { console.warn(`Redis write failed for ${key}:`, error) }
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (!keys.length) return
  try { await redis.del(...keys) } catch (error) { console.warn('Redis invalidation failed:', error) }
}