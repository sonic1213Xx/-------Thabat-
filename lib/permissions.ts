import type { NextRequest } from 'next/server'
import { getRoleDefinition, type Permission, type PermissionAction, type PermissionResource, type RoleKey } from '@/types/roles'

export function isCreatorRole(userRole: string | null | undefined): boolean {
  return userRole === 'CREATOR' || userRole === 'CURATOR'
}

export function hasPermission(userRole: RoleKey | string | null | undefined, resource: PermissionResource, action: PermissionAction): boolean {
  if (isCreatorRole(userRole)) return true
  if (!userRole) return false
  return getRoleDefinition(userRole)?.permissions.includes(`${resource}:${action}`) ?? false
}

export function hasAnyPermission(userRole: RoleKey | string | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => {
    const [resource, action] = permission.split(':') as [PermissionResource, PermissionAction]
    return hasPermission(userRole, resource, action)
  })
}

export function getRequestRole(request: NextRequest): RoleKey | null {
  const role = request.headers.get('x-thabat-role')
  return role && getRoleDefinition(role) ? role as RoleKey : null
}

export function requirePermission(request: NextRequest, resource: PermissionResource, action: PermissionAction): Response | null {
  if (hasPermission(getRequestRole(request), resource, action)) return null
  return Response.json({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' })
}