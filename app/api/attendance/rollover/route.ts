import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function previousDate(value?: string) {
  const date = value ? new Date(`${value}T00:00:00Z`) : new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-thabat-user-id')
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isActive: true } }) : null
    const cronAuthorized = Boolean(process.env.ATTENDANCE_ROLLOVER_SECRET && request.headers.get('x-rollover-secret') === process.env.ATTENDANCE_ROLLOVER_SECRET)
    if (!cronAuthorized && (!actor || !['PRINCIPAL', 'VICE_PRINCIPAL'].includes(actor.role))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { date?: string }
    const date = previousDate(body.date)
    const schoolRecords = await prisma.attendance.findMany({ where: { date }, select: { studentId: true, status: true, student: { select: { divisionCode: true } } } })
    const classRecords = await prisma.classAttendance.findMany({ where: { date }, select: { studentId: true, divisionId: true, teacherId: true, status: true } })
    const groups = new Map<string, { mode: 'SCHOOL' | 'CLASS'; teacherId: string | null; records: Record<string, string> }>()
    for (const record of schoolRecords) {
      const divisionId = record.student.divisionCode ?? 'UNASSIGNED'
      const key = `SCHOOL:${divisionId}`
      const group = groups.get(key) ?? { mode: 'SCHOOL', teacherId: null, records: {} }
      group.records[record.studentId] = record.status
      groups.set(key, group)
    }
    for (const record of classRecords) {
      const key = `CLASS:${record.divisionId}:${record.teacherId}`
      const group = groups.get(key) ?? { mode: 'CLASS', teacherId: record.teacherId, records: {} }
      group.records[record.studentId] = record.status
      groups.set(key, group)
    }
    const archived = await prisma.$transaction(Array.from(groups.entries()).map(([key, group]) => {
      const statuses = Object.values(group.records)
      const data = { date, divisionId: key.split(':')[1], teacherId: group.teacherId, mode: group.mode, statusMap: JSON.stringify(group.records), recordsJson: JSON.stringify(group.records), presentCount: statuses.filter((status) => status === 'PRESENT').length, absentCount: statuses.filter((status) => status.startsWith('ABSENT')).length }
      return prisma.attendanceLog.create({ data })
    }))
    return NextResponse.json({ date, archived: archived.length, reset: true })
  } catch (error) {
    console.error('Attendance rollover error:', error)
    return NextResponse.json({ error: 'Unable to roll over attendance' }, { status: 500 })
  }
}