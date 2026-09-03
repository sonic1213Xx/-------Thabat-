import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic } from '@/lib/utils'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { studentId?: string; divisionId?: string; subject?: string; teacherId?: string; field?: string; oldValue?: number | null; newValue?: number | null }
    if (!body.studentId || !body.divisionId || !body.subject || !body.field) return NextResponse.json({ error: 'studentId, divisionId, subject, and field are required.' }, { status: 400 })
    const now = new Date()
    const log = await prisma.gradebookModificationLog.create({ data: { studentId: body.studentId, divisionId: body.divisionId, teacherId: body.teacherId || null, field: body.field, oldValue: body.oldValue == null ? null : String(body.oldValue), newValue: body.newValue == null ? null : String(body.newValue) } })
    const actor = body.teacherId ? await prisma.user.findUnique({ where: { id: body.teacherId } }) : null
    if (actor) await prisma.auditLog.create({ data: { userId: actor.id, userName: actor.name, userRole: actor.role, action: 'GRADEBOOK_SCORE_UPDATED', targetType: 'Gradebook', targetId: log.id, targetName: body.divisionId, studentId: body.studentId, oldValue: body.oldValue == null ? null : String(body.oldValue), newValue: body.newValue == null ? null : String(body.newValue), details: JSON.stringify({ divisionId: body.divisionId, subject: body.subject, field: body.field }), dateOnly: now.toISOString().slice(0, 10), timeOnly: now.toTimeString().slice(0, 8), relativeTime: formatRelativeTimeArabic(now) } })
    return NextResponse.json({ data: log })
  } catch (error) {
    console.error('Gradebook audit log failed:', error)
    return NextResponse.json({ error: 'Unable to record gradebook change.' }, { status: 500 })
  }
}
