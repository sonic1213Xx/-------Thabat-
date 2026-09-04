import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { getDateOnly, getTimeOnly, formatRelativeTimeArabic, isValidDivisionCode } from '@/lib/utils'

import { prisma } from '@/lib/prisma'

async function getActor(userId?: string) {
  if (userId) {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true } })
    if (actor) return actor
  }

  const existing = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, role: true, isActive: true } })
  if (existing) return existing

  return prisma.user.create({
    data: {
      username: 'system',
      name: 'نظام ثَبَت',
      password: 'system-managed',
      role: 'PRINCIPAL',
      isActive: true,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const division = searchParams.get('division')
    const gradeLevel = searchParams.get('gradeLevel')
    const q = searchParams.get('q')
    const isActive = searchParams.get('isActive')

    const where: Prisma.StudentWhereInput = {
      isActive: isActive === 'false' ? false : true,
    }

    if (division && isValidDivisionCode(division)) {
      const legacyDivision = division.match(/^(\d)(\d)\d$/)
        ? `${division[0] === '1' ? 'المستوى الأول' : division[0] === '2' ? 'المستوى الرابع' : 'المستوى السادس'} - الشعبة ${division[1]}`
        : null
      where.AND = [{ OR: legacyDivision ? [{ divisionCode: division }, { divisionCode: legacyDivision }] : [{ divisionCode: division }] }]
    }

    if (gradeLevel) {
      where.gradeLevel = Number(gradeLevel)
    }

    if (q) {
      const normalized = q.trim()
      if (normalized) {
        const searchCondition: Prisma.StudentWhereInput = { OR: [
          { fullName: { contains: normalized } },
          { arabicName: { contains: normalized } },
          { academicId: { contains: normalized } },
          { nationalId: { contains: normalized } },
        ] }
        const existingConditions = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []
        where.AND = [...existingConditions, searchCondition]
      }
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: {
        fullName: 'asc',
      },
      select: {
        id: true, nationalId: true, academicId: true, fullName: true, arabicName: true,
        gradeLevel: true, level: true, gpa: true, parentPhone: true, divisionId: true,
        divisionCode: true, conductNotes: true, behaviorScore: true, attendanceScore: true,
        admissionDate: true, createdAt: true, createdDateOnly: true, createdTimeOnly: true,
        updatedAt: true, lastUpdatedBy: true, lastUpdatedByName: true, lastUpdatedByRole: true,
        isActive: true,
        warnings: { select: { id: true, type: true, reason: true, deduction: true, severity: true, isResolved: true, issuedAt: true, issuedByName: true } },
        attendance: { select: { id: true, date: true, status: true, notes: true, markedBy: true, markedByName: true, updatedAt: true } },
        transferHistory: { select: { id: true, fromDivision: true, toDivision: true, reason: true, transferredAt: true, performedByName: true, performedByRole: true } },
      },
    })

    return NextResponse.json({
      data: students,
      meta: {
        division: division ?? 'all',
        total: students.length,
      },
    })
  } catch (error) {
    console.error('Student fetch failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to fetch students.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fullName,
      arabicName,
      academicId,
      gpa,
      parentPhone,
      level,
      divisionId,
      nationalId,
      gradeLevel,
      divisionCode,
      behaviorScore,
      attendanceScore,
      createdByUserId,
    } = body as {
      fullName?: string
      arabicName?: string
      academicId?: string
      gpa?: number | string
      parentPhone?: string
      level?: string
      divisionId?: string
      nationalId?: string
      gradeLevel?: number
      divisionCode?: string
      behaviorScore?: number
      attendanceScore?: number
      createdByUserId?: string
    }

    if (!fullName) {
      return NextResponse.json(
        {
          error: 'Full name is required.',
        },
        { status: 400 },
      )
    }

    const normalizedDivision = typeof divisionCode === 'string' ? divisionCode.trim() : ''

    if (!isValidDivisionCode(normalizedDivision)) {
      return NextResponse.json(
        {
          error: 'A valid division code is required.',
        },
        { status: 400 },
      )
    }

    const actor = await getActor(createdByUserId)

    const existingStudent = await prisma.student.findUnique({
      where: { nationalId },
    })

    if (existingStudent) {
      return NextResponse.json(
        {
          error: 'A student with this national ID already exists.',
        },
        { status: 409 },
      )
    }

    const now = new Date()
    const student = await prisma.student.create({
      data: {
        fullName,
        arabicName: arabicName ?? fullName,
        academicId: academicId?.trim() || null,
        gpa: gpa === undefined || gpa === '' ? null : Number(gpa),
        parentPhone: parentPhone?.trim() || null,
        level: level?.trim() || null,
        divisionId: divisionId?.trim() || null,
        nationalId,
        gradeLevel: Number(gradeLevel ?? 1),
        divisionCode: normalizedDivision,
        behaviorScore: Number(behaviorScore ?? 100),
        attendanceScore: Number(attendanceScore ?? 100),
        createdDateOnly: getDateOnly(now),
        createdTimeOnly: getTimeOnly(now),
        lastUpdatedBy: actor.id,
        lastUpdatedByName: actor.name,
        lastUpdatedByRole: actor.role,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        action: 'STUDENT_CREATED',
        targetType: 'Student',
        targetId: student.id,
        targetName: student.fullName,
        studentId: student.id,
        details: JSON.stringify({
          divisionCode: student.divisionCode,
          gradeLevel: student.gradeLevel,
          arabicName: student.arabicName,
        }),
        dateOnly: getDateOnly(now),
        timeOnly: getTimeOnly(now),
        relativeTime: formatRelativeTimeArabic(now),
        ipAddress: request.headers.get('x-forwarded-for') ?? 'local',
        userAgent: request.headers.get('user-agent') ?? 'unknown',
      },
    })

    return NextResponse.json({
      message: 'Student created successfully.',
      data: student,
    })
  } catch (error) {
    console.error('Student creation failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to create student.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { studentId?: string; fullName?: string; academicId?: string; gpa?: number | string | null; parentPhone?: string; nationalId?: string; divisionId?: string; divisionCode?: string; gradeLevel?: number | null; level?: string; conductNotes?: string }
    if (!body.studentId || !body.fullName?.trim()) return NextResponse.json({ error: 'Student and name are required.' }, { status: 400 })
    const student = await prisma.student.update({
      where: { id: body.studentId },
      data: {
        fullName: body.fullName.trim(),
        arabicName: body.fullName.trim(),
        academicId: body.academicId?.trim() || null,
        gpa: body.gpa === null || body.gpa === undefined || body.gpa === '' ? null : Number(body.gpa),
        parentPhone: body.parentPhone?.trim() || null,
        nationalId: body.nationalId?.trim() || null,
        divisionId: body.divisionId?.trim() || null,
        divisionCode: body.divisionCode?.trim() || null,
        gradeLevel: body.gradeLevel ?? null,
        level: body.level?.trim() || null,
        conductNotes: body.conductNotes?.trim() || null,
      },
    })
    return NextResponse.json({ data: student })
  } catch (error) {
    console.error('Student update failed:', error)
    return NextResponse.json({ error: 'Unable to update student.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const studentId = new URL(request.url).searchParams.get('id')
    if (!studentId) return NextResponse.json({ error: 'Student id is required.' }, { status: 400 })
    await prisma.student.delete({ where: { id: studentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Student deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete student.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      toDivision,
      reason,
      performedByUserId,
    } = body as {
      studentId?: string
      toDivision?: string
      reason?: string
      performedByUserId?: string
    }

    if (!studentId || !toDivision || !performedByUserId) {
      return NextResponse.json(
        {
          error: 'studentId, toDivision, and performedByUserId are required.',
        },
        { status: 400 },
      )
    }

      const normalizedTargetDivision = typeof toDivision === 'string' ? toDivision.trim() : ''

      if (!isValidDivisionCode(normalizedTargetDivision)) {
      return NextResponse.json(
        {
            error: 'Invalid division target.',
        },
        { status: 400 },
      )
    }

    const actor = await prisma.user.findUnique({
      where: { id: performedByUserId },
    })

    if (!actor) {
      return NextResponse.json(
        {
          error: 'Performer user not found.',
        },
        { status: 404 },
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json(
        {
          error: 'Student not found.',
        },
        { status: 404 },
      )
    }

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
           data: {
             divisionCode: normalizedTargetDivision,
          lastUpdatedBy: actor.id,
          lastUpdatedByName: actor.name,
          lastUpdatedByRole: actor.role,
        },
      })

      await tx.transferHistory.create({
        data: {
          studentId: student.id,
          fromDivision: student.divisionCode ?? '',
             toDivision: normalizedTargetDivision,
          changedBy: actor.id,
          performedByName: actor.name,
          performedByRole: actor.role,
          reason: reason ?? 'نقل داخل الصف الدراسي',
          transferredAt: now,
          transferDateOnly: getDateOnly(now),
          transferTimeOnly: getTimeOnly(now),
          timestamp: now,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'STUDENT_TRANSFERRED',
          targetType: 'Division',
          targetId: student.id,
          targetName: student.fullName,
          studentId: student.id,
          oldValue: student.divisionCode,
             newValue: normalizedTargetDivision,
          details: JSON.stringify({
            fromDivision: student.divisionCode,
            toDivision,
            reason: reason ?? 'نقل داخل الصف الدراسي',
          }),
          dateOnly: getDateOnly(now),
          timeOnly: getTimeOnly(now),
          relativeTime: formatRelativeTimeArabic(now),
          ipAddress: request.headers.get('x-forwarded-for') ?? 'local',
          userAgent: request.headers.get('user-agent') ?? 'unknown',
        },
      })

      return updatedStudent
    })

    return NextResponse.json({
      message: 'Student division updated successfully.',
      data: result,
    })
  } catch (error) {
    console.error('Student transfer failed:', error)
    return NextResponse.json(
      {
        error: 'Unable to transfer student division.',
      },
      { status: 500 },
    )
  }
}
