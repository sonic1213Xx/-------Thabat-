import { NextRequest, NextResponse } from 'next/server'
import { ROLE_DEFINITIONS } from '@/types/roles'
import { requirePermission } from '@/lib/permissions'
import { getRoleDefinition } from '@/types/roles'

export async function GET() {
  return NextResponse.json({ data: ROLE_DEFINITIONS })
}

export async function POST(request: NextRequest) {
  const denied = requirePermission(request, 'roles', 'update')
  if (denied) return denied
  const body = await request.json() as { userId?: string; role?: string }
  if (!body.userId || !body.role) return NextResponse.json({ error: 'userId and role are required.' }, { status: 400 })
  if (!getRoleDefinition(body.role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 400 })
  return NextResponse.json({ data: { userId: body.userId, role: body.role } })
}