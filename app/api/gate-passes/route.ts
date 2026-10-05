import { NextRequest, NextResponse } from 'next/server'
import { isCreatorRole } from '@/lib/permissions'
import { requirePermission } from '@/lib/server-permissions'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUserId } from '@/lib/server-session'

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null
  const role = user?.role
  if (!isCreatorRole(role) && role !== 'PRINCIPAL' && role !== 'VP_STUDENT_AFFAIRS' && role !== 'VICE_PRINCIPAL' && role !== 'GATE_SECURITY') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const now = new Date()
  await prisma.gatePass.updateMany({ where: { status: { in: ['PENDING', 'APPROVED'] }, expiresAt: { lt: now } }, data: { status: 'CANCELED', attendanceState: 'CANCELED' } })
  const departureDate = request.nextUrl.searchParams.get('date') ?? undefined
  const passes = await prisma.gatePass.findMany({ where: { ...(status ? { status } : {}), ...(departureDate ? { departureDate } : {}) }, include: { student: { select: { fullName: true, divisionCode: true, academicId: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ data: passes })
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission(request, 'gate_passes', 'create')
  if (denied) return denied
  const body = await request.json() as { studentId?: string; parentName?: string; reason?: string; departureDate?: string; departureTime?: string; expiresAt?: string }
  const issuedBy = await getAuthenticatedUserId(request)
  if (!body.studentId || !issuedBy || !body.reason || !body.departureDate || !body.departureTime) return NextResponse.json({ error: 'studentId, reason, departureDate, and departureTime are required.' }, { status: 400 })
  const student = await prisma.student.findUnique({ where: { id: body.studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 30 * 60 * 1000)
  const pass = await prisma.gatePass.create({ data: { studentId: student.id, issuedBy, parentName: body.parentName, reason: body.reason, departureDate: body.departureDate, departureTime: body.departureTime, expiresAt, qrToken: crypto.randomUUID(), status: 'PENDING', attendanceState: 'PENDING' }, include: { student: true } })
  return NextResponse.json({ data: pass }, { status: 201 })
}
