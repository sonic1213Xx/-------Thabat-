import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly, isValidDivisionCode } from '@/lib/utils'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function parseDivisions(value: string) {
  try { return JSON.parse(value) as string[] } catch { return [] }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { studentIds?: string[]; toDivision?: string; reason?: string; performedByUserId?: string }
    const studentIds = Array.from(new Set(body.studentIds ?? []))
    const toDivision = body.toDivision?.trim() ?? ''
    if (!studentIds.length || !isValidDivisionCode(toDivision) || !body.performedByUserId) return NextResponse.json({ error: 'Students, target division, and acting user are required.' }, { status: 400 })
    const [actor, students] = await Promise.all([
      prisma.user.findUnique({ where: { id: body.performedByUserId } }),
      prisma.student.findMany({ where: { id: { in: studentIds } } }),
    ])
    if (!actor || !students.length || students.length !== studentIds.length) return NextResponse.json({ error: 'Acting user or students were not found.' }, { status: 404 })
    const originalGrades = await prisma.gradebookScore.findMany({ where: { studentId: { in: studentIds } } })
    const recipients = (await prisma.user.findMany({ where: { role: 'TEACHER', isActive: true }, select: { id: true, assignedDivisions: true } })).filter((teacher) => parseDivisions(teacher.assignedDivisions).includes(toDivision))
    const now = new Date()
    const fromDivisions = Array.from(new Set(students.map((student) => student.divisionCode ?? '')))
    await prisma.$transaction(async (tx) => {
      for (const student of students) {
        await tx.student.update({ where: { id: student.id }, data: { divisionCode: toDivision, lastUpdatedBy: actor.id, lastUpdatedByName: actor.name, lastUpdatedByRole: actor.role } })
        await tx.transferHistory.create({ data: { studentId: student.id, fromDivision: student.divisionCode ?? '', toDivision, changedBy: actor.id, performedByName: actor.name, performedByRole: actor.role, reason: body.reason?.trim() || null, transferredAt: now, transferDateOnly: getDateOnly(now), transferTimeOnly: getTimeOnly(now), timestamp: now } })
        await tx.auditLog.create({ data: { userId: actor.id, userName: actor.name, userRole: actor.role, action: 'STUDENT_TRANSFERRED', targetType: 'Division', targetId: student.id, targetName: student.fullName, studentId: student.id, oldValue: student.divisionCode ?? '', newValue: toDivision, details: JSON.stringify({ fromDivision: student.divisionCode, toDivision, reason: body.reason?.trim() || null, bulk: true }), dateOnly: getDateOnly(now), timeOnly: getTimeOnly(now), relativeTime: formatRelativeTimeArabic(now) } })
      }
      if (recipients.length) {
        const studentSnapshot = students.map((student) => ({ id: student.id, fullName: student.fullName, fromDivision: student.divisionCode ?? '', toDivision }))
        const gradeSnapshot = originalGrades.map((grade) => ({ ...grade, customScores: JSON.parse(grade.customScoresJson || '{}') }))
        await Promise.all(recipients.map((recipient) => tx.transferNotification.create({ data: { recipientId: recipient.id, createdBy: actor.id, fromDivision: fromDivisions.join(', '), toDivision, studentIdsJson: JSON.stringify(studentIds), studentSnapshotJson: JSON.stringify(studentSnapshot), gradeSnapshotJson: JSON.stringify(gradeSnapshot) } })))
      }
    })
    return NextResponse.json({ data: { count: students.length, toDivision, notifiedTeachers: recipients.length } })
  } catch (error) {
    console.error('Bulk student transfer failed:', error)
    return NextResponse.json({ error: 'Unable to transfer students.' }, { status: 500 })
  }
}