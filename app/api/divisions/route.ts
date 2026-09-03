import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function GET() {
  try {
    const divisions = await prisma.division.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, createdAt: true, updatedAt: true } })
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

    return NextResponse.json({ data: division })
  } catch {
    return NextResponse.json({ error: 'Unable to create division.' }, { status: 500 })
  }
}
