import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatRelativeTimeArabic } from '@/lib/utils'
import { invalidateCache } from '@/lib/redis'

const vicePrincipalRoles = ['VICE_PRINCIPAL', 'VP_STUDENT_AFFAIRS', 'VP_ACADEMIC_AFFAIRS', 'VP_OPERATIONS']
const adminRoles = ['CREATOR', 'PRINCIPAL', 'CURATOR']
const leadershipRoles = [...adminRoles, ...vicePrincipalRoles]
const transferStatuses = ['TRANSFERRED', 'REFERRED', 'NEW']

async function requestUser(request: NextRequest) {
  const id = request.cookies.get('THABAT_USER_ID')?.value || request.headers.get('x-thabat-user-id')
  return id ? prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, isActive: true, assignedDivisions: true } }) : null
}

function assignedDivisions(value: string) {
  try { return JSON.parse(value || '[]') as string[] } catch { return [] }
}

export async function GET(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive || (!leadershipRoles.includes(user.role) && user.role !== 'TEACHER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const referrals = await prisma.teacherReferral.findMany({
    where: user.role === 'TEACHER' ? { createdById: user.id } : adminRoles.includes(user.role) ? {} : { recipientId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { id: true, name: true } }, recipient: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ data: referrals })
}

export async function POST(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive || user.role !== 'TEACHER') return NextResponse.json({ error: 'Only teachers can create referrals.' }, { status: 403 })
  const body = await request.json() as { studentId?: string; recipientId?: string; subject?: string; reason?: string; incidentDate?: string; incidentTime?: string; location?: string; actionTaken?: string; teacherNotes?: string }
  if (!body.studentId || !body.recipientId || !body.reason?.trim() || !body.incidentDate || !body.incidentTime || !body.location?.trim() || !body.actionTaken?.trim()) return NextResponse.json({ error: 'Student, vice principal, reason, date, time, location, and action taken are required.' }, { status: 400 })
  const student = await prisma.student.findUnique({ where: { id: body.studentId }, select: { id: true, fullName: true, divisionCode: true } })
  if (!student || !student.divisionCode || !assignedDivisions(user.assignedDivisions).includes(student.divisionCode)) return NextResponse.json({ error: 'You can only refer students in your assigned divisions.' }, { status: 403 })
  const recipient = await prisma.user.findFirst({ where: { id: body.recipientId, isActive: true, role: { in: ['VICE_PRINCIPAL', 'VP_STUDENT_AFFAIRS', 'VP_ACADEMIC_AFFAIRS', 'VP_OPERATIONS'] } }, select: { id: true } })
  if (!recipient) return NextResponse.json({ error: 'The selected vice principal is not available.' }, { status: 409 })
  const referral = await prisma.teacherReferral.create({ data: { createdById: user.id, recipientId: recipient.id, studentId: student.id, studentName: student.fullName, divisionCode: student.divisionCode, subject: body.subject?.trim() || '', reason: body.reason.trim(), incidentDate: body.incidentDate, incidentTime: body.incidentTime, location: body.location.trim(), actionTaken: body.actionTaken.trim(), teacherNotes: body.teacherNotes?.trim() || null, status: 'TRANSFERRED' } })
  const now = new Date()
  await prisma.auditLog.create({ data: { userId: user.id, userName: user.name, userRole: user.role, action: 'STUDENT_REFERRED_TO_VICE_PRINCIPAL', targetType: 'TeacherReferral', targetId: referral.id, targetName: student.fullName, studentId: student.id, details: JSON.stringify({ divisionCode: student.divisionCode, subject: referral.subject, reason: referral.reason, incidentDate: referral.incidentDate, incidentTime: referral.incidentTime, location: referral.location, actionTaken: referral.actionTaken }), dateOnly: now.toISOString().slice(0, 10), timeOnly: now.toTimeString().slice(0, 8), relativeTime: formatRelativeTimeArabic(now), ipAddress: request.headers.get('x-forwarded-for') ?? 'local', userAgent: request.headers.get('user-agent') ?? 'unknown' } })
  return NextResponse.json({ data: referral }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json() as { id?: string; action?: 'read' | 'reviewed' | 'updateAdministrativeAction' | 'cancelled' | 'cancelTransfer' | 'cancelOwn' | 'delete'; administrativeAction?: string }
  if (!body.id || !body.action) return NextResponse.json({ error: 'Referral id and action are required.' }, { status: 400 })
  if (body.action === 'cancelOwn' && user.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (body.action === 'delete' && ![...vicePrincipalRoles, ...adminRoles].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['cancelOwn', 'delete'].includes(body.action) && !leadershipRoles.includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (body.action === 'cancelTransfer' && ![...vicePrincipalRoles, ...adminRoles].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (body.action === 'updateAdministrativeAction' && ![...vicePrincipalRoles, ...adminRoles].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const referral = await prisma.teacherReferral.findUnique({ where: { id: body.id } })
  if (!referral) return NextResponse.json({ error: 'Referral not found.' }, { status: 404 })
  if (body.action === 'cancelOwn' && referral.createdById !== user.id) return NextResponse.json({ error: 'Referral not found.' }, { status: 404 })
  if (body.action !== 'cancelOwn' && body.action !== 'cancelTransfer' && body.action !== 'delete' && !adminRoles.includes(user.role) && referral.recipientId !== user.id) return NextResponse.json({ error: 'Referral not found.' }, { status: 404 })
  if (body.action === 'cancelTransfer' && !transferStatuses.includes(referral.status)) return NextResponse.json({ error: 'Only transferred referrals can be cancelled.' }, { status: 409 })
  if (body.action === 'updateAdministrativeAction' && !body.administrativeAction?.trim()) return NextResponse.json({ error: 'Administrative action is required.' }, { status: 400 })
  if (body.action === 'cancelOwn' && !transferStatuses.includes(referral.status)) return NextResponse.json({ error: 'Only active referrals can be cancelled.' }, { status: 409 })
  if (body.action === 'cancelOwn') {
    await prisma.teacherReferral.delete({ where: { id: referral.id } })
    await invalidateCache('thabat:teacher-referrals', `thabat:teacher-referrals:${referral.createdById}`, `thabat:teacher-referrals:${referral.recipientId}`)
    return NextResponse.json({ success: true, data: referral })
  }
  if (body.action === 'delete') {
    await prisma.teacherReferral.delete({ where: { id: referral.id } })
    await invalidateCache('thabat:teacher-referrals', `thabat:teacher-referrals:${referral.createdById}`, `thabat:teacher-referrals:${referral.recipientId}`)
    return NextResponse.json({ success: true, data: referral })
  }

  const updated = await prisma.teacherReferral.update({
    where: { id: referral.id },
    data: body.action === 'updateAdministrativeAction'
      ? { vicePrincipalAction: body.administrativeAction!.trim(), readAt: new Date(), status: 'REVIEWED' }
      : body.action === 'cancelTransfer'
      ? { status: 'CANCELLED', readAt: new Date() }
      : { readAt: new Date(), status: body.action === 'reviewed' ? 'REVIEWED' : 'SEEN' },
    include: { createdBy: { select: { id: true, name: true } }, recipient: { select: { id: true, name: true } } },
  })
  await invalidateCache('thabat:teacher-referrals', `thabat:teacher-referrals:${updated.createdById}`, `thabat:teacher-referrals:${updated.recipientId}`)
  return NextResponse.json({ success: true, data: updated })
}
