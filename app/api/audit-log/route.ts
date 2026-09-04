import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

function normalizePositiveInteger(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value ?? String(fallback))
  if (!Number.isFinite(parsed)) return fallback

  const normalized = Math.max(1, Math.floor(parsed))
  return max ? Math.min(normalized, max) : normalized
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateOnly = searchParams.get('dateOnly') || undefined
    const userId = searchParams.get('userId') || undefined
    const studentId = searchParams.get('studentId') || undefined
    const action = searchParams.get('action') || undefined
    const targetType = searchParams.get('targetType') || undefined
    const page = normalizePositiveInteger(searchParams.get('page'), 1, 1000)
    const limit = normalizePositiveInteger(searchParams.get('limit'), 20, 100)
    const skip = (page - 1) * limit

    const where: Prisma.AuditLogWhereInput = {}

    if (dateOnly) {
      where.dateOnly = dateOnly
    }

    if (userId) {
      where.userId = userId
    }

    if (studentId) {
      where.studentId = studentId
    }

    if (action) where.action = action
    if (targetType) where.targetType = targetType

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: true,
          student: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        dateOnly: dateOnly ?? null,
        userId: userId ?? null,
        studentId: studentId ?? null,
      },
    })
  } catch (error) {
    console.error('Audit log fetch failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to fetch audit logs.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { userId?: string; action?: string; targetType?: string; targetId?: string; targetName?: string; studentId?: string; details?: string }
    if (!body.action || !body.targetType) return NextResponse.json({ error: 'action and targetType are required.' }, { status: 400 })
    const actor = body.userId
      ? await prisma.user.findUnique({ where: { id: body.userId } })
      : await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
    if (!actor) return NextResponse.json({ error: 'Audit actor not found.' }, { status: 404 })
    const now = new Date()
    const log = await prisma.auditLog.create({ data: { userId: actor.id, userName: actor.name, userRole: actor.role, action: body.action, targetType: body.targetType, targetId: body.targetId, targetName: body.targetName, studentId: body.studentId, details: body.details, dateOnly: now.toISOString().slice(0, 10), timeOnly: now.toTimeString().slice(0, 8), relativeTime: formatRelativeTimeArabic(now), ipAddress: request.headers.get('x-forwarded-for') ?? 'local', userAgent: request.headers.get('user-agent') ?? 'unknown' } })
    return NextResponse.json({ data: log })
  } catch (error) {
    console.error('Audit log creation failed:', error)
    return NextResponse.json({ error: 'Unable to create audit log.' }, { status: 500 })
  }
}
