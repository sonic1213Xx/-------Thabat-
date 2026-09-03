import type { AppRole } from './auth'
import { hasPermission } from './permissions'
import { ROLE_DEFINITIONS, type Permission as RbacPermission } from '@/types/roles'

type LegacyPermission = 'can_issue_warnings' | 'can_approve_gate_passes' | 'can_delete_records' | 'can_export_data' | 'can_edit_students'
export type Permission = LegacyPermission | RbacPermission
export type RoleDefinition = { key: AppRole | string; name: string; nameEn: string; permissions: Permission[]; builtIn?: boolean }

const legacyPermissions: Array<{ key: LegacyPermission; label: string; labelEn: string }> = [
  { key: 'can_issue_warnings', label: 'إصدار الإنذارات', labelEn: 'Issue warnings' },
  { key: 'can_approve_gate_passes', label: 'اعتماد تصاريح الخروج', labelEn: 'Approve gate passes' },
  { key: 'can_delete_records', label: 'حذف السجلات', labelEn: 'Delete records' },
  { key: 'can_export_data', label: 'تصدير البيانات', labelEn: 'Export data' },
  { key: 'can_edit_students', label: 'تعديل بيانات الطلاب', labelEn: 'Edit students' },
]

const permissionLabels: Record<string, { label: string; labelEn: string }> = {
  read: { label: 'عرض', labelEn: 'Read' }, create: { label: 'إنشاء', labelEn: 'Create' }, update: { label: 'تعديل', labelEn: 'Update' }, delete: { label: 'حذف', labelEn: 'Delete' }, approve: { label: 'اعتماد', labelEn: 'Approve' }, export: { label: 'تصدير', labelEn: 'Export' }, scan: { label: 'فحص', labelEn: 'Scan' },
}
const resourceLabels: Record<string, { label: string; labelEn: string }> = {
  students: { label: 'الطلاب', labelEn: 'Students' }, attendance: { label: 'الحضور', labelEn: 'Attendance' }, gradebooks: { label: 'الكشوفات', labelEn: 'Gradebooks' }, warnings: { label: 'الإنذارات', labelEn: 'Warnings' }, incidents: { label: 'الوقائع', labelEn: 'Incidents' }, gate_passes: { label: 'تصاريح الخروج', labelEn: 'Gate passes' }, counseling: { label: 'الإرشاد', labelEn: 'Counseling' }, activities: { label: 'الأنشطة', labelEn: 'Activities' }, transportation: { label: 'النقل', labelEn: 'Transportation' }, facilities: { label: 'المرافق', labelEn: 'Facilities' }, reports: { label: 'التقارير', labelEn: 'Reports' }, audit_log: { label: 'سجل التدقيق', labelEn: 'Audit log' }, roles: { label: 'الأدوار', labelEn: 'Roles' },
}
const rbacPermissions = Array.from(new Set(ROLE_DEFINITIONS.flatMap((role) => role.permissions))).map((key) => {
  const [resource, action] = key.split(':')
  return { key, label: `${resourceLabels[resource]?.label ?? resource}: ${permissionLabels[action]?.label ?? action}`, labelEn: `${resourceLabels[resource]?.labelEn ?? resource}: ${permissionLabels[action]?.labelEn ?? action}` }
})
export const PERMISSIONS: Array<{ key: Permission; label: string; labelEn: string }> = [...legacyPermissions, ...rbacPermissions]

const legacyPermissionMap: Array<[LegacyPermission, RbacPermission]> = [
  ['can_issue_warnings', 'warnings:create'],
  ['can_approve_gate_passes', 'gate_passes:approve'],
  ['can_delete_records', 'students:delete'],
  ['can_export_data', 'reports:export'],
  ['can_edit_students', 'students:update'],
]
const legacyPermissionsFor = (permissions: readonly RbacPermission[]): LegacyPermission[] => legacyPermissionMap.filter(([, permission]) => permissions.includes(permission)).map(([legacy]) => legacy)
export const DEFAULT_ROLES: RoleDefinition[] = ROLE_DEFINITIONS.map((definition) => ({
  key: definition.key,
  name: definition.nameAr,
  nameEn: definition.nameEn,
  permissions: [...legacyPermissionsFor(definition.permissions), ...definition.permissions],
  builtIn: true,
}))

export const ROLES_STORAGE_KEY = 'thabat-role-definitions'

export function getRoles(): RoleDefinition[] {
  if (typeof window === 'undefined') return DEFAULT_ROLES
  try {
    const stored = localStorage.getItem(ROLES_STORAGE_KEY)
    if (!stored) return DEFAULT_ROLES
    const saved = JSON.parse(stored) as RoleDefinition[]
    return DEFAULT_ROLES.map((definition) => {
      const stored = saved.find((item) => item.key === definition.key)
      const legacyOnly = stored && (stored.permissions.length === 0 || stored.permissions.every((permission) => typeof permission === 'string' && !permission.includes(':')))
      return definition.key === 'CURATOR' || legacyOnly ? definition : stored ?? definition
    })
  } catch {
    return DEFAULT_ROLES
  }
}

export function saveRoles(roles: RoleDefinition[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles.map((role) => role.key === 'CURATOR' ? DEFAULT_ROLES.find((definition) => definition.key === 'CURATOR')! : role)))
}

export function can(role: AppRole | string, permission: Permission): boolean {
  if (role === 'CURATOR') return true
  const permissionMap: Record<LegacyPermission, [Parameters<typeof hasPermission>[1], Parameters<typeof hasPermission>[2]]> = {
    can_issue_warnings: ['warnings', 'create'],
    can_approve_gate_passes: ['gate_passes', 'approve'],
    can_delete_records: ['students', 'delete'],
    can_export_data: ['reports', 'export'],
    can_edit_students: ['students', 'update'],
  }
  const mappedPermission = permissionMap[permission as LegacyPermission]
  return (mappedPermission ? hasPermission(role, ...mappedPermission) : false) || getRoles().find((item) => item.key === role)?.permissions.includes(permission) === true
}
