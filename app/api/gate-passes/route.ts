import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-thabat-role')
  if (role !== 'CURATOR' && role !== 'PRINCIPAL' && role !== 'VP_STUDENT_AFFAIRS' && role !== 'VICE_PRINCIPAL' && role !== 'GATE_SECURITY') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const passes = await prisma.gatePass.findMany({ where: status ? { status } : undefined, include: { student: { select: { fullName: true, divisionCode: true, academicId: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ data: passes })
}

export async function POST(request: NextRequest) {
  const denied = requirePermission(request, 'gate_passes', 'create')
  if (denied) return denied
  const body = await request.json() as { studentId?: string; issuedBy?: string; parentName?: string; reason?: string; departureDate?: string; departureTime?: string; expiresAt?: string }
  if (!body.studentId || !body.issuedBy || !body.reason || !body.departureDate || !body.departureTime) return NextResponse.json({ error: 'studentId, issuedBy, reason, departureDate, and departureTime are required.' }, { status: 400 })
  const student = await prisma.student.findUnique({ where: { id: body.studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  const pass = await prisma.gatePass.create({ data: { studentId: student.id, issuedBy: body.issuedBy, parentName: body.parentName, reason: body.reason, departureDate: body.departureDate, departureTime: body.departureTime, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, qrToken: crypto.randomUUID(), status: 'PENDING', attendanceState: 'PENDING' }, include: { student: true } })
  return NextResponse.json({ data: pass }, { status: 201 })
}
