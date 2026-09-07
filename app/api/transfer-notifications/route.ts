import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function requestUser(request: NextRequest) {
  const id = request.headers.get('x-thabat-user-id')
  return id ? prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } }) : null
}

export async function GET(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const canReceiveAttendanceAlerts = ['PRINCIPAL', 'VICE_PRINCIPAL', 'VP_STUDENT_AFFAIRS', 'VP_ACADEMIC_AFFAIRS', 'VP_OPERATIONS'].includes(user.role)
  const [transfers, attendanceRows, referrals] = await prisma.$transaction([
    prisma.transferNotification.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.attendanceNotification.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.teacherReferral.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: 'desc' }, take: 50, include: { createdBy: { select: { name: true } } } }),
  ])
  const attendance = canReceiveAttendanceAlerts ? attendanceRows : []
  const data = [
    ...transfers.map((notification) => ({ type: 'TRANSFER' as const, ...notification, studentIds: JSON.parse(notification.studentIdsJson), students: JSON.parse(notification.studentSnapshotJson), grades: JSON.parse(notification.gradeSnapshotJson) })),
    ...attendance.map((notification) => ({ type: 'ATTENDANCE' as const, ...notification })),
    ...referrals.map((notification) => ({ type: 'REFERRAL' as const, ...notification })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 50)
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json() as { id?: string; type?: 'TRANSFER' | 'ATTENDANCE' | 'REFERRAL'; action?: 'read' | 'reviewed' }
  if (!body.id || !body.action) return NextResponse.json({ error: 'Notification id and action are required.' }, { status: 400 })
  const data = body.action === 'reviewed' ? { reviewedAt: new Date(), readAt: new Date() } : { readAt: new Date() }
  const notification = body.type === 'ATTENDANCE'
    ? await prisma.attendanceNotification.updateMany({ where: { id: body.id, recipientId: user.id }, data: body.action === 'reviewed' ? { readAt: new Date() } : data })
    : body.type === 'REFERRAL'
      ? await prisma.teacherReferral.updateMany({ where: { id: body.id, recipientId: user.id }, data: { readAt: new Date(), status: body.action === 'reviewed' ? 'REVIEWED' : 'SEEN' } })
    : await prisma.transferNotification.updateMany({ where: { id: body.id, recipientId: user.id }, data })
  if (!notification.count) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}