import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS classes with proper conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to Arabic locale
 */
export function formatDateArabic(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format time to Arabic locale
 */
export function formatTimeArabic(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

/**
 * Get YYYY-MM-DD format (ISO date only)
 */
export function getDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get HH:mm:ss format
 */
export function getTimeOnly(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * Format relative time in Arabic (e.g., "اليوم الساعة 10:45 ص" or "أمس - 14:30")
 */
export function formatRelativeTimeArabic(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  if (dateOnly.getTime() === today.getTime()) {
    return `اليوم الساعة ${timeStr}`
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `أمس - ${timeStr}`
  } else {
    const dateStr = date.toLocaleDateString('ar-SA-u-nu-latn', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    return `${dateStr} - ${timeStr}`
  }
}

/**
 * Format full Arabic date with time (e.g., "01 سبتمبر 2026 - 14:30")
 */
export function formatFullArabicDateTime(date: Date): string {
  const dateStr = date.toLocaleDateString('ar-SA-u-nu-latn', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${dateStr} - ${timeStr}`
}

/**
 * Get division name in Arabic
 */
export function getDivisionNameArabic(code: string): string {
  const divisions: Record<string, string> = {
    '101': 'الأول الثانوي - أ',
    '102': 'الأول الثانوي - ب',
    '201': 'الثاني الثانوي - أ',
    '202': 'الثاني الثانوي - ب',
    '301': 'الثالث الثانوي - أ',
    '302': 'الثالث الثانوي - ب',
  }
  return divisions[code] || code
}

/**
 * Get grade level name in Arabic
 */
export function getGradeLevelArabic(level: number): string {
  const grades: Record<number, string> = {
    1: 'الأول الثانوي',
    2: 'الثاني الثانوي',
    3: 'الثالث الثانوي',
  }
  return grades[level] || 'مرحلة غير محددة'
}

/**
 * Get warning type name in Arabic
 */
export function getWarningTypeArabic(type: string): string {
  const types: Record<string, string> = {
    TARDINESS: 'التأخر',
    ABSENCE: 'الغياب',
    CONDUCT: 'السلوك',
    ACADEMIC_FAILURE: 'الفشل الدراسي',
    DISRUPTIVE: 'الإزعاج',
    CLASSROOM_EXIT: 'مغادرة الفصل',
    UNIFORM_VIOLATION: 'انتهاك الزي المدرسي',
    OTHER: 'أخرى',
  }
  return types[type] || type
}

/**
 * Get audit action name in Arabic
 */
export function getAuditActionArabic(action: string): string {
  const actions: Record<string, string> = {
    STUDENT_CREATED: 'إنشاء طالب',
    STUDENT_UPDATED: 'تحديث بيانات الطالب',
    STUDENT_DELETED: 'حذف الطالب',
    STUDENT_TRANSFERRED: 'نقل الطالب',
    WARNING_ISSUED: 'إصدار إنذار',
    WARNING_RESOLVED: 'حل الإنذار',
    BEHAVIOR_SCORE_RESET: 'إعادة تعيين درجة السلوك',
    ATTENDANCE_MARKED: 'تسجيل الحضور',
    USER_LOGIN: 'دخول المستخدم',
    USER_LOGOUT: 'خروج المستخدم',
    BULK_IMPORT: 'استيراد جماعي',
    REPORT_GENERATED: 'إنشاء تقرير',
    RECORD_ARCHIVED: 'أرشفة السجل',
    SYSTEM_OVERRIDE: 'تجاوز النظام',
  }
  return actions[action] || action
}

/**
 * Get user role name in Arabic
 */
export function getUserRoleArabic(role: string): string {
  const roles: Record<string, string> = {
    PRINCIPAL: 'المديرة',
    VICE_PRINCIPAL: 'مساعدة المديرة',
    TEACHER: 'المعلمة',
  }
  return roles[role] || role
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Validate Saudi National ID
 */
export function isValidSaudiNationalId(id: string): boolean {
  const pattern = /^[0-9]{10}$/
  return pattern.test(id)
}

export type { DivisionRecord, TeamDefinition } from './storage'
export {
  TEAM_OPTIONS,
  getActiveTeamDivisions,
  getStoredCustomTeams,
  getStoredDivisions,
  getStoredTeamId,
  getTeamById,
  setStoredCustomTeams,
  setStoredDivisions,
  setStoredTeamId,
  getStoredChatHistory,
  setStoredChatHistory,
} from './storage'
export type { ChatMessage } from './storage'

export function getDivisionLabel(code: string): string {
  return getDivisionNameArabic(code)
}

export function isValidDivisionCode(code: string | null | undefined): boolean {
  if (!code) return false
  const normalized = code.trim()
  return normalized.length > 0 && /^[A-Za-z0-9\-_\u0600-\u06FF]+$/.test(normalized)
}
