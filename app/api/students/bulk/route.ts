import { NextRequest, NextResponse } from 'next/server'
import { isCreatorRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUserId } from '@/lib/server-session'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { studentIds?: string[] }
    const studentIds = Array.from(new Set(body.studentIds ?? []))
    const requestUserId = await getAuthenticatedUserId(request)
    if (!studentIds.length || !requestUserId) return NextResponse.json({ error: 'Students and acting user are required.' }, { status: 400 })
    const actor = await prisma.user.findUnique({ where: { id: requestUserId }, select: { id: true, role: true, isActive: true } })
    if (!actor?.isActive || (!isCreatorRole(actor.role) && actor.role !== 'PRINCIPAL')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const result = await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
    return NextResponse.json({ data: { count: result.count } })
  } catch (error) {
    console.error('Bulk student deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete students.' }, { status: 500 })
  }
}