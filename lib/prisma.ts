import { PrismaClient } from '@prisma/client'

const getConnectionLimitedUrl = () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return undefined

  const url = new URL(databaseUrl)
  url.searchParams.set('connection_limit', '1')
  return url.toString()
}

// DATABASE_URL should be the pooled PgBouncer URL in production. Prisma CLI uses
// POSTGRES_URL through the schema's directUrl for migrations and db push.

const prismaClientSingleton = () => {
  const databaseUrl = getConnectionLimitedUrl()
  return databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient()
}

const globalForPrisma = globalThis as typeof globalThis & {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
}

const prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaGlobal = prisma
