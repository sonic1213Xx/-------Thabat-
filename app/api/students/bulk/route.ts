import { NextRequest, NextResponse } from 'next/server'
import { isCreatorRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { studentIds?: string[]; performedByUserId?: string }
    const studentIds = Array.from(new Set(body.studentIds ?? []))
    if (!studentIds.length || !body.performedByUserId) return NextResponse.json({ error: 'Students and acting user are required.' }, { status: 400 })
    const actor = await prisma.user.findUnique({ where: { id: body.performedByUserId }, select: { id: true, role: true, isActive: true } })
    if (!actor?.isActive || (!isCreatorRole(actor.role) && actor.role !== 'PRINCIPAL')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const result = await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
    return NextResponse.json({ data: { count: result.count } })
  } catch (error) {
    console.error('Bulk student deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete students.' }, { status: 500 })
  }
}