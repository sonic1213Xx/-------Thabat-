import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json() as { action?: 'approve' | 'reject' | 'scan'; actorId?: string }
  const permission = body.action === 'scan' ? requirePermission(request, 'gate_passes', 'scan') : requirePermission(request, 'gate_passes', body.action === 'approve' ? 'approve' : 'update')
  if (permission) return permission
  if (!body.action || !body.actorId) return NextResponse.json({ error: 'action and actorId are required.' }, { status: 400 })
  const pass = await prisma.gatePass.findFirst({ where: { OR: [{ id: params.id }, { qrToken: params.id }] } })
  if (!pass) return NextResponse.json({ error: 'Gate pass not found.' }, { status: 404 })
  if (body.action === 'approve') {
    if (pass.status !== 'PENDING') return NextResponse.json({ error: 'Only pending passes can be approved.' }, { status: 409 })
    return NextResponse.json({ data: await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'APPROVED', approvedBy: body.actorId, approvedAt: new Date() } }) })
  }
  if (body.action === 'reject') {
    if (pass.status !== 'PENDING') return NextResponse.json({ error: 'Only pending passes can be rejected.' }, { status: 409 })
    return NextResponse.json({ data: await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'REJECTED' } }) })
  }
  if (pass.status !== 'APPROVED') return NextResponse.json({ error: 'Pass must be approved before scanning.' }, { status: 409 })
  if (pass.expiresAt && pass.expiresAt < new Date()) return NextResponse.json({ error: 'Gate pass has expired.' }, { status: 409 })
  const now = new Date()
  const date = pass.departureDate
  await prisma.attendance.upsert({ where: { studentId_date: { studentId: pass.studentId, date } }, update: { status: 'LEFT_WITH_PERMISSION', notes: `Gate pass ${pass.id}`, markedBy: body.actorId }, create: { studentId: pass.studentId, date, status: 'LEFT_WITH_PERMISSION', notes: `Gate pass ${pass.id}`, markedBy: body.actorId } })
  return NextResponse.json({ data: await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'USED', scannedBy: body.actorId, scannedAt: now, attendanceState: 'LEFT_WITH_PERMISSION' } }) })
}
