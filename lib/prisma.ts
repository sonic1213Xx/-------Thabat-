import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL
const pooledDatabaseUrl = databaseUrl
  ? (() => {
      const url = new URL(databaseUrl)
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5')
      if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10')
      return url.toString()
    })()
  : undefined

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(pooledDatabaseUrl ? { datasources: { db: { url: pooledDatabaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
