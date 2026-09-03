import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const studentId = context.params.id

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, divisionCode: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get all attendance records for this student, ordered by date descending (most recent first)
    const records = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        status: true,
        notes: true,
        markedBy: true,
        markedByName: true,
        updatedAt: true,
      },
    })

    // Calculate statistics
    const stats = {
      totalDays: records.length,
      presentCount: records.filter((r) => r.status === 'PRESENT').length,
      excusedCount: records.filter((r) => r.status === 'ABSENT_EXCUSED').length,
      unexcusedCount: records.filter((r) => r.status === 'ABSENT_UNEXCUSED').length,
      lateCount: records.filter((r) => r.status === 'LATE').length,
    }

    return NextResponse.json({
      data: {
        student,
        records,
        stats,
      },
    })
  } catch (error) {
    console.error('Student attendance history error:', error)
    return NextResponse.json({ error: 'Unable to fetch student attendance history' }, { status: 500 })
  }
}
