import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try { return await redis.get<T>(key) } catch (error) { console.warn(`Redis read failed for ${key}:`, error); return null }
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  if (!redis) return
  try { await redis.set(key, value, { ex: ttlSeconds }) } catch (error) { console.warn(`Redis write failed for ${key}:`, error) }
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (!redis || !keys.length) return
  try { await redis.del(...keys) } catch (error) { console.warn('Redis invalidation failed:', error) }
}