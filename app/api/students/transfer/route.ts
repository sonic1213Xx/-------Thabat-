import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getDateOnly, getTimeOnly, formatRelativeTimeArabic, isValidDivisionCode } from '@/lib/utils'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function parseDivisions(value: string) {
  try { return JSON.parse(value) as string[] } catch { return [] }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { studentId?: string; toDivision?: string; reason?: string; performedByUserId?: string }
    const toDivision = body.toDivision?.trim() ?? ''
    if (!body.studentId || !isValidDivisionCode(toDivision)) return NextResponse.json({ error: 'Student and target division are required.' }, { status: 400 })
    const actor = body.performedByUserId ? await prisma.user.findUnique({ where: { id: body.performedByUserId } }) : await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
    const student = await prisma.student.findUnique({ where: { id: body.studentId } })
    if (!actor || !student) return NextResponse.json({ error: 'Student or acting user was not found.' }, { status: 404 })
    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.student.update({ where: { id: student.id }, data: { divisionCode: toDivision, lastUpdatedBy: actor.id, lastUpdatedByName: actor.name, lastUpdatedByRole: actor.role } })
      await tx.transferHistory.create({ data: { studentId: student.id, fromDivision: student.divisionCode ?? '', toDivision, changedBy: actor.id, performedByName: actor.name, performedByRole: actor.role, reason: body.reason?.trim() || null, transferredAt: now, transferDateOnly: getDateOnly(now), transferTimeOnly: getTimeOnly(now), timestamp: now } })
      await tx.auditLog.create({ data: { userId: actor.id, userName: actor.name, userRole: actor.role, action: 'STUDENT_TRANSFERRED', targetType: 'Division', targetId: student.id, targetName: student.fullName, studentId: student.id, oldValue: student.divisionCode ?? '', newValue: toDivision, details: body.reason?.trim() || null, dateOnly: getDateOnly(now), timeOnly: getTimeOnly(now), relativeTime: formatRelativeTimeArabic(now) } })
      return result
    })
    const [originalGrades, teachers] = await Promise.all([
      prisma.gradebookScore.findMany({ where: { studentId: student.id } }),
      prisma.user.findMany({ where: { role: 'TEACHER', isActive: true }, select: { id: true, assignedDivisions: true } }),
    ])
    const recipients = teachers.filter((teacher) => parseDivisions(teacher.assignedDivisions).includes(toDivision))
    if (recipients.length) {
      const studentSnapshot = [{ id: student.id, fullName: student.fullName, fromDivision: student.divisionCode ?? '', toDivision }]
      const gradeSnapshot = originalGrades.map((grade) => ({ ...grade, customScores: JSON.parse(grade.customScoresJson || '{}') }))
      await Promise.all(recipients.map((recipient) => prisma.transferNotification.create({ data: { recipientId: recipient.id, createdBy: actor.id, fromDivision: student.divisionCode ?? '', toDivision, studentIdsJson: JSON.stringify([student.id]), studentSnapshotJson: JSON.stringify(studentSnapshot), gradeSnapshotJson: JSON.stringify(gradeSnapshot) } })))
    }
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Student transfer failed:', error)
    return NextResponse.json({ error: 'Unable to transfer student.' }, { status: 500 })
  }
}
