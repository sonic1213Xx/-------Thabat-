import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUserId } from '@/lib/server-session'

export async function GET(request: NextRequest) {
  const id = await getAuthenticatedUserId(request)
  if (!id) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id, isActive: true },
    select: { id: true, name: true, role: true, locale: true, assignedDivisions: true, subjectsTaught: true, teachingAssignments: true },
  })
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      role: user.role,
      locale: user.locale === 'en' ? 'en' : 'ar',
      assigned_divisions: JSON.parse(user.assignedDivisions || '[]'),
      subjectsTaught: JSON.parse(user.subjectsTaught || '[]'),
      teachingAssignments: JSON.parse(user.teachingAssignments || '[]'),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
