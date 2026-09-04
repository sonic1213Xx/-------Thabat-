import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestUserId = _request.headers.get('x-thabat-user-id')
    if (!requestUserId) return NextResponse.json({ error: 'Authenticated user is required.' }, { status: 401 })
    const warning = await prisma.warning.findUnique({ where: { id: context.params.id }, include: { student: true } })
    if (!warning) return NextResponse.json({ error: 'Warning not found.' }, { status: 404 })
    const actor = await prisma.user.findUnique({ where: { id: requestUserId } })
    if (!actor || !actor.isActive) return NextResponse.json({ error: 'No active user found.' }, { status: 403 })
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.warning.delete({ where: { id: warning.id } })
      await tx.student.update({ where: { id: warning.studentId }, data: { behaviorScore: Math.min(100, warning.student.behaviorScore + warning.deduction) } })
      await tx.auditLog.create({ data: { userId: actor.id, userName: actor.name, userRole: actor.role, action: 'WARNING_DELETED', targetType: 'Warning', targetId: warning.id, targetName: warning.student.fullName, studentId: warning.studentId, details: JSON.stringify({ deductionRestored: warning.deduction }), dateOnly: getDateOnly(now), timeOnly: getTimeOnly(now), relativeTime: formatRelativeTimeArabic(now) } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Warning deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete warning.' }, { status: 500 })
  }
}
