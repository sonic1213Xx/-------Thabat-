import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

const defaultSettings = {
  id: 'school',
  schoolName: 'مدرسة السلمية الثانوية',
  lateTime: '07:00',
  defaultAttendance: 'UNMARKED',
  attendanceNotes: false,
  absenceAlerts: true,
  warningAlerts: true,
}

async function getUser(request: NextRequest) {
  const userId = request.headers.get('x-thabat-user-id')
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } })
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.schoolSettings.upsert({
    where: { id: 'school' },
    update: {},
    create: defaultSettings,
  })
  return NextResponse.json({ data: settings }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Partial<typeof defaultSettings>
  if (body.lateTime !== undefined && !/^\d{2}:\d{2}$/.test(body.lateTime)) {
    return NextResponse.json({ error: 'Invalid late time.' }, { status: 400 })
  }
  if (body.defaultAttendance !== undefined && !['UNMARKED', 'PRESENT'].includes(body.defaultAttendance)) {
    return NextResponse.json({ error: 'Invalid default attendance.' }, { status: 400 })
  }

  const settings = await prisma.schoolSettings.upsert({
    where: { id: 'school' },
    update: {
      ...(body.schoolName !== undefined ? { schoolName: body.schoolName.trim() || defaultSettings.schoolName } : {}),
      ...(body.lateTime !== undefined ? { lateTime: body.lateTime } : {}),
      ...(body.defaultAttendance !== undefined ? { defaultAttendance: body.defaultAttendance } : {}),
      ...(body.attendanceNotes !== undefined ? { attendanceNotes: body.attendanceNotes } : {}),
      ...(body.absenceAlerts !== undefined ? { absenceAlerts: body.absenceAlerts } : {}),
      ...(body.warningAlerts !== undefined ? { warningAlerts: body.warningAlerts } : {}),
      updatedBy: user.id,
    },
    create: {
      ...defaultSettings,
      schoolName: body.schoolName?.trim() || defaultSettings.schoolName,
      lateTime: body.lateTime || defaultSettings.lateTime,
      defaultAttendance: body.defaultAttendance || defaultSettings.defaultAttendance,
      attendanceNotes: body.attendanceNotes ?? defaultSettings.attendanceNotes,
      absenceAlerts: body.absenceAlerts ?? defaultSettings.absenceAlerts,
      warningAlerts: body.warningAlerts ?? defaultSettings.warningAlerts,
      updatedBy: user.id,
    },
  })
  return NextResponse.json({ data: settings }, { headers: { 'Cache-Control': 'no-store' } })
}
