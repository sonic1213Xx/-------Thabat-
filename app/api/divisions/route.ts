import { NextRequest, NextResponse } from 'next/server'
import { getCached, invalidateDivisionCaches, setCached } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { authorizeDivisions } from '@/lib/division-auth'

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request)
    if (authorization.status !== 200) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

    const { user, isTeacher, divisionCodes } = authorization
    const cacheKey = `thabat:divisions:${user.id}:${user.role}`
    const cached = await getCached<Array<{ id: string; code: string; name: string; createdAt: Date; updatedAt: Date }>>(cacheKey)
    if (cached) return NextResponse.json({ data: cached }, { headers: { 'Cache-Control': 'private, no-store' } })
    const divisions = await prisma.division.findMany({
      where: isTeacher ? { code: { in: divisionCodes } } : undefined,
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, createdAt: true, updatedAt: true },
    })
    await setCached(cacheKey, divisions, 60)
    return NextResponse.json({ data: divisions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to fetch divisions.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request, true)
    if (authorization.status !== 200) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

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
    await invalidateDivisionCaches()

    return NextResponse.json({ data: division })
  } catch {
    return NextResponse.json({ error: 'Unable to create division.' }, { status: 500 })
  }
}
