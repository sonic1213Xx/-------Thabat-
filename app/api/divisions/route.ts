import { NextRequest, NextResponse } from 'next/server'
import { getCached, invalidateCache, setCached } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cacheKey = 'thabat:divisions:all'
    const cached = await getCached<Array<{ id: string; code: string; name: string; createdAt: Date; updatedAt: Date }>>(cacheKey)
    if (cached) return NextResponse.json({ data: cached }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } })
    const divisions = await prisma.division.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, createdAt: true, updatedAt: true } })
    await setCached(cacheKey, divisions, 60)
    return NextResponse.json({ data: divisions })
  } catch {
    return NextResponse.json({ error: 'Unable to fetch divisions.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string; name?: string }
    const code = body.code?.trim()

    if (!code) {
      return NextResponse.json({ error: 'Division code is required.' }, { status: 400 })
    }

    const existing = await prisma.division.findUnique({ where: { code }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: 'A division with this code already exists.' }, { status: 409 })
    }

    const division = await prisma.division.create({
      data: {
        code,
        name: body.name?.trim() || `الفصل ${code}`,
      },
    })
    await invalidateCache('thabat:divisions:all')

    return NextResponse.json({ data: division })
  } catch {
    return NextResponse.json({ error: 'Unable to create division.' }, { status: 500 })
  }
}
