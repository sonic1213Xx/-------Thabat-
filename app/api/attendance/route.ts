import { NextRequest, NextResponse } from 'next/server'
import { ATTENDANCE_ESCALATIONS } from '@/lib/moe-rules'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

const validStatuses = ['UNMARKED', 'PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE', 'OTHER']

async function getRequestUser(request: NextRequest) {
  const userId = request.headers.get('x-thabat-user-id')
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, assignedDivisions: true, isActive: true } })
}

function assignedDivisions(user: { assignedDivisions: string }) {
  try { return JSON.parse(user.assignedDivisions) as string[] } catch { return [] }
}

function forbidden() { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user?.isActive) return forbidden()
    const mode = request.nextUrl.searchParams.get('mode') ?? 'SCHOOL'
    const requestedDivision = request.nextUrl.searchParams.get('divisionId')
    if (request.nextUrl.searchParams.get('logs') === 'true') {
      const records = await prisma.attendance.findMany({
        where: {
          status: { in: ['ABSENT_EXCUSED', 'ABSENT_UNEXCUSED', 'LATE', 'OTHER'] },
          ...(user.role === 'TEACHER' ? { student: { divisionCode: { in: assignedDivisions(user) } } } : {}),
        },
        orderBy: [{ date: 'desc' }, { student: { fullName: 'asc' } }],
        take: 5000,
        select: { id: true, date: true, status: true, notes: true, student: { select: { id: true, fullName: true, divisionCode: true } } },
      })
      return NextResponse.json({ data: records.map((record) => ({ ...record, studentId: record.student.id, studentName: record.student.fullName, divisionCode: record.student.divisionCode, hasDoctorNote: record.status === 'ABSENT_EXCUSED' || Boolean(record.notes?.trim()) })) })
    }
    if (user.role === 'TEACHER' && mode !== 'CLASS') return forbidden()
    if (user.role === 'TEACHER' && (!requestedDivision || !assignedDivisions(user).includes(requestedDivision))) return forbidden()
    if (request.nextUrl.searchParams.get('history') === 'true') {
      const logs = await prisma.attendanceLog.findMany({
        where: {
          date: request.nextUrl.searchParams.get('date') || undefined,
          divisionId: requestedDivision || undefined,
          teacherId: user.role === 'TEACHER' ? user.id : request.nextUrl.searchParams.get('teacherId') || undefined,
        },
        orderBy: { date: 'desc' },
        take: 100,
      })
      return NextResponse.json({ data: logs })
    }
    const date = request.nextUrl.searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD)' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    if (mode === 'CLASS') {
      const requestedDivisions = request.nextUrl.searchParams.getAll('divisionId')
      const divisionIds = requestedDivisions.length ? requestedDivisions : user.role === 'TEACHER' ? assignedDivisions(user) : undefined
      const teacherId = user.role === 'TEACHER' ? user.id : request.nextUrl.searchParams.get('teacherId')
      if (!teacherId || (user.role === 'TEACHER' && !divisionIds?.length)) return NextResponse.json({ error: 'teacherId and assigned divisions are required for class attendance' }, { status: 400 })
      if (user.role === 'TEACHER' && divisionIds?.some((divisionId) => !assignedDivisions(user).includes(divisionId))) return forbidden()
      const students = await prisma.student.findMany({ where: { isActive: true, ...(divisionIds ? { divisionCode: { in: divisionIds } } : {}) }, select: { id: true, fullName: true, divisionCode: true }, orderBy: { fullName: 'asc' } })
      const records = await prisma.classAttendance.findMany({ where: { date, ...(divisionIds ? { divisionId: { in: divisionIds } } : {}), teacherId }, select: { studentId: true, status: true, updatedAt: true } })
      const recordMap = new Map(records.map((record) => [record.studentId, record]))
      return NextResponse.json({ data: students.map((student) => ({ ...student, studentId: student.id, status: recordMap.get(student.id)?.status ?? 'UNMARKED' })), date, mode })
    }

    // Get all active students for campus entry attendance.
    const students = await prisma.student.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, divisionCode: true },
      orderBy: { fullName: 'asc' },
    })

    // Get attendance records for the specified date
    const attendanceRecords = await prisma.attendance.findMany({
      where: { date },
      select: {
        id: true,
        studentId: true,
        status: true,
        notes: true,
        markedBy: true,
        markedByName: true,
        updatedAt: true,
      },
    })

    // Create a map of attendance records for quick lookup
    const attendanceMap = new Map(attendanceRecords.map((record) => [record.studentId, record]))

    // Return all students with their attendance status (defaulting to UNMARKED if no record)
    const attendanceData = students.map((student) => {
      const record = attendanceMap.get(student.id)
      return {
        id: record?.id || `temp-${student.id}`,
        studentId: student.id,
        fullName: student.fullName,
        divisionCode: student.divisionCode,
        status: record?.status || 'UNMARKED',
        notes: record?.notes || '',
        markedBy: record?.markedBy || null,
        markedByName: record?.markedByName || null,
        updatedAt: record?.updatedAt || null,
      }
    })

    return NextResponse.json({ data: attendanceData, date })
  } catch (error) {
    console.error('Attendance GET error:', error)
    return NextResponse.json({ error: 'Unable to fetch attendance records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user?.isActive) return forbidden()
    const body = await request.json() as {
      date?: string
      records?: Array<{ studentId: string; status: string; date?: string; notes?: string; divisionId?: string }>
      markedBy?: string
      markedByName?: string
      mode?: 'SCHOOL' | 'CLASS'
      divisionId?: string
      teacherId?: string
    }

    if (!body.records || !Array.isArray(body.records) || !body.records.length) {
      return NextResponse.json({ error: 'Date and records array are required' }, { status: 400 })
    }
    const requestDate = body.date ?? body.records[0]?.date
    if (!requestDate || body.records.some((record) => (record.date ?? requestDate) !== requestDate)) {
      return NextResponse.json({ error: 'A consistent date is required for all attendance records' }, { status: 400 })
    }

    if (body.mode === 'CLASS') {
      const validClassStatuses = ['UNMARKED', 'PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE', 'OTHER']
      if (body.records.some((record) => !validClassStatuses.includes(record.status))) return NextResponse.json({ error: 'Invalid class attendance status' }, { status: 400 })
      const groups = new Map<string, typeof body.records>()
      for (const record of body.records) {
        const divisionId = record.divisionId || body.divisionId
        if (!divisionId) return NextResponse.json({ error: 'divisionId is required for class attendance' }, { status: 400 })
        const group = groups.get(divisionId) ?? []
        group.push(record)
        groups.set(divisionId, group)
      }
      const teacherId = user.role === 'TEACHER' ? user.id : body.teacherId
      if (!teacherId) return NextResponse.json({ error: 'teacherId is required for class attendance' }, { status: 400 })
      if (user.role === 'TEACHER' && Array.from(groups.keys()).some((divisionId) => !assignedDivisions(user).includes(divisionId))) return forbidden()
      const studentIds = body.records.map((record) => record.studentId)
      const studentsInDivision = await prisma.student.findMany({ where: { id: { in: studentIds }, divisionCode: { in: Array.from(groups.keys()) } }, select: { id: true, divisionCode: true } })
      if (studentsInDivision.length !== new Set(studentIds).size) return forbidden()
      const recordsToSave = body.records.filter((record) => record.status !== 'UNMARKED')
      for (let index = 0; index < recordsToSave.length; index += 50) {
        const operations = recordsToSave.slice(index, index + 50).map((record) => {
          const divisionId = record.divisionId || body.divisionId!
          return prisma.classAttendance.upsert({ where: { studentId_date_divisionId_teacherId: { studentId: record.studentId, date: requestDate, divisionId, teacherId } }, update: { status: record.status }, create: { studentId: record.studentId, date: requestDate, divisionId, teacherId, status: record.status } })
        })
        await prisma.$transaction(operations)
      }
      for (const [divisionId, group] of groups) {
          await prisma.attendanceLog.create({ data: { date: requestDate, divisionId, teacherId, mode: 'CLASS', statusMap: JSON.stringify(Object.fromEntries(group.map((record) => [record.studentId, record.status]))), recordsJson: JSON.stringify(Object.fromEntries(group.map((record) => [record.studentId, record.status]))), presentCount: group.filter((record) => record.status === 'PRESENT').length, absentCount: group.filter((record) => record.status.startsWith('ABSENT')).length } })
        }
        return NextResponse.json({ data: recordsToSave, count: recordsToSave.length, date: requestDate, mode: 'CLASS' })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Validate status values for all records
    for (const record of body.records) {
      if (!validStatuses.includes(record.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${record.status}. Valid values: ${validStatuses.join(', ')}` },
          { status: 400 },
        )
      }
    }

    // Filter out UNMARKED records to avoid unnecessary saves, but process others
    const recordsToSave = body.records.filter((r) => r.status !== 'UNMARKED')

    // Save or update attendance records
    if (user.role === 'TEACHER') return forbidden()
    const escalations: Array<{ studentId: string; days: number; warningId: string; action: string }> = []
    const actor = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }) ?? await prisma.user.create({ data: { username: 'system', name: 'نظام ثَبَت', password: 'system-managed', role: 'PRINCIPAL', isActive: true } })
    const existingAttendance = await prisma.attendance.findMany({ where: { date: requestDate, studentId: { in: recordsToSave.map((record) => record.studentId) } }, select: { studentId: true } })
    const existingAttendanceIds = new Set(existingAttendance.map((record) => record.studentId))
    const newAttendance = recordsToSave.filter((record) => !existingAttendanceIds.has(record.studentId))
    if (newAttendance.length) {
      await prisma.attendance.createMany({ data: newAttendance.map((record) => ({ studentId: record.studentId, date: requestDate, status: record.status, notes: record.notes || null, markedBy: body.markedBy || null, markedByName: body.markedByName || null })), skipDuplicates: true })
    }
    for (let index = 0; index < recordsToSave.length; index += 50) {
      const batch = recordsToSave.slice(index, index + 50).filter((record) => existingAttendanceIds.has(record.studentId))
      if (batch.length) {
        await prisma.$transaction(batch.map((record) => prisma.attendance.update({ where: { studentId_date: { studentId: record.studentId, date: requestDate } }, data: { status: record.status, notes: record.notes || null, markedBy: body.markedBy || null, markedByName: body.markedByName || null, updatedAt: new Date() } })))
      }
    }
    const saved = await prisma.attendance.findMany({ where: { date: requestDate, studentId: { in: recordsToSave.map((record) => record.studentId) } }, select: { id: true, studentId: true, date: true, status: true, notes: true, markedBy: true, markedByName: true, updatedAt: true } })
    const absentStudentIds = Array.from(new Set(recordsToSave.filter((record) => record.status === 'ABSENT_UNEXCUSED').map((record) => record.studentId)))
    if (absentStudentIds.length) {
      const absenceCounts = await prisma.attendance.groupBy({
        by: ['studentId'],
        where: { studentId: { in: absentStudentIds }, status: 'ABSENT_UNEXCUSED' },
        _count: { _all: true },
      })
      const absenceWarnings = await prisma.warning.findMany({
        where: { studentId: { in: absentStudentIds }, type: 'ABSENCE' },
        select: { id: true, studentId: true, reason: true },
      })
      const existingWarningKeys = new Set(absenceWarnings.map((warning) => `${warning.studentId}:${warning.reason}`))
      const escalationCreates = absenceCounts.flatMap((entry) => {
        const escalation = ATTENDANCE_ESCALATIONS.find((item) => item.days === entry._count._all)
        if (!escalation) return []
        const reason = `إنذار مواظبة تلقائي: ${entry._count._all} أيام غياب غير مبرر. الإجراء: ${escalation.action}`
        if (absenceWarnings.some((warning) => warning.studentId === entry.studentId && existingWarningKeys.has(`${warning.studentId}:${reason}`))) return []
        const now = new Date()
        return [{
          studentId: entry.studentId,
          days: entry._count._all,
          action: escalation.action,
          data: { studentId: entry.studentId, issuedBy: actor.id, issuedByName: actor.name, issuedByRole: actor.role, type: 'ABSENCE', reason, deduction: 0, severity: `THRESHOLD_${entry._count._all}`, isResolved: false, issuedAt: now, issuedDateOnly: getDateOnly(now), issuedTimeOnly: getTimeOnly(now) },
        }]
      })
      const createdWarnings = await prisma.$transaction(escalationCreates.map((item) => prisma.warning.create({ data: item.data })))
      createdWarnings.forEach((warning, index) => {
        const item = escalationCreates[index]
        escalations.push({ studentId: item.studentId, days: item.days, warningId: warning.id, action: item.action })
      })
    }

    const statusByDivision = new Map<string, Record<string, string>>()
    const students = await prisma.student.findMany({ where: { id: { in: body.records.map((record) => record.studentId) } }, select: { id: true, divisionCode: true } })
    const studentDivisions = new Map(students.map((student) => [student.id, student.divisionCode]))
    for (const record of body.records) {
      const divisionCode = studentDivisions.get(record.studentId)
      if (divisionCode) statusByDivision.set(divisionCode, { ...(statusByDivision.get(divisionCode) ?? {}), [record.studentId]: record.status })
    }
    await prisma.$transaction(Array.from(statusByDivision.entries()).map(([divisionId, statusMap]) => prisma.attendanceLog.create({ data: { date: requestDate, divisionId, teacherId: body.markedBy || null, mode: 'SCHOOL', statusMap: JSON.stringify(statusMap) } })))

    return NextResponse.json({ data: saved, count: saved.length, date: requestDate, escalations })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json({ error: 'Unable to save attendance records' }, { status: 500 })
  }
}
