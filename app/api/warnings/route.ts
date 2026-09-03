import { PrismaClient, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { getDateOnly, getTimeOnly, formatRelativeTimeArabic } from '@/lib/utils'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId') || undefined
    const dateOnly = searchParams.get('dateOnly') || undefined
    const limit = Number(searchParams.get('limit') ?? '50') || 50

    const where: Prisma.WarningWhereInput = {}

    if (studentId) {
      where.studentId = studentId
    }

    if (dateOnly) {
      where.issuedDateOnly = dateOnly
    }

    const warnings = await prisma.warning.findMany({
      where,
      include: {
        student: true,
        issuedByUser: true,
      },
      orderBy: {
        issuedAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({
      data: warnings,
      meta: {
        total: warnings.length,
        studentId: studentId ?? null,
        dateOnly: dateOnly ?? null,
      },
    })
  } catch (error) {
    console.error('Warning fetch failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to fetch warnings.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestUserId = request.headers.get('x-thabat-user-id')
    if (!requestUserId) return NextResponse.json({ error: 'Authenticated user is required.' }, { status: 401 })
    const body = await request.json()
    const {
      studentId,
      studentName,
      issuedByUserId,
      type,
      reason,
      deduction,
      severity,
    } = body as {
      studentId?: string
      studentName?: string
      issuedByUserId?: string
      type?: string
      reason?: string
      deduction?: number
      severity?: string
    }

    const resolvedStudentId = studentId || (studentName?.trim() ? (await prisma.student.findFirst({ where: { fullName: studentName.trim() } }))?.id : undefined)

    if (!resolvedStudentId) {
      return NextResponse.json(
        {
          error: 'studentId and issuedByUserId are required.',
        },
        { status: 400 },
      )
    }

    const actor = await prisma.user.findUnique({ where: { id: requestUserId } })

    if (!actor || !actor.isActive) {
      return NextResponse.json(
        {
          error: 'Issuer user not found.',
        },
        { status: 404 },
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: resolvedStudentId },
    })

    if (!student) {
      return NextResponse.json(
        {
          error: 'Student not found.',
        },
        { status: 404 },
      )
    }

    const deductionAmount = Number(deduction ?? 2)
    const nextBehaviorScore = Math.max(0, student.behaviorScore - deductionAmount)
    const now = new Date()

    const warning = await prisma.$transaction(async (tx) => {
      const createdWarning = await tx.warning.create({
        data: {
          studentId: student.id,
          issuedBy: actor.id,
          issuedByName: actor.name,
          issuedByRole: actor.role,
          type: (type ?? 'TARDINESS') as any,
          reason: reason ?? 'إصدار إنذار إداري',
          deduction: deductionAmount,
          severity: (severity ?? 'MINOR') as any,
          issuedAt: now,
          issuedDateOnly: getDateOnly(now),
          issuedTimeOnly: getTimeOnly(now),
          isResolved: false,
        },
      })

      await tx.student.update({
        where: { id: student.id },
        data: {
          behaviorScore: nextBehaviorScore,
          lastUpdatedBy: actor.id,
          lastUpdatedByName: actor.name,
          lastUpdatedByRole: actor.role,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'WARNING_ISSUED',
          targetType: 'Warning',
          targetId: createdWarning.id,
          targetName: student.fullName,
          studentId: student.id,
          oldValue: String(student.behaviorScore),
          newValue: String(nextBehaviorScore),
          details: JSON.stringify({
            warningType: type ?? 'TARDINESS',
            deduction: deductionAmount,
            reason: reason ?? 'إصدار إنذار إداري',
            severity: severity ?? 'MINOR',
          }),
          dateOnly: getDateOnly(now),
          timeOnly: getTimeOnly(now),
          relativeTime: formatRelativeTimeArabic(now),
          ipAddress: request.headers.get('x-forwarded-for') ?? 'local',
          userAgent: request.headers.get('user-agent') ?? 'unknown',
        },
      })

      return createdWarning
    })

    const warningWithStudent = await prisma.warning.findUnique({ where: { id: warning.id }, include: { student: true } })

    return NextResponse.json({
      message: 'Warning issued successfully.',
      data: warningWithStudent,
      updatedBehaviorScore: Math.max(0, student.behaviorScore - Number(deduction ?? 2)),
    })
  } catch (error) {
    console.error('Warning creation failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to issue warning.',
      },
      { status: 500 },
    )
  }
}
