import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateOnly } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const dateOnly = getDateOnly(new Date())
    const userId = request.headers.get('x-thabat-user-id')
    const operations = [
      prisma.student.findMany({
        where: { isActive: true },
        orderBy: { fullName: 'asc' },
        select: { id: true, fullName: true, divisionCode: true, gradeLevel: true, behaviorScore: true, attendanceScore: true, createdAt: true },
      }),
      prisma.warning.findMany({
        where: { issuedDateOnly: dateOnly },
        orderBy: { issuedAt: 'desc' },
        select: { id: true, studentId: true, issuedByName: true, issuedAt: true, reason: true, type: true, student: { select: { fullName: true } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 8,
        select: { id: true, action: true, targetType: true, targetName: true, userName: true, userRole: true, details: true, timestamp: true, relativeTime: true },
      }),
      prisma.attendance.findMany({ where: { date: dateOnly }, select: { status: true } }),
      prisma.team.findMany({ orderBy: { label: 'asc' }, select: { id: true, label: true } }),
      prisma.division.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
      prisma.transferNotification.findMany({ where: { recipientId: userId ?? '__anonymous__' }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, recipientId: true, fromDivision: true, toDivision: true, studentIdsJson: true, studentSnapshotJson: true, gradeSnapshotJson: true, readAt: true, reviewedAt: true, createdAt: true } }),
    ]

    const [students, warnings, auditLogs, attendance, teams, divisions, transferNotifications] = await prisma.$transaction(operations)
    return NextResponse.json({
      data: {
        students,
        warnings,
        auditLogs,
        attendance,
        teams,
        divisions,
        transferNotifications,
      },
    })
  } catch (error) {
    console.error('Dashboard data fetch failed:', error)
    return NextResponse.json({ error: 'Unable to fetch dashboard data.' }, { status: 500 })
  }
}
