import type { AppRole } from '@/lib/auth'

export type RoleKey = AppRole
export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'scan'
export type PermissionResource = 'students' | 'attendance' | 'gradebooks' | 'warnings' | 'incidents' | 'gate_passes' | 'counseling' | 'activities' | 'transportation' | 'facilities' | 'reports' | 'audit_log' | 'roles'
export type Permission = `${PermissionResource}:${PermissionAction}`

export type StaffRoleDefinition = {
  key: RoleKey
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  permissions: readonly Permission[]
  assignedDivisions: boolean
  defaultView?: string
}

const readWrite = (resource: PermissionResource): Permission[] => [`${resource}:read`, `${resource}:create`, `${resource}:update`]
const principalPermissions: Permission[] = [
  ...(['students', 'attendance', 'gradebooks', 'warnings', 'incidents', 'gate_passes', 'activities', 'transportation', 'facilities', 'reports', 'audit_log', 'roles'] as PermissionResource[]).flatMap(readWrite),
  'students:delete', 'attendance:approve', 'gradebooks:approve', 'gate_passes:approve', 'reports:export', 'audit_log:delete',
]

export const ROLE_DEFINITIONS: readonly StaffRoleDefinition[] = [
  { key: 'CURATOR', nameAr: 'المُنشئ', nameEn: 'Creator', descriptionAr: 'إدارة كاملة للنظام.', descriptionEn: 'Full system administration.', permissions: principalPermissions, assignedDivisions: false },
  { key: 'PRINCIPAL', nameAr: 'مدير المدرسة', nameEn: 'Principal', descriptionAr: 'الإشراف العام والاعتمادات النهائية.', descriptionEn: 'Overall monitoring and final approvals.', permissions: principalPermissions, assignedDivisions: false },
  { key: 'VP_STUDENT_AFFAIRS', nameAr: 'وكيل شؤون الطلاب', nameEn: 'VP Student Affairs', descriptionAr: 'السلوك والحضور وتصاريح الخروج.', descriptionEn: 'Behavior, attendance, gate passes, and discipline.', permissions: [...readWrite('students'), ...readWrite('attendance'), ...readWrite('warnings'), ...readWrite('incidents'), ...readWrite('gate_passes'), 'gate_passes:approve', 'reports:read'], assignedDivisions: false },
  { key: 'VP_ACADEMIC_AFFAIRS', nameAr: 'وكيل الشؤون التعليمية', nameEn: 'VP Academic Affairs', descriptionAr: 'متابعة المعلمين والكشوفات والحضور.', descriptionEn: 'Teacher oversight, gradebooks, and class attendance.', permissions: [...readWrite('students'), ...readWrite('attendance'), ...readWrite('gradebooks'), 'gradebooks:approve', 'reports:read', 'reports:export'], assignedDivisions: false },
  { key: 'VP_OPERATIONS', nameAr: 'وكيل الشؤون المدرسية', nameEn: 'VP Operations', descriptionAr: 'المرافق والموارد والطلبات الإدارية.', descriptionEn: 'Facilities, resources, and administrative requests.', permissions: [...readWrite('facilities'), ...readWrite('transportation'), 'reports:read', 'audit_log:read'], assignedDivisions: false },
  { key: 'VICE_PRINCIPAL', nameAr: 'وكيل شؤون الطلاب', nameEn: 'Vice Principal', descriptionAr: 'اسم قديم متوافق مع وكيل شؤون الطلاب.', descriptionEn: 'Legacy alias for Student Affairs.', permissions: [...readWrite('students'), ...readWrite('attendance'), ...readWrite('warnings'), ...readWrite('incidents'), ...readWrite('gate_passes'), 'gate_passes:approve'], assignedDivisions: false },
  { key: 'TEACHER', nameAr: 'معلم مادة', nameEn: 'Subject Teacher', descriptionAr: 'يعمل داخل الشعب المخصصة فقط.', descriptionEn: 'Restricted to explicitly assigned divisions.', permissions: [...readWrite('gradebooks'), ...readWrite('attendance'), 'incidents:create', 'students:read'], assignedDivisions: true },
  { key: 'COUNSELOR', nameAr: 'موجه طلابي / مرشد طلابي', nameEn: 'Counselor', descriptionAr: 'السلوك والإرشاد والتواصل مع أولياء الأمور.', descriptionEn: 'Behavior trends, counseling cases, and parent communication.', permissions: [...readWrite('students'), ...readWrite('warnings'), ...readWrite('incidents'), ...readWrite('counseling'), 'reports:read'], assignedDivisions: false },
  { key: 'ACTIVITIES_COORDINATOR', nameAr: 'رائد النشاط', nameEn: 'Activities Coordinator', descriptionAr: 'الفعاليات والأندية والمسابقات.', descriptionEn: 'Events, clubs, competitions, and extracurricular attendance.', permissions: [...readWrite('activities'), 'attendance:read', 'attendance:create', 'students:read'], assignedDivisions: false },
  { key: 'GATE_SECURITY', nameAr: 'حارس المدرسة / حارس الأمن', nameEn: 'Gate Security', descriptionAr: 'فحص تصاريح الخروج وتسجيل الدخول الصباحي.', descriptionEn: 'Scan exit passes and record morning gate entry.', permissions: ['gate_passes:read', 'gate_passes:scan', 'attendance:create'], assignedDivisions: false, defaultView: '/dashboard/vice-principal' },
  { key: 'TRANSPORTATION_SUPERVISOR', nameAr: 'مشرف النقل المدرسي', nameEn: 'Transportation Supervisor', descriptionAr: 'المسارات والحضور والتحقق من الاستلام والتسليم.', descriptionEn: 'Routes, bus attendance, and pickup/drop-off verification.', permissions: [...readWrite('transportation'), 'students:read', 'attendance:read', 'attendance:create'], assignedDivisions: false },
]

export const getRoleDefinition = (role: string): StaffRoleDefinition | undefined => ROLE_DEFINITIONS.find((definition) => definition.key === role)