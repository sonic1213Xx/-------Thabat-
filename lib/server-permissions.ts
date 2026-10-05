import type { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUserId } from '@/lib/server-session'
import { hasPermission } from '@/lib/permissions'
import type { PermissionAction, PermissionResource } from '@/types/roles'

export async function requirePermission(request: NextRequest, resource: PermissionResource, action: PermissionAction): Promise<Response | null> {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } })
  if (user?.isActive && hasPermission(user.role, resource, action)) return null
  return Response.json({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' })
}
