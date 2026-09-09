import { NextRequest, NextResponse } from 'next/server'
import { ATTENDANCE_ESCALATIONS } from '@/lib/moe-rules'
import { getDateOnly, getTimeOnly } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

const validStatuses = ['UNMARKED', 'PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE', 'OTHER']
const vicePrincipalRoles = ['VICE_PRINCIPAL', 'VP_STUDENT_AFFAIRS', 'VP_ACADEMIC_AFFAIRS', 'VP_OPERATIONS']

function attendanceNotes(notes: string | undefined, user: { role: string }) {
  const existing = notes?.trim() ?? ''
  if (!vicePrincipalRoles.includes(user.role) || existing.includes('تم التعديل بواسطة الوكيل')) return existing
  return [existing, 'تم التعديل بواسطة الوكيل'].filter(Boolean).join(' | ')
}

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
      const date = request.nextUrl.searchParams.get('date')
      const divisionId = request.nextUrl.searchParams.get('divisionId')
      const requestedTeacherId = request.nextUrl.searchParams.get('teacherId')
      const subject = request.nextUrl.searchParams.get('subject') ?? ''
      const allowedDivisions = user.role === 'TEACHER' ? assignedDivisions(user) : undefined
      if (user.role === 'TEACHER' && divisionId && divisionId !== 'ALL' && !allowedDivisions?.includes(divisionId)) return forbidden()
      const divisionFilter = divisionId && divisionId !== 'ALL' ? [divisionId] : allowedDivisions
      if (!date) {
        const month = request.nextUrl.searchParams.get('month')
        const sessions = await prisma.attendanceLog.findMany({
          where: {
            ...(month ? { date: { startsWith: month } } : {}),
            ...(divisionFilter?.length ? { divisionId: { in: divisionFilter } } : {}),
            ...(mode === 'CLASS' ? { mode: 'CLASS', teacherId: user.role === 'TEACHER' ? user.id : requestedTeacherId || undefined, subject } : { mode: 'SCHOOL' }),
            ...(user.role === 'TEACHER' ? { teacherId: user.id } : {}),
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 200,
          select: { id: true, date: true, divisionId: true, teacherId: true, subject: true, mode: true, presentCount: true, absentCount: true, createdAt: true },
        })
        const latestSessions = new Map<string, typeof sessions[number]>()
        for (const session of sessions) {
          const key = `${session.date}:${session.divisionId}:${session.mode}:${session.teacherId ?? ''}:${session.subject}`
          if (!latestSessions.has(key)) latestSessions.set(key, session)
        }
        return NextResponse.json({ data: Array.from(latestSessions.values()) })
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'A valid date is required' }, { status: 400 })
      if (mode === 'CLASS') {
        const teacherId = user.role === 'TEACHER' ? user.id : requestedTeacherId
        if (!teacherId || !divisionId) return NextResponse.json({ error: 'Teacher, division, and date are required' }, { status: 400 })
        const students = await prisma.student.findMany({ where: { isActive: true, ...(divisionId === 'ALL' ? {} : { divisionCode: divisionId }) }, select: { id: true, fullName: true, divisionCode: true }, orderBy: { fullName: 'asc' } })
        const records = await prisma.classAttendance.findMany({ where: { date, ...(divisionId === 'ALL' ? {} : { divisionId }), teacherId, subject }, select: { studentId: true, status: true, entryTime: true, updatedAt: true } })
        const recordMap = new Map(records.map((record) => [record.studentId, record]))
        return NextResponse.json({ data: students.map((student) => ({ id: `class-${student.id}`, studentId: student.id, studentName: student.fullName, divisionCode: student.divisionCode, date, status: recordMap.get(student.id)?.status ?? 'UNMARKED', entryTime: recordMap.get(student.id)?.entryTime ?? null, notes: null })) })
      }
      const students = await prisma.student.findMany({
        where: { isActive: true, ...(divisionFilter?.length ? { divisionCode: { in: divisionFilter } } : {}) },
        select: { id: true, fullName: true, divisionCode: true },
        orderBy: { fullName: 'asc' },
      })
      const records = await prisma.attendance.findMany({
        where: { date, ...(divisionFilter?.length ? { student: { divisionCode: { in: divisionFilter } } } : {}) },
        select: { id: true, studentId: true, date: true, status: true, notes: true, entryTime: true },
      })
      const recordMap = new Map(records.map((record) => [record.studentId, record]))
      return NextResponse.json({ data: students.map((student) => {
        const record = recordMap.get(student.id)
        return { id: record?.id ?? `temp-${student.id}`, studentId: student.id, studentName: student.fullName, divisionCode: student.divisionCode, date, status: record?.status ?? 'UNMARKED', entryTime: record?.entryTime ?? null, notes: record?.notes ?? null, hasDoctorNote: record?.status === 'ABSENT_EXCUSED' || Boolean(record?.notes?.trim()) }
      }) })
    }
    if (user.role === 'TEACHER' && mode !== 'CLASS') return forbidden()
    if (user.role === 'TEACHER' && requestedDivision && !assignedDivisions(user).includes(requestedDivision)) return forbidden()
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
      const subject = request.nextUrl.searchParams.get('subject') ?? ''
      const records = await prisma.classAttendance.findMany({ where: { date, ...(divisionIds ? { divisionId: { in: divisionIds } } : {}), teacherId, subject }, select: { studentId: true, status: true, updatedAt: true } })
      const departed = await prisma.attendance.findMany({ where: { date, status: 'LEFT_WITH_PERMISSION', studentId: { in: students.map((student) => student.id) } }, select: { studentId: true } })
      const departedIds = new Set(departed.map((record) => record.studentId))
      const recordMap = new Map(records.map((record) => [record.studentId, record]))
      return NextResponse.json({ data: students.map((student) => ({ ...student, studentId: student.id, status: departedIds.has(student.id) ? 'LEFT_WITH_PERMISSION' : recordMap.get(student.id)?.status ?? 'UNMARKED' })), date, mode })
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
      records?: Array<{ studentId: string; status: string; date?: string; notes?: string; divisionId?: string; entryTime?: string }>
      markedBy?: string
      markedByName?: string
      mode?: 'SCHOOL' | 'CLASS'
      divisionId?: string
      teacherId?: string
      subject?: string
    }

    if (!body.records || !Array.isArray(body.records) || !body.records.length) {
      return NextResponse.json({ error: 'Date and records array are required' }, { status: 400 })
    }
    const requestDate = body.date ?? body.records[0]?.date
    if (!requestDate || body.records.some((record) => (record.date ?? requestDate) !== requestDate)) {
      return NextResponse.json({ error: 'A consistent date is required for all attendance records' }, { status: 400 })
    }

    if (body.mode === 'CLASS') {
      if (user.role !== 'TEACHER') return forbidden()
      const validClassStatuses = ['UNMARKED', 'PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE', 'OTHER', 'ESCAPED']
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
      const subject = body.subject?.trim() ?? ''
      if (!teacherId) return NextResponse.json({ error: 'teacherId is required for class attendance' }, { status: 400 })
      if (user.role === 'TEACHER' && Array.from(groups.keys()).some((divisionId) => !assignedDivisions(user).includes(divisionId))) return forbidden()
      const studentIds = body.records.map((record) => record.studentId)
      const departed = await prisma.attendance.findMany({ where: { date: requestDate, status: 'LEFT_WITH_PERMISSION', studentId: { in: studentIds } }, select: { studentId: true } })
      const departedIds = new Set(departed.map((record) => record.studentId))
      const writableRecords = body.records.filter((record) => !departedIds.has(record.studentId))
      const studentsInDivision = await prisma.student.findMany({ where: { id: { in: writableRecords.map((record) => record.studentId) }, divisionCode: { in: Array.from(groups.keys()) } }, select: { id: true, divisionCode: true } })
      if (studentsInDivision.length !== new Set(writableRecords.map((record) => record.studentId)).size) return forbidden()
      const previousClassRecords = await prisma.classAttendance.findMany({ where: { date: requestDate, teacherId: user.id, subject: body.subject?.trim() ?? '', studentId: { in: writableRecords.map((record) => record.studentId) } }, select: { studentId: true, status: true } })
      const previousStatusByStudent = new Map(previousClassRecords.map((record) => [record.studentId, record.status]))
      const recordsToClear = writableRecords.filter((record) => record.status === 'UNMARKED')
      if (recordsToClear.length) await prisma.classAttendance.deleteMany({ where: { date: requestDate, teacherId, subject, studentId: { in: recordsToClear.map((record) => record.studentId) } } })
      const recordsToSave = writableRecords.filter((record) => record.status !== 'UNMARKED')
      for (let index = 0; index < recordsToSave.length; index += 50) {
        const operations = recordsToSave.slice(index, index + 50).map((record) => {
          const divisionId = record.divisionId || body.divisionId!
          return prisma.classAttendance.upsert({ where: { studentId_date_divisionId_teacherId_subject: { studentId: record.studentId, date: requestDate, divisionId, teacherId, subject } }, update: { status: record.status, entryTime: record.entryTime || null }, create: { studentId: record.studentId, date: requestDate, divisionId, teacherId, subject, status: record.status, entryTime: record.entryTime || null } })
        })
        await prisma.$transaction(operations)
      }
      for (const [divisionId, group] of groups) {
        const writableGroup = group.filter((record) => !departedIds.has(record.studentId))
        if (!writableGroup.length) continue
        const statusMap = Object.fromEntries(writableGroup.map((record) => [record.studentId, record.status]))
        const existing = await prisma.attendanceLog.findFirst({ where: { date: requestDate, divisionId, teacherId, subject, mode: 'CLASS' }, orderBy: { createdAt: 'desc' } })
        let previous: Record<string, string> = {}
        try { previous = JSON.parse(existing?.statusMap || '{}') as Record<string, string> } catch { previous = {} }
        const merged = { ...previous, ...statusMap }
        await prisma.attendanceLog.deleteMany({ where: { date: requestDate, divisionId, teacherId, subject, mode: 'CLASS' } })
        await prisma.attendanceLog.create({ data: { date: requestDate, divisionId, teacherId, subject, mode: 'CLASS', statusMap: JSON.stringify(merged), recordsJson: JSON.stringify(merged), presentCount: Object.values(merged).filter((status) => status === 'PRESENT').length, absentCount: Object.values(merged).filter((status) => status.startsWith('ABSENT')).length } })
      }
      const alertRecords = writableRecords.filter((record) => record.status === 'ESCAPED' && previousStatusByStudent.get(record.studentId) !== record.status)
      if (alertRecords.length) {
        const recipients = await prisma.user.findMany({ where: { isActive: true, OR: [{ role: 'PRINCIPAL' }, { role: 'VICE_PRINCIPAL' }, { role: { startsWith: 'VP_' } }] }, select: { id: true } })
        const studentById = new Map((await prisma.student.findMany({ where: { id: { in: alertRecords.map((record) => record.studentId) } }, select: { id: true, fullName: true } })).map((student) => [student.id, student]))
        if (recipients.length) await prisma.attendanceNotification.createMany({ data: recipients.flatMap((recipient) => alertRecords.map((record) => ({ recipientId: recipient.id, createdBy: user.id, studentId: record.studentId, studentName: studentById.get(record.studentId)?.fullName ?? 'طالب', divisionId: record.divisionId || body.divisionId || '', subject, date: requestDate, status: record.status }))), skipDuplicates: true })
      }
        return NextResponse.json({ count: recordsToSave.length, cleared: recordsToClear.length, date: requestDate, mode: 'CLASS' })
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

    // Save or update attendance records
    if (user.role === 'TEACHER') return forbidden()
    const departed = await prisma.attendance.findMany({ where: { date: requestDate, status: 'LEFT_WITH_PERMISSION', studentId: { in: body.records.map((record) => record.studentId) } }, select: { studentId: true } })
    const departedIds = new Set(departed.map((record) => record.studentId))
    const writableRecords = body.records.filter((record) => !departedIds.has(record.studentId))
    const recordsToClear = writableRecords.filter((record) => record.status === 'UNMARKED')
    if (recordsToClear.length) await prisma.attendance.deleteMany({ where: { date: requestDate, studentId: { in: recordsToClear.map((record) => record.studentId) } } })
    const recordsToSave = writableRecords.filter((record) => record.status !== 'UNMARKED')
    if (!writableRecords.length) return NextResponse.json({ count: 0, skipped: departed.length, date: requestDate, escalations: [] })
    const escalations: Array<{ studentId: string; days: number; warningId: string; action: string }> = []
    const actor = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }) ?? await prisma.user.create({ data: { username: 'system', name: 'نظام ثَبَت', password: 'system-managed', role: 'PRINCIPAL', isActive: true } })
    const existingAttendance = await prisma.attendance.findMany({ where: { date: requestDate, studentId: { in: writableRecords.map((record) => record.studentId) } }, select: { studentId: true } })
    const existingAttendanceIds = new Set(existingAttendance.map((record) => record.studentId))
    const newAttendance = writableRecords.filter((record) => !existingAttendanceIds.has(record.studentId))
    if (newAttendance.length) {
      await prisma.attendance.createMany({ data: newAttendance.map((record) => ({ studentId: record.studentId, date: requestDate, status: record.status, notes: attendanceNotes(record.notes, user) || null, entryTime: record.entryTime || null, markedBy: body.markedBy || user.id, markedByName: body.markedByName || user.name })), skipDuplicates: true })
    }
    for (let index = 0; index < recordsToSave.length; index += 50) {
      const batch = writableRecords.slice(index, index + 50).filter((record) => existingAttendanceIds.has(record.studentId))
      if (batch.length) {
        await prisma.$transaction(batch.map((record) => prisma.attendance.update({ where: { studentId_date: { studentId: record.studentId, date: requestDate } }, data: { status: record.status, notes: attendanceNotes(record.notes, user) || null, entryTime: record.entryTime || null, markedBy: body.markedBy || user.id, markedByName: body.markedByName || user.name, updatedAt: new Date() } })))
      }
    }
    const saved = await prisma.attendance.findMany({ where: { date: requestDate, studentId: { in: writableRecords.map((record) => record.studentId) } }, select: { id: true, studentId: true, date: true, status: true, notes: true, markedBy: true, markedByName: true, updatedAt: true } })
    const absentStudentIds = Array.from(new Set(writableRecords.filter((record) => record.status === 'ABSENT_UNEXCUSED').map((record) => record.studentId)))
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
    const students = await prisma.student.findMany({ where: { id: { in: writableRecords.map((record) => record.studentId) } }, select: { id: true, divisionCode: true } })
    const studentDivisions = new Map(students.map((student) => [student.id, student.divisionCode]))
    for (const record of writableRecords) {
      const divisionCode = studentDivisions.get(record.studentId)
      if (divisionCode) statusByDivision.set(divisionCode, { ...(statusByDivision.get(divisionCode) ?? {}), [record.studentId]: record.status })
    }
    for (const [divisionId, statusMap] of statusByDivision.entries()) {
      const teacherId = body.markedBy || null
      const existing = await prisma.attendanceLog.findFirst({ where: { date: requestDate, divisionId, teacherId, mode: 'SCHOOL' }, orderBy: { createdAt: 'desc' } })
      let previous: Record<string, string> = {}
      try { previous = JSON.parse(existing?.statusMap || '{}') as Record<string, string> } catch { previous = {} }
      const merged = { ...previous, ...statusMap }
      await prisma.attendanceLog.deleteMany({ where: { date: requestDate, divisionId, teacherId, mode: 'SCHOOL' } })
      await prisma.attendanceLog.create({ data: { date: requestDate, divisionId, teacherId, mode: 'SCHOOL', statusMap: JSON.stringify(merged), recordsJson: JSON.stringify(merged), presentCount: Object.values(merged).filter((status) => status === 'PRESENT').length, absentCount: Object.values(merged).filter((status) => status.startsWith('ABSENT')).length } })
    }

    return NextResponse.json({ count: saved.length, cleared: recordsToClear.length, date: requestDate, escalations })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json({ error: 'Unable to save attendance records' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user?.isActive) return forbidden()
    
    // Only VICE_PRINCIPAL, PRINCIPAL, or VP roles can edit attendance
    const canEdit = user.role === 'VICE_PRINCIPAL' || user.role === 'PRINCIPAL' || user.role?.startsWith('VP_')
    if (!canEdit) return forbidden()
    
    const body = await request.json() as {
      attendanceId: string
      studentId: string
      date: string
      status: string
      notes?: string
    }
    
    if (!body.attendanceId || !body.studentId || !body.date || !body.status) {
      return NextResponse.json({ error: 'attendanceId, studentId, date, and status are required' }, { status: 400 })
    }
    
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
    }
    
    // Fetch the existing attendance record
    const existing = await prisma.attendance.findUnique({
      where: { id: body.attendanceId },
      include: { student: { select: { id: true, fullName: true, divisionCode: true } } }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }
    
    // Verify studentId matches
    if (existing.studentId !== body.studentId) {
      return NextResponse.json({ error: 'Student ID mismatch' }, { status: 400 })
    }
    
    const shouldMarkVicePrincipalEdit = vicePrincipalRoles.includes(user.role)
    const vpEditNote = 'تم التعديل بواسطة الوكيل'
    let newNotes = body.notes?.trim() || existing.notes || ''
    const editMatches = (newNotes + ' ' + (existing.notes || '')).match(/تم التعديل بواسطة الوكيل/g) || []
    const editCount = editMatches.length + 1
    if (shouldMarkVicePrincipalEdit && !newNotes.includes(vpEditNote)) newNotes = [newNotes, vpEditNote].filter(Boolean).join(' | ')
    
    // Update the attendance record
    const updated = await prisma.attendance.update({
      where: { id: body.attendanceId },
      data: {
        status: body.status,
        notes: newNotes,
        updatedAt: new Date(),
        markedBy: user.id,
        markedByName: user.name
      }
    })
    
    // Create audit log entry
    const oldStatus = existing.status
    const newStatus = body.status
    const statusChanged = oldStatus !== newStatus
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'EDIT_ATTENDANCE',
        targetType: 'Attendance',
        targetId: body.attendanceId,
        targetName: `${existing.student.fullName} - ${body.date}`,
        studentId: body.studentId,
        details: JSON.stringify({
          editedBy: user.name,
          editedByRole: user.role,
          editCount,
          statusChanged,
          timestamp: new Date().toISOString()
        }),
        oldValue: statusChanged ? oldStatus : null,
        newValue: statusChanged ? newStatus : null,
        dateOnly: getDateOnly(new Date()),
        timeOnly: getTimeOnly(new Date())
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      data: updated,
      message: `تم تحديث الحضور بنجاح (التعديل رقم ${editCount})`
    })
  } catch (error) {
    console.error('Attendance PATCH error:', error)
    return NextResponse.json({ error: 'Unable to update attendance record' }, { status: 500 })
  }
}
