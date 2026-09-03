import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { studentIds?: string[]; performedByUserId?: string }
    const studentIds = Array.from(new Set(body.studentIds ?? []))
    if (!studentIds.length || !body.performedByUserId) return NextResponse.json({ error: 'Students and acting user are required.' }, { status: 400 })
    const actor = await prisma.user.findUnique({ where: { id: body.performedByUserId }, select: { id: true, role: true, isActive: true } })
    if (!actor?.isActive || !['CURATOR', 'PRINCIPAL'].includes(actor.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const result = await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
    return NextResponse.json({ data: { count: result.count } })
  } catch (error) {
    console.error('Bulk student deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete students.' }, { status: 500 })
  }
}