import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = requirePermission(request, 'roles', 'update')
  if (denied) return denied
  const body = await request.json() as { role?: string; assignedDivisions?: string[]; subject?: string; gradeLevel?: number | null; busRouteIds?: string[] }
  if (!body.role) return NextResponse.json({ error: 'role is required.' }, { status: 400 })
  return NextResponse.json({ data: { userId: params.id, ...body } })
}